import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { StaffService } from './staff.service.js';
import { ActivityLogService } from './activity-log.service.js';
import type { DatabaseService } from '../database/database.service.js';
import type { MailService } from '../mail/mail.service.js';

describe('StaffService', () => {
  let staffService: StaffService;
  let mockDb: any;
  let mockMail: any;
  let mockActivityLog: any;

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
      transaction: vi.fn(),
    };

    mockMail = {
      sendStaffInvitationEmail: vi.fn().mockResolvedValue(true),
    };

    mockActivityLog = {
      log: vi.fn().mockResolvedValue(undefined),
      getLogs: vi.fn().mockResolvedValue({ logs: [], total: 0 }),
    };

    staffService = new StaffService(
      mockDb as unknown as DatabaseService,
      mockMail as unknown as MailService,
      mockActivityLog as unknown as ActivityLogService,
    );
  });

  describe('registerStaff', () => {
    it('should successfully register a new staff member with activation code', async () => {
      // 1. Check duplicate phone
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      // 2. Check duplicate email
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      // 3. Pharmacy name
      mockDb.query.mockResolvedValueOnce({
        rows: [{ pharmacy_name: 'Test Pharmacy' }],
      });
      // 4. Check creator exists in pharmacy_users
      mockDb.query.mockResolvedValueOnce({
        rows: [{ pharmacy_user_id: 1 }],
      });

      // Transaction callback execution
      mockDb.transaction.mockImplementation(async (cb: any) => {
        const client = {
          query: vi
            .fn()
            // Insert into pharmacy_users
            .mockResolvedValueOnce({
              rows: [
                {
                  pharmacy_user_id: '101',
                  pharmacy_id: '5',
                  full_name: 'Alice Pharmacist',
                  email: 'alice@pharmacy.com',
                  phone_number: '+250788111222',
                  role: 'PHARMACIST',
                  is_active: false,
                  created_at: new Date(),
                },
              ],
            })
            // Insert into password_resets
            .mockResolvedValueOnce({ rows: [] })
            // Notification
            .mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const result = await staffService.registerStaff(
        5,
        {
          fullName: 'Alice Pharmacist',
          email: 'alice@pharmacy.com',
          phoneNumber: '+250788111222',
          role: 'PHARMACIST',
        },
        1,
      );

      expect(result.success).toBe(true);
      expect(result.data.staff.fullName).toBe('Alice Pharmacist');
      expect(result.data.staff.role).toBe('PHARMACIST');
      expect(result.data.activation.activationCode).toBeDefined();
      expect(result.data.activation.activationCode).toHaveLength(6);
      expect(mockMail.sendStaffInvitationEmail).toHaveBeenCalled();
      expect(mockActivityLog.log).toHaveBeenCalledWith(
        5,
        1,
        'STAFF_REGISTERED',
        'STAFF',
        101,
        expect.anything(),
      );
    });

    it('should reject staff registration if phone number already exists', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ pharmacy_user_id: '99', phone_number: '+250788111222' }],
      });

      await expect(
        staffService.registerStaff(
          5,
          {
            fullName: 'Duplicate Phone',
            phoneNumber: '+250788111222',
            role: 'SALES_OFFICER',
          },
          1,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('activateAccount', () => {
    it('should successfully activate staff account with valid code and matching password', async () => {
      // 1. Locate staff account
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            pharmacy_user_id: '101',
            pharmacy_id: '5',
            full_name: 'Alice Pharmacist',
            email: 'alice@pharmacy.com',
            phone_number: '+250788111222',
            role: 'PHARMACIST',
            is_active: false,
          },
        ],
      });

      // 2. Locate active activation record
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            reset_id: '42',
            user_id: '101',
            user_type: 'PHARMACY',
            token_hash: 'token123',
            code: '123456',
            used: false,
            expires_at: new Date(Date.now() + 3600000), // 1 hour in future
          },
        ],
      });

      mockDb.transaction.mockImplementation(async (cb: any) => {
        const client = {
          query: vi
            .fn()
            .mockResolvedValueOnce({ rows: [] }) // update user password & is_active = true
            .mockResolvedValueOnce({ rows: [] }) // mark reset as used
            .mockResolvedValueOnce({ rows: [] }), // notification
        };
        return cb(client);
      });

      const result = await staffService.activateAccount({
        identifier: 'alice@pharmacy.com',
        activationCode: '123456',
        password: 'NewStrongPassword@123',
        confirmPassword: 'NewStrongPassword@123',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Account successfully activated');
      expect(result.data.role).toBe('PHARMACIST');
      expect(mockActivityLog.log).toHaveBeenCalledWith(
        5,
        101,
        'STAFF_ACTIVATED',
        'STAFF',
        101,
        expect.anything(),
      );
    });

    it('should throw BadRequestException if passwords do not match', async () => {
      await expect(
        staffService.activateAccount({
          identifier: 'alice@pharmacy.com',
          activationCode: '123456',
          password: 'Password@123',
          confirmPassword: 'DifferentPassword@123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if account identifier does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        staffService.activateAccount({
          identifier: 'nonexistent@pharmacy.com',
          activationCode: '999999',
          password: 'Password@123',
          confirmPassword: 'Password@123',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleStaffStatus', () => {
    it('should suspend staff and prevent self-suspension', async () => {
      // 1. Cannot suspend self
      await expect(staffService.toggleStaffStatus(5, 1, 1)).rejects.toThrow(
        BadRequestException,
      );

      // 2. Suspend another staff member
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              pharmacy_user_id: '101',
              pharmacy_id: '5',
              full_name: 'Alice',
              is_active: true,
              role: 'PHARMACIST',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              pharmacy_user_id: '101',
              full_name: 'Alice',
              is_active: false,
              role: 'PHARMACIST',
            },
          ],
        });

      const result = await staffService.toggleStaffStatus(5, 101, 1);
      expect(result.success).toBe(true);
      expect(result.data.isActive).toBe(false);
      expect(mockActivityLog.log).toHaveBeenCalledWith(
        5,
        1,
        'STAFF_SUSPENDED',
        'STAFF',
        101,
        expect.anything(),
      );
    });
  });

  describe('Tenant Isolation & Role-based boundaries', () => {
    it('should throw NotFoundException if staff does not belong to caller pharmacy', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(staffService.getStaffById(5, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return personal report strictly scoped to employee', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              total_sales: '15',
              total_revenue: '45000',
              patient_contribution: '30000',
              insurance_contribution: '15000',
              private_sales: '10',
              insurance_sales: '5',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              medicines_sold: '30',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              sale_id: '1',
              receipt_number: 'REC-001',
              customer_name: 'Customer A',
              payment_category: 'PRIVATE',
              net_total_amount: 3000,
              payment_status: 'PAID',
              created_at: '2026-11-17 10:00:00',
            },
          ],
        });

      const result = await staffService.getMyPersonalReport(5, 101, 'today');
      expect(result.success).toBe(true);
      expect(result.data.summary.totalSales).toBe(15);
      expect(result.data.summary.totalRevenue).toBe(45000);
      expect(result.data.summary.totalMedicinesSold).toBe(30);
      expect(result.data.recentSales).toHaveLength(1);
    });

    it('should return 4-category real-time inventory monitor', async () => {
      // 1. newStock
      mockDb.query.mockResolvedValueOnce({
        rows: [{ inventory_id: 1, batch_number: 'B001', medicine_name: 'Amoxicillin' }],
      });
      // 2. stockOut
      mockDb.query.mockResolvedValueOnce({
        rows: [{ transaction_id: 10, batch_number: 'B001', medicine_name: 'Amoxicillin' }],
      });
      // 3. lowStock
      mockDb.query.mockResolvedValueOnce({
        rows: [{ inventory_id: 2, batch_number: 'B002', medicine_name: 'Paracetamol' }],
      });
      // 4. damagedStock
      mockDb.query.mockResolvedValueOnce({
        rows: [{ transaction_id: 12, batch_number: 'B003', medicine_name: 'Ibuprofen' }],
      });

      const result = await staffService.getInventoryMonitor(5);
      expect(result.success).toBe(true);
      expect(result.data.newStock).toHaveLength(1);
      expect(result.data.stockOut).toHaveLength(1);
      expect(result.data.lowStock).toHaveLength(1);
      expect(result.data.damagedStock).toHaveLength(1);
    });
  });

  describe('updatePharmacyProfile', () => {
    it('should allow pharmacy admin to update address and contact info', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            pharmacy_id: '5',
            pharmacy_name: 'Updated Pharmacy Name',
            location_address: 'Kigali City Center',
            phone_number: '+250788111999',
            email: 'info@pharmacy.com',
          },
        ],
      });

      const result = await staffService.updatePharmacyProfile(
        5,
        {
          pharmacyName: 'Updated Pharmacy Name',
          locationAddress: 'Kigali City Center',
          phoneNumber: '+250788111999',
          email: 'info@pharmacy.com',
        },
        1,
      );

      expect(result.success).toBe(true);
      expect(result.data.pharmacy_name).toBe('Updated Pharmacy Name');
      expect(mockActivityLog.log).toHaveBeenCalledWith(
        5,
        1,
        'PHARMACY_PROFILE_UPDATED',
        'PHARMACY',
        5,
        expect.anything(),
      );
    });
  });
});
