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
 * accepted insurance providers. It expects the table `public.pharmacy_insurances`
 * to exist. If it is missing (e.g., on a fresh dev database), the constructor
 * will create it automatically to avoid the runtime "relation does not exist"
 * error. The foreign‑key column is detected dynamically to match the actual
 * schema of `insurance_providers`.
 */
@Injectable()
export class InsuranceService {
  constructor(private readonly db: DatabaseService) {
    // Ensure the required table exists – safe to run on every start.
    this.ensureTableExists();
  }

  /**
   * Retrieves the primary‑key column name of the `insurance_providers` table.
   * This makes the migration robust against schema variations (e.g., `id`
   * vs `insurance_id`).
   */
  private async getInsuranceProviderPkColumn(): Promise<string> {
    const result = await this.db.query(
      `SELECT a.attname AS column_name
         FROM pg_index i
         JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = 'public.insurance_providers'::regclass
          AND i.indisprimary;`,
    );
    if (result.rows.length === 0) {
      throw new Error('Unable to determine primary key of insurance_providers');
    }
    return result.rows[0].column_name; // e.g. "insurance_id" or "id"
  }

  /**
   * Creates the `pharmacy_insurances` table if it does not already exist.
   * The foreign‑key references the dynamically‑determined primary‑key column
   * of `insurance_providers`.
   */
  private async ensureTableExists(): Promise<void> {
    const pkColumn = await this.getInsuranceProviderPkColumn();
    const query = `CREATE TABLE IF NOT EXISTS public.pharmacy_insurances (
      pharmacy_insurance_id SERIAL PRIMARY KEY,
      pharmacy_id INT NOT NULL REFERENCES public.pharmacies (pharmacy_id) ON DELETE CASCADE,
      insurance_id INT NOT NULL REFERENCES public.insurance_providers (${pkColumn}) ON DELETE RESTRICT,
      coverage_percentage NUMERIC(5,2) NOT NULL CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
    await this.db.query(query);
  }

  async createInsurance(pharmacyId: number, dto: CreatePharmacyInsuranceDto) {
    const { insuranceId, coveragePercentage } = dto;
    // Verify pharmacy exists
    const pharmacy = await this.db.query('SELECT pharmacy_id FROM public.pharmacies WHERE pharmacy_id = $1', [pharmacyId]);
    if (pharmacy.rows.length === 0) {
      throw new NotFoundException('Pharmacy not found');
    }
    // Verify insurance provider exists (use generic PK column name)
    const pkCol = await this.getInsuranceProviderPkColumn();
    const ins = await this.db.query(`SELECT * FROM public.insurance_providers WHERE ${pkCol} = $1`, [insuranceId]);
    if (ins.rows.length === 0) {
      throw new NotFoundException('Insurance provider not found');
    }
    // Insert
    const result = await this.db.query(
      `INSERT INTO public.pharmacy_insurances
         (pharmacy_id, insurance_id, coverage_percentage, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [pharmacyId, insuranceId, coveragePercentage],
    );
    return result.rows[0];
  }

  async updateInsurance(id: number, dto: UpdatePharmacyInsuranceDto) {
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
    values.push(id);
    const query = `UPDATE public.pharmacy_insurances SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE pharmacy_insurance_id = $${idx} RETURNING *`;
    const result = await this.db.query(query, values);
    if (result.rows.length === 0) {
      throw new NotFoundException('Insurance configuration not found');
    }
    return result.rows[0];
  }

  async getInsurances(pharmacyId: number) {
    return this.findByPharmacy(pharmacyId);
  }

  async toggleInsurance(id: number, isActive: boolean) {
    // Verify the insurance configuration exists
    const check = await this.db.query('SELECT pharmacy_insurance_id FROM public.pharmacy_insurances WHERE pharmacy_insurance_id = $1', [id]);
    if (check.rows.length === 0) {
      throw new NotFoundException('Insurance configuration not found');
    }
    const result = await this.db.query(
      `UPDATE public.pharmacy_insurances SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE pharmacy_insurance_id = $2 RETURNING *`,
      [isActive, id],
    );
    return result.rows[0];
  }

  async findByPharmacy(pharmacyId: number) {
    const result = await this.db.query(
      'SELECT * FROM public.pharmacy_insurances WHERE pharmacy_id = $1',
      [pharmacyId],
    );
    return result.rows;
  }

}
