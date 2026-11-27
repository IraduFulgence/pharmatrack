import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { DatabaseService } from '../src/database/database.service.js';

describe('Admin Endpoints (e2e)', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let adminToken: string;
  let adminId: number;
  let testPatientId: number;
  let testPharmacyId: number;

  const testAdmin = {
    fullName: 'Master Admin',
    phoneNumber: '+250788000999',
    email: 'master.admin@example.com',
    password: 'Admin@Strong123',
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

    // Clean up previous test admin, patient, pharmacy
    await db.query(`DELETE FROM public.admins WHERE email = $1`, [testAdmin.email]);
    await db.query(`DELETE FROM public.patients WHERE email = 'admin.test.pat@example.com'`);
    await db.query(`DELETE FROM public.pharmacies WHERE email = 'admin.test.pharm@example.com'`);

    // Create test admin
    const passwordHash = await bcrypt.hash(testAdmin.password, 10);
    const adminRes = await db.query(
      `INSERT INTO public.admins (full_name, phone_number, email, password_hash, is_active, must_change_password, role)
       VALUES ($1, $2, $3, $4, true, false, 'ADMIN')
       RETURNING admin_id`,
      [testAdmin.fullName, testAdmin.phoneNumber, testAdmin.email, passwordHash],
    );
    adminId = Number(adminRes.rows[0].admin_id);

    // Create a patient to inspect
    const patHash = await bcrypt.hash('Password@123', 10);
    const patRes = await db.query(
      `INSERT INTO public.patients (full_name, phone_number, email, gender, date_of_birth, age, password_hash, is_active)
       VALUES ('Admin Test Patient', '+250788111222', 'admin.test.pat@example.com', 'Male', '1995-04-10', 31, $1, true)
       RETURNING patient_id`,
      [patHash],
    );
    testPatientId = Number(patRes.rows[0].patient_id);

    // Create a pending pharmacy to approve/reject
    const pharmHash = await bcrypt.hash('Pharmacy@123', 10);
    const pharmRes = await db.query(
      `INSERT INTO public.pharmacies (pharmacy_name, phone_number, email, tin, verification_status, password_hash, is_active)
       VALUES ('Pending Test Pharmacy', '+250788333444', 'admin.test.pharm@example.com', '998877665', 'PENDING', $1, true)
       RETURNING pharmacy_id`,
      [pharmHash],
    );
    testPharmacyId = Number(pharmRes.rows[0].pharmacy_id);

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: testAdmin.email, password: testAdmin.password })
      .expect(200);

    adminToken = loginRes.body.data.token;
  });

  afterAll(async () => {
    await db.query(`DELETE FROM public.admins WHERE email = $1`, [testAdmin.email]);
    await db.query(`DELETE FROM public.patients WHERE email = 'admin.test.pat@example.com'`);
    await db.query(`DELETE FROM public.pharmacies WHERE email = 'admin.test.pharm@example.com'`);
    await db.query(`DELETE FROM public.admins WHERE email = 'newsubadmin@example.com'`);
    await app.close();
  });

  it('GET /api/admin/dashboard/stats should return system statistics', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.totalPatients).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalPharmacies).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalAdmins).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/admin/patients should list patients with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/patients?search=Admin%20Test%20Patient')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.patients.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.patients[0].fullName).toBe('Admin Test Patient');
  });

  it('PATCH /api/admin/patients/:id should update patient info', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/admin/patients/${testPatientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Admin Updated Patient' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.fullName).toBe('Admin Updated Patient');
  });

  it('PATCH /api/admin/patients/:id/toggle-status should toggle patient active status', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/admin/patients/${testPatientId}/toggle-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.isActive).toBe(false);
  });

  it('GET /api/admin/pharmacies should list pharmacies', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/pharmacies?status=PENDING')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.pharmacies.some((p: any) => p.id === testPharmacyId)).toBe(true);
  });

  it('PATCH /api/admin/pharmacies/:id/approve should approve pharmacy', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/admin/pharmacies/${testPharmacyId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.verificationStatus).toBe('APPROVED');
  });

  it('PATCH /api/admin/pharmacies/:id/reject should reject pharmacy with reason', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/admin/pharmacies/${testPharmacyId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rejectionReason: 'Invalid RDB certificate provided by owner.' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.verificationStatus).toBe('REJECTED');
  });

  it('POST /api/admin/administrators should create a new administrator', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/administrators')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Sub Admin',
        phoneNumber: '+250788555666',
        email: 'newsubadmin@example.com',
        password: 'Admin@Sub12345',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('newsubadmin@example.com');
    expect(res.body.data.role).toBe('ADMIN');
  });

  it('GET /api/admin/administrators should list all administrators', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/administrators')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.admins.length).toBeGreaterThanOrEqual(2);
  });
});

