import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { AuthService, calculateAge } from './auth.service.js';
import { DatabaseService } from '../database/database.service.js';
import { MailService } from '../mail/mail.service.js';

describe('AuthService', () => {
  let authService: AuthService;
  let mockDb: any;
  let mockJwtService: any;
  let mockMailService: any;

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
      transaction: vi.fn(),
    };

    mockJwtService = {
      sign: vi.fn().mockReturnValue('mock_jwt_token_123'),
      verifyAsync: vi.fn(),
    };

    mockMailService = {
      sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
    };

    authService = new AuthService(
      mockDb as unknown as DatabaseService,
      mockJwtService as unknown as JwtService,
      mockMailService as unknown as MailService,
    );
  });

  describe('calculateAge helper', () => {
    it('should accurately calculate age from date of birth', () => {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - 25;
      const dob = `${birthYear}-01-01`;
      const age = calculateAge(dob);
      expect(age).toBe(25);
    });
  });

  describe('registerPatient', () => {
    const validPatientDto = {
      nationalId: '1234567890123456',
      fullName: 'John Doe',
      dateOfBirth: '2001-05-15',
      phoneNumber: '+250788123456',
      email: 'john@example.com',
      gender: 'Male' as const,
      password: 'Password@123',
    };

    it('should successfully register a new patient with dateOfBirth and calculated age', async () => {
      const expectedAge = calculateAge(validPatientDto.dateOfBirth);

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // nationalId check
        .mockResolvedValueOnce({ rows: [] }) // email patient check
        .mockResolvedValueOnce({ rows: [] }) // email pharmacy check
        .mockResolvedValueOnce({ rows: [] }) // phone patient check
        .mockResolvedValueOnce({ rows: [] }) // phone pharmacy check
        .mockResolvedValueOnce({
          rows: [
            {
              patient_id: '1',
              national_id: validPatientDto.nationalId,
              full_name: validPatientDto.fullName,
              age: expectedAge,
              date_of_birth: validPatientDto.dateOfBirth,
              phone_number: validPatientDto.phoneNumber,
              email: validPatientDto.email,
              gender: validPatientDto.gender,
            },
          ],
        }); // insert query

      const result = await authService.registerPatient(validPatientDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Patient account created successfully.');
      expect(result.data).toEqual({
        id: 1,
        nationalId: '1234567890123456',
        fullName: 'John Doe',
        dateOfBirth: '2001-05-15',
        age: expectedAge,
        phoneNumber: '+250788123456',
        email: 'john@example.com',
        gender: 'Male',
        role: 'PATIENT',
      });
      expect((result.data as any).password).toBeUndefined();
      expect((result.data as any).password_hash).toBeUndefined();
    });

    it('should successfully register a patient without optional email and nationalId', async () => {
      const minimalPatientDto = {
        fullName: 'Jane Doe',
        dateOfBirth: '2000-01-01',
        phoneNumber: '+250788999888',
        gender: 'Female' as const,
        password: 'Password@123',
      };
      const expectedAge = calculateAge(minimalPatientDto.dateOfBirth);

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // phone patient check
        .mockResolvedValueOnce({ rows: [] }) // phone pharmacy check
        .mockResolvedValueOnce({
          rows: [
            {
              patient_id: '5',
              national_id: null,
              full_name: minimalPatientDto.fullName,
              age: expectedAge,
              date_of_birth: minimalPatientDto.dateOfBirth,
              phone_number: minimalPatientDto.phoneNumber,
              email: null,
              gender: minimalPatientDto.gender,
            },
          ],
        }); // insert query

      const result = await authService.registerPatient(minimalPatientDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Patient account created successfully.');
      expect(result.data).toEqual({
        id: 5,
        nationalId: null,
        fullName: 'Jane Doe',
        dateOfBirth: '2000-01-01',
        age: expectedAge,
        phoneNumber: '+250788999888',
        email: null,
        gender: 'Female',
        role: 'PATIENT',
      });
    });

    it('should reject a future dateOfBirth', async () => {
      const futureYear = new Date().getFullYear() + 2;
      await expect(
        authService.registerPatient({
          ...validPatientDto,
          dateOfBirth: `${futureYear}-01-01`,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a dateOfBirth older than 130 years', async () => {
      await expect(
        authService.registerPatient({
          ...validPatientDto,
          dateOfBirth: '1850-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if National ID already exists', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ patient_id: '1' }] });

      await expect(authService.registerPatient(validPatientDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // NID
        .mockResolvedValueOnce({ rows: [{ patient_id: '1' }] }); // Email exists

      await expect(authService.registerPatient(validPatientDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if phone number already exists', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // NID
        .mockResolvedValueOnce({ rows: [] }) // email patient
        .mockResolvedValueOnce({ rows: [] }) // email pharmacy
        .mockResolvedValueOnce({ rows: [{ patient_id: '1' }] }); // phone patient exists

      await expect(authService.registerPatient(validPatientDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('registerPharmacy', () => {
    const validPharmacyDto = {
      pharmacyName: 'Kigali Central Pharmacy',
      phoneNumber: '+250788123456',
      email: 'kigalipharmacy@example.com',
      tin: '123456789',
      password: 'Pharmacy@123',
    };

    it('should successfully register a pharmacy', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // email pharmacy check
        .mockResolvedValueOnce({ rows: [] }) // email patient check
        .mockResolvedValueOnce({ rows: [] }) // phone pharmacy check
        .mockResolvedValueOnce({ rows: [] }) // phone patient check
        .mockResolvedValueOnce({ rows: [] }); // tin check

      mockDb.transaction.mockImplementation(async (callback: any) => {
        const client = {
          query: vi.fn().mockImplementation((queryText: string) => {
            if (queryText.includes('INSERT INTO public.pharmacies')) {
              return Promise.resolve({
                rows: [
                  {
                    pharmacy_id: '2',
                    pharmacy_name: validPharmacyDto.pharmacyName,
                    phone_number: validPharmacyDto.phoneNumber,
                    email: validPharmacyDto.email,
                    tin: validPharmacyDto.tin,
                    verification_status: 'PENDING',
                  },
                ],
              });
            }
            return Promise.resolve({ rows: [] });
          }),
        };
        return callback(client);
      });

      const result = await authService.registerPharmacy(validPharmacyDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Pharmacy account created successfully');
      expect(result.data).toEqual({
        id: 2,
        pharmacyName: 'Kigali Central Pharmacy',
        phoneNumber: '+250788123456',
        email: 'kigalipharmacy@example.com',
        tin: '123456789',
        verificationStatus: 'PENDING',
        role: 'PHARMACY',
      });
      expect((result.data as any).password).toBeUndefined();
      expect((result.data as any).password_hash).toBeUndefined();
    });

    it('should throw ConflictException if pharmacy email already exists', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ pharmacy_id: '1' }] });

      await expect(authService.registerPharmacy(validPharmacyDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if pharmacy phone already exists', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // email pharmacy
        .mockResolvedValueOnce({ rows: [] }) // email patient
        .mockResolvedValueOnce({ rows: [{ pharmacy_id: '1' }] }); // phone pharmacy exists

      await expect(authService.registerPharmacy(validPharmacyDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if pharmacy TIN already exists', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // email pharmacy
        .mockResolvedValueOnce({ rows: [] }) // email patient
        .mockResolvedValueOnce({ rows: [] }) // phone pharmacy
        .mockResolvedValueOnce({ rows: [] }) // phone patient
        .mockResolvedValueOnce({ rows: [{ pharmacy_id: '1' }] }); // TIN exists

      await expect(authService.registerPharmacy(validPharmacyDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should login a patient using email', async () => {
      const hashedPassword = await bcrypt.hash('John@12345', 10);

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            patient_id: '1',
            full_name: 'John Doe',
            email: 'john@example.com',
            phone_number: '+250788123456',
            password_hash: hashedPassword,
            is_active: true,
          },
        ],
      });

      const result = await authService.login({
        identifier: 'john@example.com',
        password: 'John@12345',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Login successful.');
      expect(result.data.token).toBe('mock_jwt_token_123');
      expect(result.data.user).toEqual({
        id: 1,
        fullName: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+250788123456',
        role: 'PATIENT',
      });
      expect(result.data.redirectTo).toBe('/patient/dashboard');
    });

    it('should login a patient using phone number', async () => {
      const hashedPassword = await bcrypt.hash('John@12345', 10);

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            patient_id: '1',
            full_name: 'John Doe',
            email: 'john@example.com',
            phone_number: '+250788123456',
            password_hash: hashedPassword,
            is_active: true,
          },
        ],
      });

      const result = await authService.login({
        identifier: '+250788123456',
        password: 'John@12345',
      });

      expect(result.success).toBe(true);
      expect(result.data.user.role).toBe('PATIENT');
      expect(result.data.redirectTo).toBe('/patient/dashboard');
    });

    it('should login a pharmacy using email', async () => {
      const hashedPassword = await bcrypt.hash('Pharmacy@123', 10);

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // not patient
        .mockResolvedValueOnce({
          rows: [
            {
              pharmacy_id: '2',
              pharmacy_name: 'Kigali Central Pharmacy',
              email: 'kigalipharmacy@example.com',
              phone_number: '+250788123456',
              password_hash: hashedPassword,
              verification_status: 'PENDING',
              is_active: true,
            },
          ],
        });

      const result = await authService.login({
        identifier: 'kigalipharmacy@example.com',
        password: 'Pharmacy@123',
      });

      expect(result.success).toBe(true);
      expect(result.data.token).toBe('mock_jwt_token_123');
      expect(result.data.user).toEqual({
        id: 2,
        pharmacyName: 'Kigali Central Pharmacy',
        email: 'kigalipharmacy@example.com',
        phoneNumber: '+250788123456',
        verificationStatus: 'PENDING',
        role: 'PHARMACY',
      });
      expect(result.data.redirectTo).toBe('/pharmacy/dashboard');
    });

    it('should login an admin using email', async () => {
      const hashedPassword = await bcrypt.hash('Admin@12345', 10);

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // not patient
        .mockResolvedValueOnce({ rows: [] }) // not pharmacy
        .mockResolvedValueOnce({
          rows: [
            {
              admin_id: '1',
              full_name: 'System Administrator',
              email: 'admin@pharmatrack.com',
              phone_number: '+250000000000',
              password_hash: hashedPassword,
              must_change_password: true,
              is_active: true,
            },
          ],
        });

      const result = await authService.login({
        identifier: 'admin@pharmatrack.com',
        password: 'Admin@12345',
      });

      expect(result.success).toBe(true);
      expect(result.data.token).toBe('mock_jwt_token_123');
      expect(result.data.user).toEqual({
        id: 1,
        fullName: 'System Administrator',
        email: 'admin@pharmatrack.com',
        phoneNumber: '+250000000000',
        mustChangePassword: true,
        role: 'ADMIN',
      });
      expect(result.data.redirectTo).toBe('/admin/dashboard');
    });

    it('should throw UnauthorizedException on incorrect password', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword@123', 10);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              patient_id: '1',
              password_hash: hashedPassword,
              is_active: true,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(
        authService.login({
          identifier: 'john@example.com',
          password: 'WrongPassword@123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on nonexistent account', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // patient
        .mockResolvedValueOnce({ rows: [] }) // pharmacy
        .mockResolvedValueOnce({ rows: [] }); // admin

      await expect(
        authService.login({
          identifier: 'nonexistent@example.com',
          password: 'SomePassword@123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException if patient account is inactive', async () => {
      const hashedPassword = await bcrypt.hash('Password@123', 10);

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            patient_id: '1',
            email: 'inactive@example.com',
            password_hash: hashedPassword,
            is_active: false,
          },
        ],
      });

      await expect(
        authService.login({
          identifier: 'inactive@example.com',
          password: 'Password@123',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if pharmacy account is inactive', async () => {
      const hashedPassword = await bcrypt.hash('Password@123', 10);

      mockDb.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              pharmacy_id: '2',
              email: 'pharmacy@example.com',
              password_hash: hashedPassword,
              is_active: false,
            },
          ],
        });

      await expect(
        authService.login({
          identifier: 'pharmacy@example.com',
          password: 'Password@123',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('forgotPassword', () => {
    it('should send reset email and record token when patient email exists', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ patient_id: '1', full_name: 'John Doe', email: 'john@example.com' }],
        }) // patient found
        .mockResolvedValueOnce({ rows: [] }) // pharmacy check
        .mockResolvedValueOnce({ rows: [] }) // invalidate old tokens
        .mockResolvedValueOnce({ rows: [] }); // insert new reset token

      const result = await authService.forgotPassword({ email: 'john@example.com' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('password reset link has been sent');
      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'john@example.com',
        'John Doe',
        expect.any(String),
      );
    });

    it('should return generic success message even if email does not exist', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // patient check
        .mockResolvedValueOnce({ rows: [] }) // pharmacy check
        .mockResolvedValueOnce({ rows: [] }); // admin check

      const result = await authService.forgotPassword({ email: 'unknown@example.com' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('password reset link has been sent');
      expect(mockMailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password for patient with a valid token', async () => {
      const rawToken = 'sample_valid_token_1234567890';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              reset_id: '10',
              email: 'john@example.com',
              user_type: 'PATIENT',
              user_id: '1',
              expires_at: new Date(Date.now() + 100000),
            },
          ],
        }) // token query
        .mockResolvedValueOnce({ rows: [] }) // update patient password
        .mockResolvedValueOnce({ rows: [] }); // mark token used

      const result = await authService.resetPassword({
        token: rawToken,
        newPassword: 'NewPassword@2026',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password has been reset successfully.');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE public.patients SET password_hash = $1'),
        expect.any(Array),
      );
    });

    it('should reject invalid or expired reset token', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        authService.resetPassword({
          token: 'invalid_or_expired_token',
          newPassword: 'NewPassword@2026',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProfile', () => {
    it('should return patient profile with dateOfBirth and dynamically calculated age', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            patient_id: '1',
            national_id: '1234567890123456',
            full_name: 'John Doe',
            date_of_birth: '1998-05-15',
            age: 28,
            phone_number: '+250788123456',
            email: 'john@example.com',
            gender: 'Male',
            is_active: true,
          },
        ],
      });

      const res = await authService.getProfile(1, 'PATIENT');
      expect(res.success).toBe(true);
      expect(res.data.fullName).toBe('John Doe');
      expect(res.data.dateOfBirth).toBe('1998-05-15');
      expect(res.data.age).toBe(calculateAge('1998-05-15'));
      expect(res.data.role).toBe('PATIENT');
    });

    it('should return pharmacy profile', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            pharmacy_id: '2',
            pharmacy_name: 'Kigali Pharmacy',
            phone_number: '+250788123456',
            email: 'kigali@example.com',
            tin: '123456789',
            verification_status: 'PENDING',
            is_active: true,
          },
        ],
      });

      const res = await authService.getProfile(2, 'PHARMACY');
      expect(res.success).toBe(true);
      expect(res.data.pharmacyName).toBe('Kigali Pharmacy');
      expect(res.data.role).toBe('PHARMACY');
    });

    it('should return admin profile', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            admin_id: '1',
            full_name: 'System Admin',
            phone_number: '+250000000000',
            email: 'admin@pharmatrack.com',
            must_change_password: false,
            is_active: true,
            role: 'ADMIN',
          },
        ],
      });

      const res = await authService.getProfile(1, 'ADMIN');
      expect(res.success).toBe(true);
      expect(res.data.fullName).toBe('System Admin');
      expect(res.data.role).toBe('ADMIN');
    });
  });
});
