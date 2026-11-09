import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SalesService } from './sales.service.js';
import { DatabaseService } from '../database/database.service.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';

describe('SalesService', () => {
  let service: SalesService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
      transaction: vi.fn(),
    };

    service = new SalesService(mockDb as unknown as DatabaseService);
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Data Isolation & Tenant Resolution
  // ─────────────────────────────────────────────────────────────
  describe('resolvePharmacyId', () => {
    it('should strictly return token sub for PHARMACY role, ignoring requested pharmacyId', async () => {
      const pharmacyUser: JwtPayload = {
        sub: 12,
        email: 'pharmacist@kigali.rw',
        role: 'PHARMACY',
      };

      const resolved = await service.resolvePharmacyId(pharmacyUser, 99);
      expect(resolved).toBe(12);
    });

    it('should allow ADMIN role to override pharmacyId', async () => {
      const adminUser: JwtPayload = {
        sub: 1,
        email: 'admin@pharmatrack.com',
        role: 'ADMIN',
      };

      const resolved = await service.resolvePharmacyId(adminUser, 15);
      expect(resolved).toBe(15);
    });

    it('should throw ForbiddenException if PATIENT role attempts access', async () => {
      const patientUser: JwtPayload = {
        sub: 7,
        email: 'patient@example.com',
        role: 'PATIENT',
      };

      await expect(service.resolvePharmacyId(patientUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Sales Dashboard (Section 3)
  // ─────────────────────────────────────────────────────────────
  describe('getSalesDashboard', () => {
    it('should retrieve aggregated metrics from database records', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              total_sales: '20',
              total_revenue: '150000.00',
              total_patient_contribution: '75000.00',
              total_insurance_contribution: '75000.00',
              private_sales_count: '12',
              private_revenue: '60000.00',
              insurance_sales_count: '8',
              insurance_revenue: '90000.00',
              outstanding_balances: '15000.00',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ total_medicines_sold: '45' }] })
        .mockResolvedValueOnce({
          rows: [{ pending_claims_count: '5', pending_claims_amount: '45000.00' }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              sale_id: 1,
              receipt_number: 'REC-20261109-0001',
              customer_name: 'John Doe',
              payment_category: 'PRIVATE',
            },
          ],
        });

      const res = await service.getSalesDashboard(1, { period: 'today' });

      expect(res.success).toBe(true);
      expect(res.data.summary.totalSales).toBe(20);
      expect(res.data.summary.totalRevenue).toBe(150000);
      expect(res.data.summary.totalMedicinesSold).toBe(45);
      expect(res.data.summary.privateSales.count).toBe(12);
      expect(res.data.summary.insuranceSales.count).toBe(8);
      expect(res.data.summary.pendingClaims.count).toBe(5);
      expect(res.data.recentSales).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Bill Calculation (Section 6 & 7)
  // ─────────────────────────────────────────────────────────────
  describe('calculateBill', () => {
    it('should calculate PRIVATE bill: patient pays 100%, insurance = 0 RWF', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            inventory_id: 10,
            pharmacy_id: 1,
            medicine_id: 100,
            batch_number: 'B-001',
            quantity: 50,
            unit_price: '2500.00',
            expiry_date: '2028-12-31',
            medicine_name: 'Amoxicillin 500mg',
            strength: '500mg',
          },
        ],
      });

      const res = await service.calculateBill(1, {
        paymentCategory: 'PRIVATE',
        items: [{ inventoryId: 10, quantity: 2 }],
      });

      expect(res.success).toBe(true);
      expect(res.data.financials.grossTotal).toBe(5000);
      expect(res.data.financials.insuranceContribution).toBe(0);
      expect(res.data.financials.patientContribution).toBe(5000);
    });

    it('should calculate INSURANCE bill with 75% coverage (insurance = 3,750 RWF, patient = 1,250 RWF for 5,000 total)', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ provider_name: 'RSSB', default_coverage_percentage: '75.00' }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              inventory_id: 10,
              pharmacy_id: 1,
              medicine_id: 100,
              batch_number: 'B-001',
              quantity: 50,
              unit_price: '2500.00',
              expiry_date: '2028-12-31',
              medicine_name: 'Amoxicillin 500mg',
              strength: '500mg',
            },
          ],
        });

      const res = await service.calculateBill(1, {
        paymentCategory: 'INSURANCE',
        providerId: 1,
        items: [{ inventoryId: 10, quantity: 2, isInsuranceCovered: true }],
      });

      expect(res.success).toBe(true);
      expect(res.data.financials.grossTotal).toBe(5000);
      expect(res.data.financials.insuranceContribution).toBe(3750);
      expect(res.data.financials.patientContribution).toBe(1250);
    });

    it('should support non-covered medicines in an insurance sale: patient pays 100% for non-covered item', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ provider_name: 'MMI', default_coverage_percentage: '85.00' }],
        })
        .mockResolvedValueOnce({
          // Item 1: Covered (3,000 RWF)
          rows: [
            {
              inventory_id: 1,
              pharmacy_id: 1,
              medicine_id: 10,
              batch_number: 'B-1',
              quantity: 20,
              unit_price: '3000.00',
              expiry_date: '2028-12-31',
              medicine_name: 'Ciprofloxacin',
            },
          ],
        })
        .mockResolvedValueOnce({
          // Item 2: Not covered supplement (2,000 RWF)
          rows: [
            {
              inventory_id: 2,
              pharmacy_id: 1,
              medicine_id: 20,
              batch_number: 'B-2',
              quantity: 20,
              unit_price: '2000.00',
              expiry_date: '2028-12-31',
              medicine_name: 'Vitamin C Supplement',
            },
          ],
        });

      const res = await service.calculateBill(1, {
        paymentCategory: 'INSURANCE',
        providerId: 2,
        items: [
          { inventoryId: 1, quantity: 1, isInsuranceCovered: true },
          { inventoryId: 2, quantity: 1, isInsuranceCovered: false },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.data.financials.grossTotal).toBe(5000);
      // Item 1: 3000 * 85% = 2550 insurance, 450 patient
      // Item 2: 2000 * 0% = 0 insurance, 2000 patient
      expect(res.data.financials.insuranceContribution).toBe(2550);
      expect(res.data.financials.patientContribution).toBe(2450);
    });

    it('should reject bill calculation if requested quantity exceeds available stock', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            inventory_id: 10,
            pharmacy_id: 1,
            quantity: 5, // Only 5 in stock
            unit_price: '1000.00',
            expiry_date: '2028-12-31',
            medicine_name: 'Paracetamol',
            batch_number: 'B-10',
          },
        ],
      });

      await expect(
        service.calculateBill(1, {
          paymentCategory: 'PRIVATE',
          items: [{ inventoryId: 10, quantity: 10 }], // requesting 10!
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject dispensing of expired medicine', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            inventory_id: 10,
            pharmacy_id: 1,
            quantity: 50,
            unit_price: '1000.00',
            expiry_date: '2020-01-01', // Expired!
            medicine_name: 'Expired Syrup',
            batch_number: 'B-OLD',
          },
        ],
      });

      await expect(
        service.calculateBill(1, {
          paymentCategory: 'PRIVATE',
          items: [{ inventoryId: 10, quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Create Sale (Section 4, 6, 8)
  // ─────────────────────────────────────────────────────────────
  describe('createSale', () => {
    it('should complete sale, deduct stock, and generate receipt', async () => {
      // 1. Audit user
      mockDb.query.mockResolvedValueOnce({ rows: [{ pharmacy_user_id: 5 }] });
      // 2. Bill calculation query for batch
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            inventory_id: 10,
            pharmacy_id: 1,
            medicine_id: 100,
            batch_number: 'B-001',
            quantity: 50,
            unit_price: '2500.00',
            expiry_date: '2028-12-31',
            medicine_name: 'Amoxicillin 500mg',
          },
        ],
      });

      // 3. Database transaction mock
      mockDb.transaction.mockImplementation(async (cb: any) => {
        const mockClient = {
          query: vi
            .fn()
            .mockResolvedValueOnce({
              // insert sale
              rows: [{ sale_id: 101, receipt_number: 'REC-20261109-A1B2', created_at: new Date() }],
            })
            .mockResolvedValueOnce({ rows: [] }) // insert sale_items
            .mockResolvedValueOnce({
              // update inventory_batches
              rows: [{ inventory_id: 10, quantity: 48, reorder_level: 10 }],
            })
            .mockResolvedValueOnce({ rows: [] }) // insert inventory_transactions
            .mockResolvedValueOnce({ rows: [] }), // insert payment
        };
        return cb(mockClient);
      });

      // 4. getReceipt queries for returned receipt
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              sale_id: 101,
              receipt_number: 'REC-20261109-A1B2',
              pharmacy_name: 'Kigali City Pharmacy',
              phone_number: '+250788123456',
              total_amount: '5000.00',
              net_total_amount: '5000.00',
              patient_contribution: '5000.00',
              insurance_contribution: '0.00',
              amount_paid: '5000.00',
              outstanding_balance: '0.00',
              payment_status: 'PAID',
              sale_status: 'COMPLETED',
              payment_category: 'PRIVATE',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              medicine_name: 'Amoxicillin 500mg',
              batch_number: 'B-001',
              quantity: 2,
              unit_price: '2500.00',
              subtotal: '5000.00',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ payment_method: 'CASH', amount: '5000.00' }],
        });

      const res = await service.createSale(
        1,
        {
          paymentCategory: 'PRIVATE',
          paymentMethod: 'CASH',
          amountPaid: 5000,
          customerName: 'Alice Walkin',
          items: [{ inventoryId: 10, quantity: 2 }],
        },
        'pharmacist@kigali.rw',
      );

      expect(res.success).toBe(true);
      expect(res.data.saleId).toBe(101);
      expect(res.data.paymentStatus).toBe('PAID');
      expect(res.data.receipt).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Sales Cancellation and Refund (Section 15)
  // ─────────────────────────────────────────────────────────────
  describe('refundSale', () => {
    it('should refund sale, restore inventory quantity, and log inventory transaction', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              sale_id: 101,
              receipt_number: 'REC-20261109-A1B2',
              net_total_amount: '5000.00',
              amount_paid: '5000.00',
              payment_status: 'PAID',
              sale_status: 'COMPLETED',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ pharmacy_user_id: 5 }] }); // audit user

      mockDb.transaction.mockImplementation(async (cb: any) => {
        const mockClient = {
          query: vi
            .fn()
            .mockResolvedValueOnce({ rows: [] }) // update sales status to REFUNDED
            .mockResolvedValueOnce({
              // get sale_items
              rows: [
                {
                  sale_item_id: 1,
                  inventory_id: 10,
                  quantity: 2,
                },
              ],
            })
            .mockResolvedValueOnce({ rows: [] }) // update returned_quantity
            .mockResolvedValueOnce({
              // restore inventory_batches
              rows: [{ quantity: 50 }],
            })
            .mockResolvedValueOnce({ rows: [] }) // insert inventory_transactions ADJUSTMENT_INCREASE
            .mockResolvedValueOnce({ rows: [] }) // insert refund payment
            .mockResolvedValueOnce({ rows: [] }), // cancel insurance claim if any
        };
        return cb(mockClient);
      });

      const res = await service.refundSale(1, 101, {
        reason: 'Patient brought unopened medicine back within 1 hour.',
      });

      expect(res.success).toBe(true);
      expect(res.data.restoredItemsCount).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Insurance Claims Management (Section 12)
  // ─────────────────────────────────────────────────────────────
  describe('updateClaimStatus', () => {
    it('should update claim status and record insurance payment when settled', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              claim_id: 5,
              sale_id: 101,
              total_claimed_amount: '3750.00',
              claim_status: 'PENDING',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ pharmacy_user_id: 5 }] });

      mockDb.transaction.mockImplementation(async (cb: any) => {
        const mockClient = {
          query: vi
            .fn()
            .mockResolvedValueOnce({
              // update claim
              rows: [
                {
                  claim_id: 5,
                  claim_status: 'PAID',
                  total_claimed_amount: '3750.00',
                  approved_amount: '3750.00',
                  paid_amount: '3750.00',
                },
              ],
            })
            .mockResolvedValueOnce({ rows: [] }), // record insurance payment
        };
        return cb(mockClient);
      });

      const res = await service.updateClaimStatus(1, 5, {
        claimStatus: 'PAID',
        approvedAmount: 3750,
        paidAmount: 3750,
        paymentReference: 'MMI-SETTLEMENT-9988',
      });

      expect(res.success).toBe(true);
      expect(res.data.claim_status).toBe('PAID');
    });
  });
});

