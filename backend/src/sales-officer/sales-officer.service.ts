import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { ApiResponse } from '../common/interfaces/api-response.interface.js';

@Injectable()
export class SalesOfficerService {
  constructor(private readonly db: DatabaseService) {}

  private async getPharmacyId(salesOfficerId: number): Promise<number> {
    const { rows } = await this.db.query(
      'SELECT pharmacy_id FROM sales_officers WHERE sales_officer_id = $1',
      [salesOfficerId],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Sales officer not found');
    }
    return Number(rows[0].pharmacy_id);
  }

  async getInventory(salesOfficerId: number): Promise<ApiResponse> {
    const pharmacyId = await this.getPharmacyId(salesOfficerId);
    const { rows } = await this.db.query(
      'SELECT * FROM public.inventory WHERE pharmacy_id = $1',
      [pharmacyId],
    );
    return { success: true, message: 'Inventory retrieved', data: rows };
  }

  async getSales(salesOfficerId: number): Promise<ApiResponse> {
    const pharmacyId = await this.getPharmacyId(salesOfficerId);
    const { rows } = await this.db.query(
      'SELECT * FROM public.sales WHERE pharmacy_id = $1',
      [pharmacyId],
    );
    return { success: true, message: 'Sales data retrieved', data: rows };
  }

  async getAssignments(salesOfficerId: number): Promise<ApiResponse> {
    const pharmacyId = await this.getPharmacyId(salesOfficerId);
    // Attempt to query a pharmacy_assignments table; if missing, return empty array.
    try {
      const { rows } = await this.db.query(
        'SELECT * FROM pharmacy_assignments WHERE pharmacy_id = $1',
        [pharmacyId],
      );
      return { success: true, message: 'Assignments retrieved', data: rows };
    } catch {
      return { success: true, message: 'No assignments table; returning empty list', data: [] };
    }
  }
}
