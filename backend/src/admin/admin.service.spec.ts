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

    it('should retrieve pharmacy with associated administrators and staff', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              pharmacy_id: 10,
              pharmacy_name: 'Test Pharmacy',
              phone_number: '+250788123456',
              email: 'test@pharmacy.com',
              verification_status: 'APPROVED',
              is_active: true,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              pharmacy_user_id: 1,
              full_name: 'Admin User',
              email: 'admin@pharmacy.com',
              role: 'PHARMACY_ADMIN',
              is_active: true,
            },
            {
              pharmacy_user_id: 2,
              full_name: 'Sales User',
              email: 'sales@pharmacy.com',
              role: 'SALES_OFFICER',
              is_active: true,
            },
          ],
        });

      const res = await service.getPharmacy(10);
      expect(res.success).toBe(true);
      expect(res.data.pharmacyAdministrators).toHaveLength(1);
      expect(res.data.pharmacyAdministrators[0].fullName).toBe('Admin User');
      expect(res.data.staff).toHaveLength(2);
    });

    it('should toggle pharmacy active/suspended status', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ is_active: false, pharmacy_name: 'Test Pharmacy' }],
        })
        .mockResolvedValueOnce({ rows: [] }); // logActivity

      const res = await service.togglePharmacyStatus(10, 1);
      expect(res.success).toBe(true);
      expect(res.data.isActive).toBe(false);
      expect(res.message).toContain('suspended');
    });

    it('should generate system overview report', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              total_pharmacies: '12',
              active_pharmacies: '10',
              suspended_pharmacies: '2',
              approved_pharmacies: '9',
              pending_pharmacies: '2',
              rejected_pharmacies: '1',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              total_pharmacy_users: '30',
              total_pharmacy_admins: '12',
              total_pharmacists: '10',
              total_sales_officers: '8',
              active_users: '28',
              inactive_users: '2',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              total_sales: '150',
              total_revenue: '500000',
              total_paid: '480000',
              pharmacies_with_sales: '8',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              total_batches: '80',
              total_units_in_stock: '4500',
              low_stock_batches: '5',
              expired_batches: '2',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              log_id: 1,
              admin_id: 1,
              action: 'APPROVE_PHARMACY',
              created_at: new Date(),
            },
          ],
        });

      const res = await service.getSystemOverviewReport();
      expect(res.success).toBe(true);
      expect(res.data.pharmacies.total).toBe(12);
      expect(res.data.users.total).toBe(30);
      expect(res.data.sales.totalRevenue).toBe(500000);
      expect(res.data.inventory.totalBatches).toBe(80);
      expect(res.data.recentActivities).toHaveLength(1);
    });

    it('should retrieve pharmacy activity logs for system admin', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ pharmacy_name: 'Test Pharmacy' }] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              log_id: 101,
              pharmacy_id: 5,
              pharmacy_user_id: 1,
              action: 'SALE_TRANSACTION',
              employee_name: 'Alice Pharmacist',
              employee_role: 'PHARMACIST',
              details: { amount: 5000 },
              created_at: new Date(),
            },
          ],
        });

      const res = await service.getPharmacyActivities(5);
      expect(res.success).toBe(true);
      expect(res.data.pharmacyName).toBe('Test Pharmacy');
      expect(res.data.logs).toHaveLength(1);
      expect(res.data.logs[0].employeeName).toBe('Alice Pharmacist');
    });
  });
});

