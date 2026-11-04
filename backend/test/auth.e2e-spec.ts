import 'dotenv/config';
import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, BadRequestException } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { DatabaseService } from '../src/database/database.service.js';
import { calculateAge } from '../src/auth/auth.service.js';

describe('Auth Endpoints (e2e)', () => {
  let app: INestApplication;
  let db: DatabaseService;

  const testPatient = {
    nationalId: '1199080012345678',
    fullName: 'Jane Doe',
    dateOfBirth: '1998-05-15',
    phoneNumber: '+250788999001',
    email: 'jane.test@example.com',
    gender: 'Female',
    password: 'Password@2026',
  };

  const testPharmacy = {
    pharmacyName: 'LifeCare Kigali Pharmacy',
    phoneNumber: '+250788999002',
    email: 'lifecare.test@example.com',
    tin: '123456789',
    password: 'Pharmacy@2026',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        stopAtFirstError: false,
        exceptionFactory: (validationErrors = []) => {
          const errors: Record<string, string> = {};
          for (const error of validationErrors) {
            if (error.constraints) {
              errors[error.property] = Object.values(error.constraints)[0];
            }
          }
          return new BadRequestException({
            success: false,
            message: 'Validation failed.',
            errors,
          });
        },
      }),
    );

    await app.init();
    db = app.get(DatabaseService);

    // Clean up test data before running
    await db.query(
      `DELETE FROM public.patients WHERE email IN ($1, 'john.dup@example.com') OR phone_number IN ($2, '+250788999099') OR national_id = $3`,
      [testPatient.email, testPatient.phoneNumber, testPatient.nationalId],
    );
    await db.query(
      `DELETE FROM public.pharmacies WHERE email IN ($1, 'pharm.dup@example.com') OR phone_number IN ($2, '+250788999098')`,
      [testPharmacy.email, testPharmacy.phoneNumber],
    );
    await db.query(
      `DELETE FROM public.password_resets WHERE email IN ($1, $2)`,
      [testPatient.email, testPharmacy.email],
    );
  });

  afterAll(async () => {
    // Clean up test data after running
    await db.query(
      `DELETE FROM public.patients WHERE email IN ($1, 'john.dup@example.com') OR phone_number IN ($2, '+250788999099') OR national_id = $3`,
      [testPatient.email, testPatient.phoneNumber, testPatient.nationalId],
    );
    await db.query(
      `DELETE FROM public.pharmacies WHERE email IN ($1, 'pharm.dup@example.com') OR phone_number IN ($2, '+250788999098')`,
      [testPharmacy.email, testPharmacy.phoneNumber],
    );
    await db.query(
      `DELETE FROM public.password_resets WHERE email IN ($1, $2)`,
      [testPatient.email, testPharmacy.email],
    );
    await app.close();
  });

  // ==========================================
  // PATIENT REGISTRATION TESTS
  // ==========================================
  describe('POST /api/auth/register/patient', () => {
    it('should successfully register a patient with dateOfBirth and calculated updated age', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/patient')
        .send(testPatient)
        .expect(201);

      const expectedAge = calculateAge(testPatient.dateOfBirth);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Patient account created successfully.');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.nationalId).toBe(testPatient.nationalId);
      expect(response.body.data.fullName).toBe(testPatient.fullName);
      expect(response.body.data.dateOfBirth).toBe(testPatient.dateOfBirth);
      expect(response.body.data.age).toBe(expectedAge);
      expect(response.body.data.phoneNumber).toBe(testPatient.phoneNumber);
      expect(response.body.data.email).toBe(testPatient.email);
      expect(response.body.data.gender).toBe(testPatient.gender);
      expect(response.body.data.role).toBe('PATIENT');
      // Passwords must never be exposed
      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data.password_hash).toBeUndefined();
    });

    it('should reject invalid dateOfBirth format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/patient')
        .send({ ...testPatient, dateOfBirth: '15-05-1998' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors?.dateOfBirth).toBeDefined();
    });

    it('should reject a future dateOfBirth', async () => {
      const futureYear = new Date().getFullYear() + 1;
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/patient')
        .send({ ...testPatient, dateOfBirth: `${futureYear}-01-01` })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors?.dateOfBirth).toContain('future');
    });

    it('should reject dateOfBirth older than 130 years', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/patient')
        .send({ ...testPatient, dateOfBirth: '1850-01-01' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors?.dateOfBirth).toContain('130');
    });

    it('should reject National ID containing fewer than 16 digits', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/patient')
        .send({ ...testPatient, nationalId: '12345' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors?.nationalId).toBeDefined();
    });

    it('should reject National ID containing more than 16 digits', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/patient')
        .send({ ...testPatient, nationalId: '12345678901234567' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors?.nationalId).toBeDefined();
    });

    it('should reject National ID containing letters', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/patient')
        .send({ ...testPatient, nationalId: '1234567890ABCDEF' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors?.nationalId).toBeDefined();
    });

    it('should reject invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/patient')
        .send({ ...testPatient, email: 'not-an-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors?.email).toBeDefined();
    });

    it('should reject invalid phone number format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/patient')
        .send({ ...testPatient, phoneNumber: '0788123456' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors?.phoneNumber).toBeDefined();
    });

    it('should reject weak password missing special character', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/patient')
        .send({ ...testPatient, password: 'Password123' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors?.password).toBeDefined();
    });

    it('should reject missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/patient')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 409 Conflict for duplicate National ID', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/patient')
        .send({
          ...testPatient,
          email: 'john.dup@example.com',
          phoneNumber: '+250788999099',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('National ID');
    });

    it('should return 409 Conflict for duplicate email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/patient')
        .send({
          ...testPatient,
          nationalId: '9999888877776666',
          phoneNumber: '+250788999099',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });

    it('should return 409 Conflict for duplicate phone number', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/patient')
        .send({
          ...testPatient,
          nationalId: '9999888877776666',
          email: 'john.dup@example.com',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('phone number');
    });
  });

  // ==========================================
  // PHARMACY REGISTRATION TESTS
  // ==========================================
  describe('POST /api/auth/register/pharmacy', () => {
    it('should successfully register a pharmacy with valid details', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/pharmacy')
        .send(testPharmacy)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Pharmacy account created successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.pharmacyName).toBe(testPharmacy.pharmacyName);
      expect(response.body.data.phoneNumber).toBe(testPharmacy.phoneNumber);
      expect(response.body.data.email).toBe(testPharmacy.email);
      expect(response.body.data.role).toBe('PHARMACY');
      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data.password_hash).toBeUndefined();
    });

    it('should reject empty pharmacy name', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/pharmacy')
        .send({ ...testPharmacy, pharmacyName: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors?.pharmacyName).toBeDefined();
    });

    it('should reject invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/pharmacy')
        .send({ ...testPharmacy, email: 'bad-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors?.email).toBeDefined();
    });

    it('should reject invalid phone format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/pharmacy')
        .send({ ...testPharmacy, phoneNumber: '0788123456' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors?.phoneNumber).toBeDefined();
    });

    it('should reject weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/pharmacy')
        .send({ ...testPharmacy, password: 'weak' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors?.password).toBeDefined();
    });

    it('should return 409 Conflict for duplicate pharmacy email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/pharmacy')
        .send({
          ...testPharmacy,
          tin: '987654321',
          phoneNumber: '+250788999098',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });

    it('should return 409 Conflict for duplicate pharmacy phone number', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register/pharmacy')
        .send({
          ...testPharmacy,
          tin: '987654322',
          email: 'pharm.dup@example.com',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('phone number');
    });
  });

  // ==========================================
  // LOGIN TESTS
  // ==========================================
  describe('POST /api/auth/login', () => {
    let patientToken: string;
    let pharmacyToken: string;

    it('should login patient using email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: testPatient.email,
          password: testPatient.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful.');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.role).toBe('PATIENT');
      expect(response.body.data.user.email).toBe(testPatient.email);
      expect(response.body.data.redirectTo).toBe('/patient/dashboard');

      patientToken = response.body.data.token;
    });

    it('should login patient using phone number', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: testPatient.phoneNumber,
          password: testPatient.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('PATIENT');
      expect(response.body.data.redirectTo).toBe('/patient/dashboard');
    });

    it('should login pharmacy using email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: testPharmacy.email,
          password: testPharmacy.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful.');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.role).toBe('PHARMACY');
      expect(response.body.data.user.pharmacyName).toBe(testPharmacy.pharmacyName);
      expect(response.body.data.redirectTo).toBe('/pharmacy/dashboard');

      pharmacyToken = response.body.data.token;
    });

    it('should login pharmacy using phone number', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: testPharmacy.phoneNumber,
          password: testPharmacy.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('PHARMACY');
      expect(response.body.data.redirectTo).toBe('/pharmacy/dashboard');
    });

    it('should reject login with incorrect password (401)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: testPatient.email,
          password: 'IncorrectPassword@999',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials.');
    });

    it('should reject login with nonexistent account (401)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: 'nonexistent@example.com',
          password: 'Password@123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials.');
    });

    it('should reject empty credentials (400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: '',
          password: '',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    // ==========================================
    // ROLE-BASED ACCESS & JWT VERIFICATION TESTS
    // ==========================================
    describe('GET /api/auth/profile (JWT Protected with Dynamic Age)', () => {
      it('should allow access with valid patient JWT token and return dynamically calculated age and dateOfBirth', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${patientToken}`)
          .expect(200);

        const expectedAge = calculateAge(testPatient.dateOfBirth);

        expect(response.body.success).toBe(true);
        expect(response.body.data.role).toBe('PATIENT');
        expect(response.body.data.fullName).toBe(testPatient.fullName);
        expect(response.body.data.dateOfBirth).toBe(testPatient.dateOfBirth);
        expect(response.body.data.age).toBe(expectedAge);
      });

      it('should allow access with valid pharmacy JWT token', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${pharmacyToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.role).toBe('PHARMACY');
        expect(response.body.data.pharmacyName).toBe(testPharmacy.pharmacyName);
      });

      it('should reject requests with invalid or expired JWT token (401)', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/auth/profile')
          .set('Authorization', 'Bearer invalid_token_12345')
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should reject requests missing Authorization header (401)', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/auth/profile')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    // ==========================================
    // FORGOT & RESET PASSWORD TESTS
    // ==========================================
    describe('Password Reset Workflow', () => {
      it('should request forgot password for patient email', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email: testPatient.email })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('password reset link has been sent');

        // Check token generated in database
        const dbRes = await db.query(
          `SELECT reset_id, token_hash FROM public.password_resets WHERE email = $1 AND used = false ORDER BY reset_id DESC LIMIT 1`,
          [testPatient.email],
        );
        expect(dbRes.rows.length).toBe(1);
      });

      it('should reject invalid email format on forgot password', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email: 'not-an-email' })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should return generic success message even for unknown email', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email: 'unknown@example.com' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('password reset link has been sent');
      });

      it('should reset password successfully and allow login with new password', async () => {
        const rawToken = 'test_token_secret_1234567890abcdef';
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        const patientRes = await db.query(
          'SELECT patient_id FROM public.patients WHERE email = $1',
          [testPatient.email],
        );
        const patientId = patientRes.rows[0].patient_id;

        await db.query(
          `INSERT INTO public.password_resets (email, user_type, user_id, token_hash, expires_at, used)
           VALUES ($1, 'PATIENT', $2, $3, $4, false)`,
          [testPatient.email, patientId, tokenHash, expiresAt],
        );

        const newPassword = 'BrandNewPassword@2026!';

        const resetRes = await request(app.getHttpServer())
          .post('/api/auth/reset-password')
          .send({
            token: rawToken,
            newPassword,
          })
          .expect(200);

        expect(resetRes.body.success).toBe(true);
        expect(resetRes.body.message).toBe('Password has been reset successfully.');

        // Login with old password fails
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            identifier: testPatient.email,
            password: testPatient.password,
          })
          .expect(401);

        // Login with new password succeeds
        const newLoginRes = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            identifier: testPatient.email,
            password: newPassword,
          })
          .expect(200);

        expect(newLoginRes.body.success).toBe(true);
        expect(newLoginRes.body.data.token).toBeDefined();

        // Reusing the same reset token fails
        await request(app.getHttpServer())
          .post('/api/auth/reset-password')
          .send({
            token: rawToken,
            newPassword: 'AnotherPassword@2026!',
          })
          .expect(400);
      });
    });
  });
});
