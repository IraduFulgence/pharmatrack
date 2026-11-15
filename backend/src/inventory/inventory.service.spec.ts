import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { DatabaseService } from '../database/database.service.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';

describe('InventoryService', () => {
  let service: InventoryService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
      transaction: vi.fn(),
    };

    service = new InventoryService(mockDb as unknown as DatabaseService);
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Data Isolation & Access Control (Section 11)
  // ─────────────────────────────────────────────────────────────
  describe('resolvePharmacyId', () => {
    it('should strictly return token sub for PHARMACY role, ignoring requested pharmacyId', async () => {
      const pharmacyUser: JwtPayload = {
        sub: 42,
        email: 'pharmacy@example.com',
        role: 'PHARMACY',
      };

      // Attacker tries to access pharmacy 99
      const resolved = await service.resolvePharmacyId(pharmacyUser, 99);
      expect(resolved).toBe(42);
    });

    it('should allow ADMIN role to specify requested pharmacyId', async () => {
      const adminUser: JwtPayload = {
        sub: 1,
        email: 'admin@pharmatrack.com',
        role: 'ADMIN',
      };

      const resolved = await service.resolvePharmacyId(adminUser, 15);
      expect(resolved).toBe(15);
    });

    it('should throw ForbiddenException if PATIENT role attempts to access inventory', async () => {
      const patientUser: JwtPayload = {
        sub: 10,
        email: 'patient@example.com',
        role: 'PATIENT',
      };

      await expect(service.resolvePharmacyId(patientUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Dashboard Overview (Section 3)
  // ─────────────────────────────────────────────────────────────
  describe('getDashboardOverview', () => {
    it('should calculate and return all required dashboard metrics from DB', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total_medicines: '12' }] }) // 1. medicines count
        .mockResolvedValueOnce({
          rows: [{ total_quantity: '450', total_valuation: '6850.50' }],
        }) // 2. stock & value
        .mockResolvedValueOnce({ rows: [{ low_stock_count: '3' }] }) // 3. low stock
        .mockResolvedValueOnce({ rows: [{ out_of_stock_count: '1' }] }) // 4. out of stock
        .mockResolvedValueOnce({ rows: [{ expired_count: '2' }] }) // 5. expired
        .mockResolvedValueOnce({
          rows: [{ expiring_30: '1', expiring_60: '2', expiring_90: '4' }],
        }) // 6. expiring breakdown
        .mockResolvedValueOnce({ rows: [{ inventory_id: 1, batch_number: 'B1' }] }) // 7. recent batches
        .mockResolvedValueOnce({ rows: [{ transaction_id: 10, transaction_type: 'STOCK_IN' }] }); // 8. recent transactions

      const res = await service.getDashboardOverview(5);

      expect(res.success).toBe(true);
      expect(res.data.summary.totalMedicines).toBe(12);
      expect(res.data.summary.totalStockQuantity).toBe(450);
      expect(res.data.summary.totalInventoryValuation).toBe(6850.5);
      expect(res.data.summary.lowStockCount).toBe(3);
      expect(res.data.summary.outOfStockCount).toBe(1);
      expect(res.data.summary.expiredCount).toBe(2);
      expect(res.data.summary.totalExpiringSoon).toBe(7);
      expect(res.data.summary.expiringBreakdown).toEqual({
        within30Days: 1,
        within60Days: 2,
        within90Days: 4,
      });
      expect(res.data.recentlyAddedBatches).toHaveLength(1);
      expect(res.data.recentActivity).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Central Medicine Catalogue (Section 4)
  // ─────────────────────────────────────────────────────────────
  describe('createMedicine', () => {
    it('should register a new medicine in central catalogue', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // no duplicate
        .mockResolvedValueOnce({
          rows: [
            {
              medicine_id: '99',
              medicine_name: 'Azithromycin 250mg',
              generic_name: 'Azithromycin',
              brand_name: 'Zithromax',
              strength: '250mg',
              dosage_form: 'Tablet',
              requires_prescription: true,
            },
          ],
        });

      const res = await service.createMedicine({
        medicineName: 'Azithromycin 250mg',
        genericName: 'Azithromycin',
        brandName: 'Zithromax',
        strength: '250mg',
        dosageForm: 'Tablet',
        requiresPrescription: true,
      });

      expect(res.success).toBe(true);
      expect(res.data.medicine_name).toBe('Azithromycin 250mg');
    });

    it('should reject duplicate medicine name', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ medicine_id: '1' }] });

      await expect(
        service.createMedicine({
          medicineName: 'Existing Medicine',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Add New Stock / Receive Batch (Section 5)
  // ─────────────────────────────────────────────────────────────
  describe('addStock', () => {
    const validStockDto = {
      medicineId: 1,
      batchNumber: 'BATCH-2026-X',
      quantityReceived: 100,
      unitPrice: 12.5,
      expiryDate: '2028-12-31',
      reorderLevel: 15,
      notes: 'Direct from authorized distributor',
    };

    it('should validate quantity received > 0', async () => {
      await expect(
        service.addStock(1, { ...validStockDto, quantityReceived: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate unit price >= 0', async () => {
      await expect(
        service.addStock(1, { ...validStockDto, unitPrice: -5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject past or expired dates', async () => {
      await expect(
        service.addStock(1, { ...validStockDto, expiryDate: '2020-01-01' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if medicine not in catalogue', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] }); // medicine not found

      await expect(service.addStock(1, validStockDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should successfully add new stock batch and record stock-in transaction', async () => {
      // 1. Medicine lookup
      mockDb.query.mockResolvedValueOnce({
        rows: [{ medicine_id: 1, medicine_name: 'Paracetamol', strength: '500mg' }],
      });
      // 2. Pharmacy lookup
      mockDb.query.mockResolvedValueOnce({
        rows: [{ pharmacy_id: 1, pharmacy_name: 'Kigali Pharmacy', is_active: true }],
      });
      // 3. User lookup for audit
      mockDb.query.mockResolvedValueOnce({
        rows: [{ pharmacy_user_id: 10 }],
      });

      // 4. Transaction callback
      mockDb.transaction.mockImplementation(async (cb: any) => {
        const mockClient = {
          query: vi
            .fn()
            .mockResolvedValueOnce({ rows: [] }) // no existing batch
            .mockResolvedValueOnce({
              // insert batch
              rows: [
                {
                  inventory_id: 101,
                  pharmacy_id: 1,
                  medicine_id: 1,
                  batch_number: 'BATCH-2026-X',
                  quantity: 100,
                  unit_price: '12.50',
                  expiry_date: '2028-12-31',
                  reorder_level: 15,
                  status: 'ACTIVE',
                },
              ],
            })
            .mockResolvedValueOnce({
              // insert transaction
              rows: [
                {
                  transaction_id: 501,
                  transaction_type: 'STOCK_IN',
                  quantity: 100,
                  previous_quantity: 0,
                  new_quantity: 100,
                  reason: 'New stock received',
                },
              ],
            })
            .mockResolvedValueOnce({ rows: [] }), // notification
        };
        return cb(mockClient);
      });

      const res = await service.addStock(1, validStockDto, 'pharmacist@kigali.rw');

      expect(res.success).toBe(true);
      expect(res.data.batch.quantity).toBe(100);
      expect(res.data.transaction.transaction_type).toBe('STOCK_IN');
      expect(res.data.medicine.name).toBe('Paracetamol');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Stock Adjustments (Section 6 & 10)
  // ─────────────────────────────────────────────────────────────
  describe('adjustStock', () => {
    it('should reject adjustment if batch does not belong to pharmacy', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] }); // batch not found for this pharmacy

      await expect(
        service.adjustStock(1, {
          inventoryId: 99,
          adjustmentType: 'DAMAGED',
          quantity: 5,
          reason: 'Broken bottle',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject reduction that would result in negative stock', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            inventory_id: 10,
            pharmacy_id: 1,
            medicine_id: 1,
            batch_number: 'B1',
            quantity: 5, // only 5 available
            unit_price: 10,
            reorder_level: 10,
            status: 'ACTIVE',
            medicine_name: 'Paracetamol',
          },
        ],
      });

      await expect(
        service.adjustStock(1, {
          inventoryId: 10,
          adjustmentType: 'DECREASE',
          quantity: 10, // attempting to reduce by 10!
          reason: 'Stock count adjustment',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully perform DAMAGED stock adjustment and record transaction', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              inventory_id: 10,
              pharmacy_id: 1,
              medicine_id: 1,
              batch_number: 'B1',
              quantity: 50,
              unit_price: 10,
              reorder_level: 10,
              status: 'ACTIVE',
              medicine_name: 'Paracetamol',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ pharmacy_user_id: 5 }] }); // audit user

      mockDb.transaction.mockImplementation(async (cb: any) => {
        const mockClient = {
          query: vi
            .fn()
            .mockResolvedValueOnce({
              // update batch
              rows: [
                {
                  inventory_id: 10,
                  quantity: 45,
                  status: 'ACTIVE',
                },
              ],
            })
            .mockResolvedValueOnce({
              // insert transaction
              rows: [
                {
                  transaction_id: 999,
                  transaction_type: 'ADJUSTMENT_DAMAGED',
                  quantity: 5,
                  previous_quantity: 50,
                  new_quantity: 45,
                  reason: 'Water spill damage',
                },
              ],
            }),
        };
        return cb(mockClient);
      });

      const res = await service.adjustStock(1, {
        inventoryId: 10,
        adjustmentType: 'DAMAGED',
        quantity: 5,
        reason: 'Water spill damage',
      });

      expect(res.success).toBe(true);
      expect(res.data.batch.quantity).toBe(45);
      expect(res.data.transaction.transaction_type).toBe('ADJUSTMENT_DAMAGED');
    });

    it('should set status to DEPLETED when quantity reaches 0', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              inventory_id: 10,
              pharmacy_id: 1,
              medicine_id: 1,
              batch_number: 'B1',
              quantity: 5,
              unit_price: 10,
              reorder_level: 10,
              status: 'ACTIVE',
              medicine_name: 'Paracetamol',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ pharmacy_user_id: 5 }] });

      mockDb.transaction.mockImplementation(async (cb: any) => {
        const mockClient = {
          query: vi
            .fn()
            .mockResolvedValueOnce({
              rows: [{ inventory_id: 10, quantity: 0, status: 'DEPLETED' }],
            })
            .mockResolvedValueOnce({
              rows: [{ transaction_id: 1000, new_quantity: 0 }],
            })
            .mockResolvedValueOnce({ rows: [] }), // out of stock notification
        };
        return cb(mockClient);
      });

      const res = await service.adjustStock(1, {
        inventoryId: 10,
        adjustmentType: 'EXPIRED',
        quantity: 5,
        reason: 'Disposal of expired units',
      });

      expect(res.success).toBe(true);
      expect(res.data.batch.quantity).toBe(0);
      expect(res.data.batch.status).toBe('DEPLETED');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Reports Generation (Section 9)
  // ─────────────────────────────────────────────────────────────
  describe('generateReport', () => {
    it('should generate CURRENT_STOCK report with valuation summary', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            inventory_id: 1,
            medicine_name: 'Amoxicillin 500mg',
            batch_number: 'B-100',
            quantity: '50',
            unit_price: '20.00',
            total_value: '1000.00',
          },
          {
            inventory_id: 2,
            medicine_name: 'Ibuprofen 400mg',
            batch_number: 'B-200',
            quantity: '20',
            unit_price: '15.00',
            total_value: '300.00',
          },
        ],
      });

      const result = await service.generateReport(1, {
        reportType: 'CURRENT_STOCK',
      });

      expect(result.response.success).toBe(true);
      expect(result.response.data.summary.totalBatches).toBe(2);
      expect(result.response.data.summary.totalQuantity).toBe(70);
      expect(result.response.data.summary.totalValuation).toBe(1300);
      expect(result.csvString).toBeUndefined();
    });

    it('should export CSV format when exportFormat is csv', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            inventory_id: 1,
            medicine_name: 'Amoxicillin 500mg',
            batch_number: 'B-100',
            quantity: 50,
            unit_price: 20,
            total_value: 1000,
          },
        ],
      });

      const result = await service.generateReport(1, {
        reportType: 'CURRENT_STOCK',
        exportFormat: 'csv',
      });

      expect(result.csvString).toBeDefined();
      expect(result.csvString).toContain('medicine_name');
      expect(result.csvString).toContain('Amoxicillin 500mg');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 9. Bulk Import & Templates
  // ─────────────────────────────────────────────────────────────
  describe('Bulk Import & Templates', () => {
    it('should generate CSV import template', () => {
      const template = service.downloadImportTemplate('csv');
      expect(template.contentType).toBe('text/csv');
      expect(template.filename).toBe('inventory-import-template.csv');
      expect(template.buffer.toString()).toContain('Medicine name');
      expect(template.buffer.toString()).toContain('Selling price');
    });

    it('should generate Excel import template', () => {
      const template = service.downloadImportTemplate('xlsx');
      expect(template.contentType).toContain('spreadsheetml');
      expect(template.filename).toBe('inventory-import-template.xlsx');
      expect(template.buffer.length).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 10. Product Packaging Management
  // ─────────────────────────────────────────────────────────────
  describe('Product Packaging Management', () => {
    it('should retrieve packaging units for a medicine', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ medicine_id: 10 }] })
        .mockResolvedValueOnce({
          rows: [
            {
              packaging_id: 1,
              medicine_id: 10,
              package_name: 'Carton',
              package_unit: 'Carton',
              units_per_package: 100,
              price_per_package: '15000',
              is_default: true,
            },
          ],
        });

      const res = await service.getPackaging(10);
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.data[0].package_name).toBe('Carton');
      expect(res.data[0].units_per_package).toBe(100);
    });

    it('should create a packaging unit for a medicine', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ medicine_id: 10 }] }) // medicine exists
        .mockResolvedValueOnce({
          rows: [
            {
              packaging_id: 2,
              medicine_id: 10,
              package_name: 'Box',
              package_unit: 'Box',
              units_per_package: 20,
              price_per_package: '3000',
              is_default: false,
            },
          ],
        });

      const res = await service.createPackaging(10, {
        packageName: 'Box',
        packageUnit: 'Box',
        unitsPerPackage: 20,
        pricePerPackage: 3000,
      });

      expect(res.success).toBe(true);
      expect(res.data.package_name).toBe('Box');
      expect(res.data.units_per_package).toBe(20);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 11. Multi-Format Inventory Export
  // ─────────────────────────────────────────────────────────────
  describe('Multi-Format Inventory Export', () => {
    it('should export inventory in CSV format', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ pharmacy_name: 'Test Pharmacy' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              medicine_name: 'Paracetamol 500mg',
              generic_name: 'Paracetamol',
              brand_name: 'Panadol',
              strength: '500mg',
              dosage_form: 'Tablet',
              batch_number: 'B-001',
              quantity_available: 150,
              purchase_price: 50,
              selling_price: 100,
              reorder_level: 20,
              expiry_date: '2027-12-31',
              status: 'ACTIVE',
            },
          ],
        });

      const csvExport = await service.exportInventory(1, {}, 'csv');
      expect(csvExport.filename).toContain('.csv');
      expect(csvExport.buffer.toString()).toContain('Paracetamol 500mg');
    });
  });
});

