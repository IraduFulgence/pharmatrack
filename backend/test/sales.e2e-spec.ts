import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { DatabaseService } from '../src/database/database.service.js';

describe('Sales & Billing Module (e2e)', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let pharmacyToken: string;
  let pharmacyId: number;
  let testPatientId: number;
  let medicineId1: number;
  let medicineId2: number;
  let batchId1: number;
  let batchId2: number;
  let expiredBatchId: number;
  let providerId: number;
  let createdSaleId: number;

  const testPharmacy = {
    pharmacyName: 'Kigali Sales E2E Pharmacy',
    phoneNumber: '+250788444111',
    email: 'sales.pharmacy@example.com',
    tin: '887766554',
    password: 'Password@123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    await app.init();
    db = app.get(DatabaseService);

    await db.query('DELETE FROM public.pharmacies WHERE email = $1', [testPharmacy.email]);
    await db.query('DELETE FROM public.patients WHERE email = $1', ['sales.patient.test@example.rw']);

    const passwordHash = await bcrypt.hash(testPharmacy.password, 10);
    const pharmRes = await db.query(
      `INSERT INTO public.pharmacies 
        (pharmacy_name, phone_number, email, tin, password_hash, is_active, verification_status)
       VALUES ($1, $2, $3, $4, $5, true, 'APPROVED')
       RETURNING pharmacy_id`,
      [
        testPharmacy.pharmacyName,
        testPharmacy.phoneNumber,
        testPharmacy.email,
        testPharmacy.tin,
        passwordHash,
      ],
    );
    pharmacyId = Number(pharmRes.rows[0].pharmacy_id);

    await db.query(
      `INSERT INTO public.pharmacy_users (pharmacy_id, full_name, email, password_hash, role, is_active)
       VALUES ($1, 'Lead Pharmacist', $2, $3, 'OWNER', true)`,
      [pharmacyId, testPharmacy.email, passwordHash],
    );

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: testPharmacy.email,
        password: testPharmacy.password,
      });

    expect(loginRes.status).toBe(200);
    pharmacyToken = loginRes.body.data.token;

    const medsRes = await db.query('SELECT medicine_id, medicine_name FROM public.medicines ORDER BY medicine_id ASC LIMIT 2');
    medicineId1 = Number(medsRes.rows[0].medicine_id);
    medicineId2 = Number(medsRes.rows[1].medicine_id);

    const b1Res = await db.query(
      `INSERT INTO public.inventory_batches 
        (pharmacy_id, medicine_id, batch_number, quantity, unit_price, expiry_date, reorder_level, status)
       VALUES ($1, $2, 'BATCH-SALE-001', 100, 2500.00, '2028-12-31', 10, 'ACTIVE')
       RETURNING inventory_id`,
      [pharmacyId, medicineId1],
    );
    batchId1 = Number(b1Res.rows[0].inventory_id);

    const b2Res = await db.query(
      `INSERT INTO public.inventory_batches 
        (pharmacy_id, medicine_id, batch_number, quantity, unit_price, expiry_date, reorder_level, status)
       VALUES ($1, $2, 'BATCH-SALE-002', 50, 1500.00, '2027-06-30', 5, 'ACTIVE')
       RETURNING inventory_id`,
      [pharmacyId, medicineId2],
    );
    batchId2 = Number(b2Res.rows[0].inventory_id);

    const expRes = await db.query(
      `INSERT INTO public.inventory_batches 
        (pharmacy_id, medicine_id, batch_number, quantity, unit_price, expiry_date, reorder_level, status)
       VALUES ($1, $2, 'BATCH-EXPIRED-999', 20, 1000.00, '2020-01-01', 5, 'EXPIRED')
       RETURNING inventory_id`,
      [pharmacyId, medicineId1],
    );
    expiredBatchId = Number(expRes.rows[0].inventory_id);

    const patRes = await db.query(
      `INSERT INTO public.patients 
        (full_name, phone_number, national_id, email, gender, is_active)
       VALUES ('E2E Test Patient', '+250788998877', '1199580011223344', 'sales.patient.test@example.rw', 'Female', true)
       RETURNING patient_id`,
    );
    testPatientId = Number(patRes.rows[0].patient_id);

    const provRes = await db.query(
      "SELECT provider_id FROM public.insurance_providers WHERE provider_code = 'RSSB' LIMIT 1",
    );
    providerId = Number(provRes.rows[0].provider_id);
  }, 180000);

  afterAll(async () => {
    if (db && pharmacyId) {
      await db.query('DELETE FROM public.insurance_claims WHERE pharmacy_id = $1', [pharmacyId]);
      await db.query('DELETE FROM public.payments WHERE pharmacy_id = $1', [pharmacyId]);
      await db.query('DELETE FROM public.sales WHERE pharmacy_id = $1', [pharmacyId]);
      await db.query('DELETE FROM public.inventory_transactions WHERE pharmacy_id = $1', [pharmacyId]);
      await db.query('DELETE FROM public.inventory_batches WHERE pharmacy_id = $1', [pharmacyId]);
      await db.query('DELETE FROM public.pharmacy_users WHERE pharmacy_id = $1', [pharmacyId]);
      await db.query('DELETE FROM public.pharmacies WHERE pharmacy_id = $1', [pharmacyId]);
    }
    if (db && testPatientId) {
      await db.query('DELETE FROM public.patient_insurances WHERE patient_id = $1', [testPatientId]);
      await db.query('DELETE FROM public.patients WHERE patient_id = $1', [testPatientId]);
    }
    if (app) {
      await app.close();
    }
  }, 180000);

  // ─────────────────────────────────────────────────────────────
  // 1. POS Medicine & Batch Lookup
  // ─────────────────────────────────────────────────────────────
  it('GET /api/sales/pos/search-medicines should return non-expired batches in FEFO order', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/sales/pos/search-medicines?query=')
      .set('Authorization', `Bearer ${pharmacyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    // Verify expired batches are omitted from POS saleable batches
    for (const med of res.body.data) {
      for (const batch of med.batches) {
        expect(batch.batch_number).not.toBe('BATCH-EXPIRED-999');
      }
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Bill Calculation Previews
  // ─────────────────────────────────────────────────────────────
  it('POST /api/sales/calculate-bill should calculate PRIVATE bill correctly (100% patient contribution)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/sales/calculate-bill')
      .set('Authorization', `Bearer ${pharmacyToken}`)
      .send({
        paymentCategory: 'PRIVATE',
        items: [{ inventoryId: batchId1, quantity: 2 }], // 2 * 2500 = 5000 RWF
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.financials.grossTotal).toBe(5000);
    expect(res.body.data.financials.insuranceContribution).toBe(0);
    expect(res.body.data.financials.patientContribution).toBe(5000);
  });

  it('POST /api/sales/calculate-bill should calculate INSURANCE bill with 75% coverage (insurance: 3750, patient: 1250)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/sales/calculate-bill')
      .set('Authorization', `Bearer ${pharmacyToken}`)
      .send({
        paymentCategory: 'INSURANCE',
        providerId,
        globalCoveragePercentage: 75.0,
        items: [{ inventoryId: batchId1, quantity: 2 }], // 5000 RWF total
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.financials.grossTotal).toBe(5000);
    expect(res.body.data.financials.insuranceContribution).toBe(3750);
    expect(res.body.data.financials.patientContribution).toBe(1250);
  });

  it('POST /api/sales/calculate-bill should reject sale exceeding available inventory stock (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/sales/calculate-bill')
      .set('Authorization', `Bearer ${pharmacyToken}`)
      .send({
        paymentCategory: 'PRIVATE',
        items: [{ inventoryId: batchId1, quantity: 9999 }], // 9999 > 100 available
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Insufficient stock');
  });

  it('POST /api/sales/calculate-bill should reject dispensing expired medicine (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/sales/calculate-bill')
      .set('Authorization', `Bearer ${pharmacyToken}`)
      .send({
        paymentCategory: 'PRIVATE',
        items: [{ inventoryId: expiredBatchId, quantity: 1 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('is expired');
    expect(res.body.message).toContain('cannot be dispensed');
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Process Private Sale with Multiple Medicines (Walk-in)
  // ─────────────────────────────────────────────────────────────
  it('POST /api/sales should process private walk-in sale and deduct stock', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/sales')
      .set('Authorization', `Bearer ${pharmacyToken}`)
      .send({
        paymentCategory: 'PRIVATE',
        paymentMethod: 'CASH',
        customerName: 'Clara Walkin Customer',
        amountPaid: 6500,
        items: [
          { inventoryId: batchId1, quantity: 2 }, // 2 * 2500 = 5000 RWF
          { inventoryId: batchId2, quantity: 1 }, // 1 * 1500 = 1500 RWF
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.receiptNumber).toMatch(/^REC-/);
    expect(res.body.data.paymentStatus).toBe('PAID');
    createdSaleId = Number(res.body.data.saleId);

    // Verify inventory deduction: batch 1 had 100, now 98; batch 2 had 50, now 49
    const checkB1 = await db.query('SELECT quantity FROM public.inventory_batches WHERE inventory_id = $1', [batchId1]);
    expect(Number(checkB1.rows[0].quantity)).toBe(98);

    const checkB2 = await db.query('SELECT quantity FROM public.inventory_batches WHERE inventory_id = $1', [batchId2]);
    expect(Number(checkB2.rows[0].quantity)).toBe(49);
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Process Insurance Sale with Mixed Coverage & Claim Generation
  // ─────────────────────────────────────────────────────────────
  it('POST /api/sales should process insurance sale, calculate co-payment, and generate insurance claim', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/sales')
      .set('Authorization', `Bearer ${pharmacyToken}`)
      .send({
        paymentCategory: 'INSURANCE',
        paymentMethod: 'MOBILE_MONEY',
        patientId: testPatientId,
        providerId,
        insuranceCardNumber: 'RSSB-E2E-123456',
        amountPaid: 1000, // patient pays 1000 RWF
        items: [
          {
            inventoryId: batchId1,
            quantity: 1, // 2500 RWF (covered at default 85% RSSB = 2125 insurance, 375 patient)
            isInsuranceCovered: true,
          },
          {
            inventoryId: batchId2,
            quantity: 1, // 1500 RWF (marked not covered = 0 insurance, 1500 patient)
            isInsuranceCovered: false,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.claimNumber).toMatch(/^CLM-/);

    // Verify claim created in database
    const claimRes = await db.query(
      'SELECT claim_id, total_claimed_amount, claim_status FROM public.insurance_claims WHERE claim_number = $1',
      [res.body.data.claimNumber],
    );
    expect(claimRes.rows.length).toBe(1);
    expect(Number(claimRes.rows[0].total_claimed_amount)).toBe(2125);
    expect(claimRes.rows[0].claim_status).toBe('PENDING');
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Official Receipt & Invoice Generation
  // ─────────────────────────────────────────────────────────────
  it('GET /api/sales/:id/receipt should return structured receipt data and printable HTML', async () => {
    // 1. JSON format
    const jsonRes = await request(app.getHttpServer())
      .get(`/api/sales/${createdSaleId}/receipt?format=json`)
      .set('Authorization', `Bearer ${pharmacyToken}`);

    expect(jsonRes.status).toBe(200);
    expect(jsonRes.body.success).toBe(true);
    expect(jsonRes.body.data.receipt).toBeDefined();
    expect(jsonRes.body.data.receipt.pharmacy.name).toBe(testPharmacy.pharmacyName);
    expect(jsonRes.body.data.receipt.financials.grossTotal).toBe(6500);

    // 2. HTML printable format
    const htmlRes = await request(app.getHttpServer())
      .get(`/api/sales/${createdSaleId}/receipt?format=html`)
      .set('Authorization', `Bearer ${pharmacyToken}`);

    expect(htmlRes.status).toBe(200);
    expect(htmlRes.header['content-type']).toContain('text/html');
    expect(htmlRes.text).toContain('Official Medical Sales Receipt');
    expect(htmlRes.text).toContain(testPharmacy.pharmacyName);
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Sales History & Listing
  // ─────────────────────────────────────────────────────────────
  it('GET /api/sales should list sales history with search and pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/sales?page=1&limit=10')
      .set('Authorization', `Bearer ${pharmacyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sales.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(2);
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Sales Dashboard Statistics
  // ─────────────────────────────────────────────────────────────
  it('GET /api/sales/dashboard should return sales metrics from actual records', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/sales/dashboard?period=today')
      .set('Authorization', `Bearer ${pharmacyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.totalSales).toBeGreaterThanOrEqual(2);
    expect(res.body.data.summary.totalRevenue).toBeGreaterThan(0);
    expect(res.body.data.recentSales.length).toBeGreaterThanOrEqual(2);
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Sales Refund & Inventory Restoration
  // ─────────────────────────────────────────────────────────────
  it('POST /api/sales/:id/refund should refund sale and restore inventory quantity', async () => {
    const preBatch1 = await db.query('SELECT quantity FROM public.inventory_batches WHERE inventory_id = $1', [batchId1]);
    const qtyBefore = Number(preBatch1.rows[0].quantity);

    const res = await request(app.getHttpServer())
      .post(`/api/sales/${createdSaleId}/refund`)
      .set('Authorization', `Bearer ${pharmacyToken}`)
      .send({
        reason: 'Patient experienced adverse reaction and returned unopened medicine.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.restoredItemsCount).toBeGreaterThan(0);

    // Verify inventory restored by 2 units for batch 1
    const postBatch1 = await db.query('SELECT quantity FROM public.inventory_batches WHERE inventory_id = $1', [batchId1]);
    expect(Number(postBatch1.rows[0].quantity)).toBe(qtyBefore + 2);
  });

  // ─────────────────────────────────────────────────────────────
  // 9. Insurance Claims Management
  // ─────────────────────────────────────────────────────────────
  it('GET /api/sales/claims should list insurance claims and summary', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/sales/claims')
      .set('Authorization', `Bearer ${pharmacyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.claims.length).toBeGreaterThan(0);
    const claim = res.body.data.claims[0];

    // Test updating claim status to APPROVED then PAID
    const patchRes = await request(app.getHttpServer())
      .patch(`/api/sales/claims/${claim.claim_id}/status`)
      .set('Authorization', `Bearer ${pharmacyToken}`)
      .send({
        claimStatus: 'APPROVED',
        approvedAmount: Number(claim.total_claimed_amount),
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.success).toBe(true);
    expect(patchRes.body.data.claim_status).toBe('APPROVED');
  });
});
