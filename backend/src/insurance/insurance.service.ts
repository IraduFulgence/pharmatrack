// src/insurance/insurance.service.ts
// ------------------------------------------------------------
// Insurance service – the insurers a pharmacy accepts (pharmacy_insurances)
// ------------------------------------------------------------

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { CreatePharmacyInsuranceDto } from './dto/create-pharmacy-insurance.dto.js';
import type { UpdatePharmacyInsuranceDto } from './dto/update-pharmacy-insurance.dto.js';
import type { ApiResponse } from '../common/interfaces/api-response.interface.js';

const SELECT_CONFIG = `
  SELECT
    pi.pharmacy_insurance_id,
    pi.pharmacy_id,
    pi.insurance_id,
    ip.provider_name,
    ip.provider_code,
    ip.default_coverage_percentage,
    ip.is_active AS provider_is_active,
    pi.coverage_percentage,
    pi.is_active,
    to_char(pi.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
    to_char(pi.updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at
  FROM public.pharmacy_insurances pi
  JOIN public.insurance_providers ip ON ip.provider_id = pi.insurance_id
`;

const toConfig = (r: any) => ({
  ...r,
  pharmacy_insurance_id: Number(r.pharmacy_insurance_id),
  pharmacy_id: Number(r.pharmacy_id),
  insurance_id: Number(r.insurance_id),
  coverage_percentage: Number(r.coverage_percentage),
  default_coverage_percentage:
    r.default_coverage_percentage === null ? null : Number(r.default_coverage_percentage),
});

@Injectable()
export class InsuranceService {
  private readonly logger = new Logger(InsuranceService.name);

  constructor(private readonly db: DatabaseService) {
    // Make sure the table exists; never crash the app if this fails.
    this.ensureTableExists().catch((err) =>
      this.logger.error(`Could not prepare pharmacy_insurances: ${err?.message || err}`),
    );
  }

  private async ensureTableExists(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS public.pharmacy_insurances (
        pharmacy_insurance_id SERIAL PRIMARY KEY,
        pharmacy_id INT NOT NULL REFERENCES public.pharmacies (pharmacy_id) ON DELETE CASCADE,
        insurance_id INT NOT NULL REFERENCES public.insurance_providers (provider_id) ON DELETE RESTRICT,
        coverage_percentage NUMERIC(5,2) NOT NULL CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // One row per pharmacy + insurer.
    await this.db.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_pharmacy_insurance ON public.pharmacy_insurances (pharmacy_id, insurance_id)',
    );
  }

  async getInsurances(pharmacyId: number): Promise<ApiResponse> {
    const res = await this.db.query(
      `${SELECT_CONFIG} WHERE pi.pharmacy_id = $1 ORDER BY pi.is_active DESC, ip.provider_name ASC`,
      [pharmacyId],
    );
    return {
      success: true,
      message: 'Insurance configurations retrieved successfully.',
      data: res.rows.map(toConfig),
    };
  }

  async getAvailableProviders(pharmacyId: number): Promise<ApiResponse> {
    const res = await this.db.query(
      `SELECT ip.provider_id, ip.provider_name, ip.provider_code, ip.default_coverage_percentage,
              (pi.pharmacy_insurance_id IS NOT NULL) AS already_added
       FROM public.insurance_providers ip
       LEFT JOIN public.pharmacy_insurances pi
         ON pi.insurance_id = ip.provider_id AND pi.pharmacy_id = $1
       WHERE ip.is_active = true
       ORDER BY ip.provider_name ASC`,
      [pharmacyId],
    );
    return {
      success: true,
      message: 'Insurance providers retrieved successfully.',
      data: res.rows.map((r: any) => ({
        ...r,
        provider_id: Number(r.provider_id),
        default_coverage_percentage:
          r.default_coverage_percentage === null ? null : Number(r.default_coverage_percentage),
      })),
    };
  }

  async createInsurance(pharmacyId: number, dto: CreatePharmacyInsuranceDto): Promise<ApiResponse> {
    const { insuranceId, coveragePercentage } = dto;

    const pharmacy = await this.db.query('SELECT pharmacy_id FROM public.pharmacies WHERE pharmacy_id = $1', [pharmacyId]);
    if (pharmacy.rows.length === 0) {
      throw new NotFoundException('Pharmacy not found.');
    }

    const provider = await this.db.query(
      'SELECT provider_id, provider_name, is_active FROM public.insurance_providers WHERE provider_id = $1',
      [insuranceId],
    );
    if (provider.rows.length === 0) {
      throw new NotFoundException('Insurance provider not found.');
    }
    if (provider.rows[0].is_active === false) {
      throw new BadRequestException(`${provider.rows[0].provider_name} is not currently active in PharmaTrack.`);
    }

    const existing = await this.db.query(
      'SELECT pharmacy_insurance_id FROM public.pharmacy_insurances WHERE pharmacy_id = $1 AND insurance_id = $2',
      [pharmacyId, insuranceId],
    );
    if (existing.rows.length > 0) {
      throw new ConflictException(
        `${provider.rows[0].provider_name} is already set up for this pharmacy. Edit its coverage instead.`,
      );
    }

    const inserted = await this.db.query(
      `INSERT INTO public.pharmacy_insurances (pharmacy_id, insurance_id, coverage_percentage, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING pharmacy_insurance_id`,
      [pharmacyId, insuranceId, coveragePercentage],
    );
    const row = await this.db.query(`${SELECT_CONFIG} WHERE pi.pharmacy_insurance_id = $1`, [
      inserted.rows[0].pharmacy_insurance_id,
    ]);

    return {
      success: true,
      message: `${provider.rows[0].provider_name} added.`,
      data: toConfig(row.rows[0]),
    };
  }

  async updateInsurance(pharmacyId: number, id: number, dto: UpdatePharmacyInsuranceDto): Promise<ApiResponse> {
    const fields: string[] = [];
    const values: any[] = [];
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
      throw new BadRequestException('Send coveragePercentage and/or isActive to update.');
    }
    values.push(id, pharmacyId);
    const result = await this.db.query(
      `UPDATE public.pharmacy_insurances
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE pharmacy_insurance_id = $${idx} AND pharmacy_id = $${idx + 1}
       RETURNING pharmacy_insurance_id`,
      values,
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Insurance configuration not found for this pharmacy.');
    }
    const row = await this.db.query(`${SELECT_CONFIG} WHERE pi.pharmacy_insurance_id = $1`, [id]);
    return {
      success: true,
      message: 'Insurance configuration updated.',
      data: toConfig(row.rows[0]),
    };
  }

  /** Kept for callers of the old name. */
  async toggleInsurance(pharmacyId: number, id: number, isActive: boolean): Promise<ApiResponse> {
    return this.updateInsurance(pharmacyId, id, { isActive });
  }
}
