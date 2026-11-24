import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { InsuranceService } from './insurance.service.js';
import { DatabaseService } from '../database/database.service.js';

describe('InsuranceService - Pharmacy Data Isolation', () => {
  let service: InsuranceService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('pg_attribute') || sql.includes('pg_index')) {
          return { rows: [{ column_name: 'provider_id' }] };
        }
        if (sql.includes('CREATE TABLE')) {
          return { rows: [] };
        }
        if (sql.includes('SELECT pharmacy_id FROM public.pharmacies')) {
          return { rows: [{ pharmacy_id: params?.[0] }] };
        }
        if (sql.includes('SELECT * FROM public.insurance_providers')) {
          return { rows: [{ provider_id: params?.[0], provider_name: 'RSSB' }] };
        }
        if (sql.includes('INSERT INTO public.pharmacy_insurances')) {
          return {
            rows: [
              {
                pharmacy_insurance_id: '10',
                pharmacy_id: String(params?.[0]),
                insurance_id: String(params?.[1]),
                coverage_percentage: String(params?.[2]),
                is_active: true,
              },
            ],
          };
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

      expect(res.pharmacy_id).toBe('1');
      expect(res.insurance_id).toBe('1');
    });

    it('should allow pharmacy 2 to independently add the same insurance provider 1', async () => {
      const res = await service.createInsurance(2, {
        insuranceId: 1,
        coveragePercentage: 80,
      });

      expect(res.pharmacy_id).toBe('2');
      expect(res.insurance_id).toBe('1');
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
