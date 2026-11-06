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

describe('Inventory Module (e2e)', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let pharmacyToken: string;
  let pharmacyId: number;
  let medicineId: number;
  let createdBatchId: number;

  const testPharmacy = {
    pharmacyName: 'E2E Inventory Pharmacy',
    phoneNumber: '+250788333999',
    email: 'inventory.pharm@example.com',
    tin: '998877665',
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

    const medRes = await db.query('SELECT medicine_id FROM public.medicines LIMIT 1');
    medicineId = Number(medRes.rows[0].medicine_id);
  }, 60000);

  afterAll(async () => {
    if (db && pharmacyId) {
      await db.query('DELETE FROM public.inventory_transactions WHERE pharmacy_id = $1', [pharmacyId]);
      await db.query('DELETE FROM public.inventory_batches WHERE pharmacy_id = $1', [pharmacyId]);
      await db.query('DELETE FROM public.notifications WHERE pharmacy_id = $1', [pharmacyId]);
      await db.query('DELETE FROM public.pharmacy_users WHERE pharmacy_id = $1', [pharmacyId]);
      await db.query('DELETE FROM public.pharmacies WHERE pharmacy_id = $1', [pharmacyId]);
    }
    if (app) {
      await app.close();
    }
  }, 60000);

  // ─────────────────────────────────────────────────────────────
  // 1. Dashboard & Overview
  // ─────────────────────────────────────────────────────────────
  it('GET /api/inventory/dashboard should return inventory overview with summary metrics', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/inventory/dashboard')
      .set('Authorization', `Bearer ${pharmacyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary).toHaveProperty('totalMedicines');
    expect(res.body.data.summary).toHaveProperty('totalStockQuantity');
    expect(res.body.data.summary).toHaveProperty('totalInventoryValuation');
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Medicine Catalogue
  // ─────────────────────────────────────────────────────────────
  it('GET /api/inventory/catalogue should list medicines with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/inventory/catalogue?page=1&limit=5')
      .set('Authorization', `Bearer ${pharmacyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.medicines.length).toBeGreaterThan(0);
    expect(res.body.data.pagination.page).toBe(1);
  });

  it('POST /api/inventory/medicines should register a new medicine in central catalogue', async () => {
    const uniqueName = `Test E2E Medicine ${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/api/inventory/medicines')
      .set('Authorization', `Bearer ${pharmacyToken}`)
      .send({
        medicineName: uniqueName,
        genericName: 'Test Generic',
        strength: '100mg',
        dosageForm: 'Tablet',
        requiresPrescription: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.medicine_name).toBe(uniqueName);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Add Stock / Receive Batch
  // ─────────────────────────────────────────────────────────────
  it('POST /api/inventory/batches should receive new stock and record transaction', async () => {
    const batchDto = {
      medicineId,
      batchNumber: `BATCH-E2E-${Date.now()}`,
      quantityReceived: 50,
      unitPrice: 25.0,
      expiryDate: '2028-06-30',
      reorderLevel: 10,
      notes: 'Initial delivery from supplier',
    };

    const res = await request(app.getHttpServer())
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${pharmacyToken}`)
      .send(batchDto);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.batch.quantity).toBe(50);
    expect(res.body.data.transaction.transaction_type).toBe('STOCK_IN');
    createdBatchId = Number(res.body.data.batch.inventory_id);
  });

  it('POST /api/inventory/batches should reject negative or zero quantity received (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${pharmacyToken}`)
      .send({
        medicineId,
        batchNumber: 'INVALID-QTY',
        quantityReceived: 0,
        unitPrice: 10.0,
        expiryDate: '2028-12-31',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Batch Management & Details
  // ─────────────────────────────────────────────────────────────
  it('GET /api/inventory/batches should return batches sorted by FEFO (expiry date)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/inventory/batches')
      .set('Authorization', `Bearer ${pharmacyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.batches.length).toBeGreaterThan(0);
    expect(res.body.data.batches[0]).toHaveProperty('batch_number');
    expect(res.body.data.batches[0]).toHaveProperty('expiry_date');
  });

  it('GET /api/inventory/batches/:id should return batch details with transaction history', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/inventory/batches/${createdBatchId}`)
      .set('Authorization', `Bearer ${pharmacyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.batch.inventory_id)).toBe(createdBatchId);
    expect(res.body.data.transactions.length).toBeGreaterThan(0);
  });

  it('PATCH /api/inventory/batches/:id should update unit price and reorder level', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/inventory/batches/${createdBatchId}`)
      .set('Authorization', `Bearer ${pharmacyToken}`)
      .send({
        unitPrice: 30.0,
        reorderLevel: 15,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.unit_price)).toBe(30);
    expect(res.body.data.reorder_level).toBe(15);
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Stock Adjustments
  // ─────────────────────────────────────────────────────────────
  it('POST /api/inventory/adjustments should adjust stock and prevent negative quantities', async () => {
    // 1. Try to decrease more than available (50 available -> try reducing by 100)
    const negRes = await request(app.getHttpServer())
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${pharmacyToken}`)
      .send({
        inventoryId: createdBatchId,
        adjustmentType: 'DECREASE',
        quantity: 100,
        reason: 'Attempting invalid excess decrease',
      });

    expect(negRes.status).toBe(400);
    expect(negRes.body.message).toContain('Negative stock is prohibited');

    // 2. Perform valid DAMAGED adjustment (reduce by 5: 50 -> 45)
    const adjRes = await request(app.getHttpServer())
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${pharmacyToken}`)
      .send({
        inventoryId: createdBatchId,
        adjustmentType: 'DAMAGED',
        quantity: 5,
        reason: 'Broken seals discovered during audit',
      });

    expect(adjRes.status).toBe(201);
    expect(adjRes.body.success).toBe(true);
    expect(adjRes.body.data.batch.quantity).toBe(45);
    expect(adjRes.body.data.transaction.transaction_type).toBe('ADJUSTMENT_DAMAGED');
    expect(adjRes.body.data.transaction.previous_quantity).toBe(50);
    expect(adjRes.body.data.transaction.new_quantity).toBe(45);
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Alerts & Notifications
  // ─────────────────────────────────────────────────────────────
  it('GET /api/inventory/alerts should return structured stock and expiry warnings', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/inventory/alerts')
      .set('Authorization', `Bearer ${pharmacyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('lowStockItems');
    expect(res.body.data).toHaveProperty('expiredBatches');
    expect(res.body.data).toHaveProperty('nearExpiryBatches');
  });

  it('POST /api/inventory/notifications/scan-alerts should trigger scan and generate notifications', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/inventory/notifications/scan-alerts')
      .set('Authorization', `Bearer ${pharmacyToken}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/inventory/notifications should retrieve pharmacy notifications', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/inventory/notifications')
      .set('Authorization', `Bearer ${pharmacyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notifications.length).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Transaction History
  // ─────────────────────────────────────────────────────────────
  it('GET /api/inventory/transactions should return audit trail of all operations', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/inventory/transactions')
      .set('Authorization', `Bearer ${pharmacyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transactions.length).toBeGreaterThanOrEqual(2); // STOCK_IN and ADJUSTMENT_DAMAGED
    const types = res.body.data.transactions.map((t: any) => t.transaction_type);
    expect(types).toContain('STOCK_IN');
    expect(types).toContain('ADJUSTMENT_DAMAGED');
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Inventory Reports (JSON & CSV Export)
  // ─────────────────────────────────────────────────────────────
  it('GET /api/inventory/reports should generate CURRENT_STOCK report in JSON format', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/inventory/reports?reportType=CURRENT_STOCK&exportFormat=json')
      .set('Authorization', `Bearer ${pharmacyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reportType).toBe('CURRENT_STOCK');
    expect(res.body.data.summary.totalQuantity).toBeGreaterThan(0);
  });

  it('GET /api/inventory/reports should export CSV format when requested', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/inventory/reports?reportType=CURRENT_STOCK&exportFormat=csv')
      .set('Authorization', `Bearer ${pharmacyToken}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/csv');
    expect(res.header['content-disposition']).toContain('attachment; filename=');
    expect(res.text).toContain('batch_number');
  });
});
