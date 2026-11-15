import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { DatabaseService } from '../database/database.service.js';

describe('AdminService', () => {
  let service: AdminService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
      transaction: vi.fn(),
    };
    service = new AdminService(mockDb as unknown as DatabaseService);
  });

  describe('createPharmacy', () => {
    it('should create an approved pharmacy and primary owner in a transaction', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // duplicate email check
        .mockResolvedValueOnce({ rows: [] }) // duplicate phone check
        .mockResolvedValueOnce({ rows: [] }) // duplicate tin check
        .mockResolvedValueOnce({ rows: [] }); // logActivity insert

      const fakeCreatedPharmacy = {
        pharmacy_id: 10,
        pharmacy_name: 'Kigali Central Pharmacy',
        phone_number: '+250788123456',
        email: 'kigali@example.com',
        tin: '123456789',
        location_address: 'Kigali City Center',
        verification_status: 'APPROVED',
        is_active: true,
        created_at: new Date(),
      };

      mockDb.transaction.mockImplementation(async (callback: any) => {
        const client = {
          query: vi
            .fn()
            .mockResolvedValueOnce({ rows: [fakeCreatedPharmacy] }) // insert into pharmacies
            .mockResolvedValueOnce({ rows: [{ pharmacy_user_id: 1 }] }), // insert into pharmacy_users
        };
        return callback(client);
      });

      const res = await service.createPharmacy(
        {
          pharmacyName: 'Kigali Central Pharmacy',
          phoneNumber: '+250788123456',
          email: 'kigali@example.com',
          tin: '123456789',
          locationAddress: 'Kigali City Center',
          password: 'Password@123',
        },
        1,
      );

      expect(res.success).toBe(true);
      expect(res.data.id).toBe(10);
      expect(res.data.verificationStatus).toBe('APPROVED');
      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if pharmacy email already exists', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // duplicate email found

      await expect(
        service.createPharmacy(
          {
            pharmacyName: 'Kigali Central Pharmacy',
            phoneNumber: '+250788123456',
            email: 'duplicate@example.com',
            tin: '123456789',
            password: 'Password@123',
          },
          1,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if pharmacy TIN already exists', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // email ok
        .mockResolvedValueOnce({ rows: [] }) // phone ok
        .mockResolvedValueOnce({ rows: [{ pharmacy_id: 5 }] }); // duplicate TIN

      await expect(
        service.createPharmacy(
          {
            pharmacyName: 'Kigali Central Pharmacy',
            phoneNumber: '+250788123456',
            email: 'unique@example.com',
            tin: '123456789',
            password: 'Password@123',
          },
          1,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('createPatient', () => {
    it('should successfully create a new patient account', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // duplicate nationalId check
        .mockResolvedValueOnce({ rows: [] }) // duplicate email check
        .mockResolvedValueOnce({ rows: [] }) // duplicate phone check
        .mockResolvedValueOnce({
          rows: [
            {
              patient_id: 25,
              national_id: '1199880012345678',
              full_name: 'John Patient',
              age: 26,
              date_of_birth: '1998-05-15',
              phone_number: '+250788333444',
              email: 'patient@example.com',
              gender: 'Male',
              is_active: true,
              created_at: new Date(),
            },
          ],
        }) // insert patient
        .mockResolvedValueOnce({ rows: [] }); // logActivity insert

      const res = await service.createPatient(
        {
          fullName: 'John Patient',
          phoneNumber: '+250788333444',
          dateOfBirth: '1998-05-15',
          gender: 'Male',
          email: 'patient@example.com',
          nationalId: '1199880012345678',
          password: 'Password@123',
        },
        1,
      );

      expect(res.success).toBe(true);
      expect(res.data.id).toBe(25);
      expect(res.data.fullName).toBe('John Patient');
      expect(res.data.isActive).toBe(true);
    });

    it('should throw BadRequestException for invalid human age date of birth', async () => {
      await expect(
        service.createPatient(
          {
            fullName: 'Future Baby',
            phoneNumber: '+250788333444',
            dateOfBirth: '2099-01-01',
            gender: 'Male',
            password: 'Password@123',
          },
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if patient phone number already exists', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // email ok
        .mockResolvedValueOnce({ rows: [{ id: 99 }] }); // duplicate phone found

      await expect(
        service.createPatient(
          {
            fullName: 'Jane Doe',
            phoneNumber: '+250788999888',
            dateOfBirth: '1995-02-10',
            gender: 'Female',
            email: 'unique@example.com',
            password: 'Password@123',
          },
          1,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('dashboard & management', () => {
    it('should retrieve dashboard stats', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '4' }] });

      const res = await service.getDashboardStats();
      expect(res.success).toBe(true);
      expect(res.data.totalPatients).toBe(10);
      expect(res.data.totalPharmacies).toBe(5);
    });

    it('should toggle patient status', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ is_active: false }] });
      const res = await service.togglePatientStatus(1);
      expect(res.success).toBe(true);
      expect(res.data.isActive).toBe(false);
    });
  });
});

