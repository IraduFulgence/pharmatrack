// src/insurance/insurance.service.ts
// ------------------------------------------------------------
// Insurance service – handles CRUD for pharmacy_insurances
// ------------------------------------------------------------

import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { CreatePharmacyInsuranceDto } from './dto/create-pharmacy-insurance.dto.js';
import type { UpdatePharmacyInsuranceDto } from './dto/update-pharmacy-insurance.dto.js';

/**
 * Service responsible for managing the relationship between a pharmacy and its
 * accepted insurance providers. Enforces strict pharmacy-level tenant isolation.
 */
@Injectable()
export class InsuranceService {
  constructor(private readonly db: DatabaseService) {
    // Ensure the required table and unique constraint exist – safe to run on every start.
    this.ensureTableExists();
  }

  /**
   * Retrieves the primary‑key column name of the `insurance_providers` table.
   */
  private async getInsuranceProviderPkColumn(): Promise<string> {
    try {
      const result = await this.db.query(
        `SELECT a.attname AS column_name
           FROM pg_index i
           JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = 'public.insurance_providers'::regclass
            AND i.indisprimary;`,
      );
      if (result.rows.length > 0) {
        return result.rows[0].column_name;
      }
    } catch {
      // Fallback if table reflection isn't available
    }
    return 'provider_id';
  }

  /**
   * Creates the `pharmacy_insurances` table if it does not already exist with isolated keys.
   */
  private async ensureTableExists(): Promise<void> {
    try {
      const pkColumn = await this.getInsuranceProviderPkColumn();
      const query = `CREATE TABLE IF NOT EXISTS public.pharmacy_insurances (
        pharmacy_insurance_id SERIAL PRIMARY KEY,
        pharmacy_id INT NOT NULL REFERENCES public.pharmacies (pharmacy_id) ON DELETE CASCADE,
        insurance_id INT NOT NULL REFERENCES public.insurance_providers (${pkColumn}) ON DELETE RESTRICT,
        coverage_percentage NUMERIC(5,2) NOT NULL CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_pharmacy_insurances UNIQUE (pharmacy_id, insurance_id)
      );
      DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_pharmacy_insurances') THEN ALTER TABLE public.pharmacy_insurances ADD CONSTRAINT uq_pharmacy_insurances UNIQUE (pharmacy_id, insurance_id); END IF; END $$;
      CREATE INDEX IF NOT EXISTS idx_pharmacy_insurances_pharmacy ON public.pharmacy_insurances (pharmacy_id);`;
      await this.db.query(query);
    } catch {
      // safe fallback
    }
  }

  async createInsurance(pharmacyId: number, dto: CreatePharmacyInsuranceDto) {
    const { insuranceId, coveragePercentage } = dto;
    // Verify pharmacy exists
    const pharmacy = await this.db.query('SELECT pharmacy_id FROM public.pharmacies WHERE pharmacy_id = $1', [pharmacyId]);
    if (pharmacy.rows.length === 0) {
      throw new NotFoundException('Pharmacy not found');
    }
    // Verify insurance provider exists
    const pkCol = await this.getInsuranceProviderPkColumn();
    const ins = await this.db.query(`SELECT * FROM public.insurance_providers WHERE ${pkCol} = $1`, [insuranceId]);
    if (ins.rows.length === 0) {
      throw new NotFoundException('Insurance provider not found');
    }
    // Insert with ON CONFLICT (pharmacy_id, insurance_id) to allow independent configs per pharmacy
    const result = await this.db.query(
      `INSERT INTO public.pharmacy_insurances
         (pharmacy_id, insurance_id, coverage_percentage, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (pharmacy_id, insurance_id) DO UPDATE
       SET coverage_percentage = EXCLUDED.coverage_percentage,
           is_active = true,
           updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [pharmacyId, insuranceId, coveragePercentage],
    );
    return result.rows[0];
  }

  async updateInsurance(pharmacyId: number, id: number, dto: UpdatePharmacyInsuranceDto) {
    const fields = [];
    const values = [];
    let idx = 1;
    if (dto.coveragePercentage !== undefined) {
      fields.push(`coverage_percentage = $${idx++}`);
      values.push(dto.coveragePercentage);
    }
    if (dto.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(dto.isActive);
    }
    if (fields.length === 0) {
      throw new BadRequestException('No fields to update');
    }
    values.push(id, pharmacyId);
    const query = `UPDATE public.pharmacy_insurances SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE pharmacy_insurance_id = $${idx++} AND pharmacy_id = $${idx++} RETURNING *`;
    const result = await this.db.query(query, values);
    if (result.rows.length === 0) {
      throw new NotFoundException('Insurance configuration not found for this pharmacy');
    }
    return result.rows[0];
  }

  async getInsurances(pharmacyId: number) {
    return this.findByPharmacy(pharmacyId);
  }

  async toggleInsurance(pharmacyId: number, id: number, isActive: boolean) {
    const result = await this.db.query(
      `UPDATE public.pharmacy_insurances SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE pharmacy_insurance_id = $2 AND pharmacy_id = $3 RETURNING *`,
      [isActive, id, pharmacyId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Insurance configuration not found for this pharmacy');
    }
    return result.rows[0];
  }

  async findByPharmacy(pharmacyId: number) {
    const result = await this.db.query(
      `SELECT pi.*, ip.provider_name, ip.provider_code, ip.contact_email, ip.contact_phone, ip.default_coverage_percentage
       FROM public.pharmacy_insurances pi
       JOIN public.insurance_providers ip ON ip.provider_id = pi.insurance_id
       WHERE pi.pharmacy_id = $1
       ORDER BY ip.provider_name ASC`,
      [pharmacyId],
    );
    return result.rows;
  }
}
