import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { InsuranceService } from './insurance.service.js';
import { DatabaseService } from '../database/database.service.js';

describe('InsuranceService - Pharmacy Data Isolation', () => {
  let service: InsuranceService;
  let mockDb: any;

  beforeEach(() => {
    // Rows inserted so far, so the follow-up SELECT returns what was saved.
    const saved: any[] = [];
    mockDb = {
      query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('CREATE TABLE') || sql.includes('CREATE UNIQUE INDEX')) {
          return { rows: [] };
        }
        if (sql.includes('FROM public.pharmacies')) {
          return { rows: [{ pharmacy_id: params?.[0] }] };
        }
        if (sql.includes('FROM public.insurance_providers WHERE provider_id')) {
          return { rows: [{ provider_id: params?.[0], provider_name: 'RSSB', is_active: true }] };
        }
        if (sql.includes('SELECT pharmacy_insurance_id FROM public.pharmacy_insurances')) {
          // Duplicate check: only a match when this pharmacy already has this insurer.
          return { rows: saved.filter((r) => r.pharmacy_id === String(params?.[0]) && r.insurance_id === String(params?.[1])) };
        }
        if (sql.includes('INSERT INTO public.pharmacy_insurances')) {
          const row = {
            pharmacy_insurance_id: String(10 + saved.length),
            pharmacy_id: String(params?.[0]),
            insurance_id: String(params?.[1]),
            coverage_percentage: String(params?.[2]),
            is_active: true,
            provider_name: 'RSSB',
            default_coverage_percentage: null,
          };
          saved.push(row);
          return { rows: [{ pharmacy_insurance_id: row.pharmacy_insurance_id }] };
        }
        if (sql.includes('WHERE pi.pharmacy_insurance_id = $1')) {
          return { rows: saved.filter((r) => r.pharmacy_insurance_id === String(params?.[0])) };
        }
        return { rows: [] };
      }),
    };
    service = new InsuranceService(mockDb as unknown as DatabaseService);
  });

  describe('createInsurance', () => {
    it('should allow pharmacy 1 to add insurance provider 1', async () => {
      const res = await service.createInsurance(1, {
        insuranceId: 1,
        coveragePercentage: 85,
      });

      expect(res.success).toBe(true);
      expect(res.data.pharmacy_id).toBe(1);
      expect(res.data.insurance_id).toBe(1);
      expect(res.data.coverage_percentage).toBe(85);
    });

    it('should allow pharmacy 2 to independently add the same insurance provider 1', async () => {
      await service.createInsurance(1, { insuranceId: 1, coveragePercentage: 85 });
      const res = await service.createInsurance(2, {
        insuranceId: 1,
        coveragePercentage: 80,
      });

      expect(res.data.pharmacy_id).toBe(2);
      expect(res.data.insurance_id).toBe(1);
      expect(res.data.coverage_percentage).toBe(80);
    });

    it('should reject adding the same provider twice to one pharmacy', async () => {
      await service.createInsurance(1, { insuranceId: 1, coveragePercentage: 85 });
      await expect(
        service.createInsurance(1, { insuranceId: 1, coveragePercentage: 90 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('toggleInsurance and updateInsurance isolation', () => {
    it('should not allow pharmacy 1 to toggle an insurance record belonging to pharmacy 2', async () => {
      mockDb.query = vi.fn().mockResolvedValue({ rows: [] }); // 0 rows updated because pharmacy_id mismatch

      await expect(service.toggleInsurance(1, 999, false)).rejects.toThrow(NotFoundException);
    });

    it('should not allow pharmacy 1 to update an insurance record belonging to pharmacy 2', async () => {
      mockDb.query = vi.fn().mockResolvedValue({ rows: [] }); // 0 rows updated because pharmacy_id mismatch

      await expect(
        service.updateInsurance(1, 999, { coveragePercentage: 90 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
