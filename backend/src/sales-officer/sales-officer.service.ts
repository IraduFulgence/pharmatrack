import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { ApiResponse } from '../common/interfaces/api-response.interface.js';

@Injectable()
export class SalesOfficerService {
  constructor(private readonly db: DatabaseService) {}

  private async getPharmacyId(salesOfficerId: number): Promise<number> {
    const { rows } = await this.db.query(
      'SELECT pharmacy_id FROM public.sales_officers WHERE sales_officer_id = $1',
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
      `SELECT ib.inventory_id, ib.batch_number, ib.quantity, ib.unit_price, ib.purchase_price, ib.selling_price,
              to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry_date, ib.reorder_level, ib.status,
              m.medicine_id, m.medicine_name, m.strength, m.dosage_form
       FROM public.inventory_batches ib
       JOIN public.medicines m ON m.medicine_id = ib.medicine_id
       WHERE ib.pharmacy_id = $1
       ORDER BY ib.expiry_date ASC NULLS LAST`,
      [pharmacyId],
    );
    return { success: true, message: 'Inventory retrieved', data: rows };
  }

  async getSales(salesOfficerId: number): Promise<ApiResponse> {
    const pharmacyId = await this.getPharmacyId(salesOfficerId);
    const { rows } = await this.db.query(
      'SELECT * FROM public.sales WHERE pharmacy_id = $1 ORDER BY created_at DESC',
      [pharmacyId],
    );
    return { success: true, message: 'Sales data retrieved', data: rows };
  }

  async getAssignments(salesOfficerId: number): Promise<ApiResponse> {
    const pharmacyId = await this.getPharmacyId(salesOfficerId);
    try {
      const { rows } = await this.db.query(
        'SELECT * FROM public.pharmacy_assignments WHERE pharmacy_id = $1 ORDER BY created_at DESC',
        [pharmacyId],
      );
      return { success: true, message: 'Assignments retrieved', data: rows };
    } catch {
      return { success: true, message: 'No assignments table; returning empty list', data: [] };
    }
  }
}
