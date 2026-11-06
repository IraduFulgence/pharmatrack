import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { AddStockDto } from './dto/add-stock.dto.js';
import type { StockAdjustmentDto } from './dto/stock-adjustment.dto.js';
import type { CreateMedicineDto } from './dto/create-medicine.dto.js';
import type { UpdateMedicineDto } from './dto/update-medicine.dto.js';
import type { UpdateBatchDto } from './dto/update-batch.dto.js';
import type { QueryInventoryDto } from './dto/query-inventory.dto.js';
import type { QueryReportDto } from './dto/query-report.dto.js';
import type { ApiResponse } from '../common/interfaces/api-response.interface.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { jsonToCsv } from './utils/csv-exporter.js';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Helper: Resolves and enforces strict pharmacy-level isolation.
   * If the user is a PHARMACY, their pharmacy_id is strictly locked to their token `sub`.
   * If the user is an ADMIN, they can provide a pharmacyId parameter for multi-tenant management.
   */
  async resolvePharmacyId(user: JwtPayload, requestedPharmacyId?: number): Promise<number> {
    if (user.role === 'PHARMACY') {
      return Number(user.sub);
    }
    if (user.role === 'ADMIN') {
      if (requestedPharmacyId) {
        return Number(requestedPharmacyId);
      }
      // If admin doesn't provide a pharmacyId, find the first available pharmacy
      const res = await this.db.query('SELECT pharmacy_id FROM public.pharmacies ORDER BY pharmacy_id ASC LIMIT 1');
      if (res.rows.length === 0) {
        throw new NotFoundException('No pharmacies exist in the system.');
      }
      return Number(res.rows[0].pharmacy_id);
    }
    throw new ForbiddenException('Access denied. Only pharmacy staff or administrators can access inventory.');
  }

  /**
   * Helper: Find a pharmacy_user_id for audit logs from the authenticated user
   */
  private async getPharmacyUserId(pharmacyId: number, email?: string): Promise<number | null> {
    if (email) {
      const userRes = await this.db.query(
        'SELECT pharmacy_user_id FROM public.pharmacy_users WHERE pharmacy_id = $1 AND LOWER(email) = $2 LIMIT 1',
        [pharmacyId, email.toLowerCase()],
      );
      if (userRes.rows.length > 0) {
        return Number(userRes.rows[0].pharmacy_user_id);
      }
    }
    // Fallback: get the primary/owner user for this pharmacy
    const ownerRes = await this.db.query(
      'SELECT pharmacy_user_id FROM public.pharmacy_users WHERE pharmacy_id = $1 ORDER BY pharmacy_user_id ASC LIMIT 1',
      [pharmacyId],
    );
    return ownerRes.rows.length > 0 ? Number(ownerRes.rows[0].pharmacy_user_id) : null;
  }

  // =========================================================================
  // 1. DASHBOARD OVERVIEW (Section 3)
  // =========================================================================

  async getDashboardOverview(pharmacyId: number): Promise<ApiResponse> {
    // 1. Total distinct medicines in pharmacy
    const medCountRes = await this.db.query(
      'SELECT COUNT(DISTINCT medicine_id) AS total_medicines FROM public.inventory_batches WHERE pharmacy_id = $1',
      [pharmacyId],
    );
    const totalMedicines = Number(medCountRes.rows[0]?.total_medicines || 0);

    // 2. Total available stock & total valuation
    const stockRes = await this.db.query(
      `SELECT 
        COALESCE(SUM(quantity), 0) AS total_quantity,
        COALESCE(SUM(quantity * unit_price), 0) AS total_valuation
       FROM public.inventory_batches 
       WHERE pharmacy_id = $1 AND quantity > 0`,
      [pharmacyId],
    );
    const totalStockQuantity = Number(stockRes.rows[0]?.total_quantity || 0);
    const totalInventoryValuation = Number(Number(stockRes.rows[0]?.total_valuation || 0).toFixed(2));

    // 3. Low-stock batches (quantity > 0 AND quantity <= reorder_level)
    const lowStockRes = await this.db.query(
      `SELECT COUNT(*) AS low_stock_count
       FROM public.inventory_batches 
       WHERE pharmacy_id = $1 AND quantity > 0 AND quantity <= reorder_level AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)`,
      [pharmacyId],
    );
    const lowStockCount = Number(lowStockRes.rows[0]?.low_stock_count || 0);

    // 4. Out-of-stock batches
    const outOfStockRes = await this.db.query(
      `SELECT COUNT(*) AS out_of_stock_count
       FROM public.inventory_batches 
       WHERE pharmacy_id = $1 AND quantity = 0`,
      [pharmacyId],
    );
    const outOfStockCount = Number(outOfStockRes.rows[0]?.out_of_stock_count || 0);

    // 5. Expired batches
    const expiredRes = await this.db.query(
      `SELECT COUNT(*) AS expired_count
       FROM public.inventory_batches 
       WHERE pharmacy_id = $1 AND expiry_date < CURRENT_DATE`,
      [pharmacyId],
    );
    const expiredCount = Number(expiredRes.rows[0]?.expired_count || 0);

    // 6. Expiring soon: within 30, 60, 90 days
    const expiringSoonRes = await this.db.query(
      `SELECT 
        COUNT(*) FILTER (WHERE expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '30 days') AS expiring_30,
        COUNT(*) FILTER (WHERE expiry_date > CURRENT_DATE + INTERVAL '30 days' AND expiry_date <= CURRENT_DATE + INTERVAL '60 days') AS expiring_60,
        COUNT(*) FILTER (WHERE expiry_date > CURRENT_DATE + INTERVAL '60 days' AND expiry_date <= CURRENT_DATE + INTERVAL '90 days') AS expiring_90
       FROM public.inventory_batches 
       WHERE pharmacy_id = $1 AND quantity > 0`,
      [pharmacyId],
    );
    const expiring30 = Number(expiringSoonRes.rows[0]?.expiring_30 || 0);
    const expiring60 = Number(expiringSoonRes.rows[0]?.expiring_60 || 0);
    const expiring90 = Number(expiringSoonRes.rows[0]?.expiring_90 || 0);
    const totalExpiringSoon = expiring30 + expiring60 + expiring90;

    // 7. Recently added batches (last 5)
    const recentBatchesRes = await this.db.query(
      `SELECT 
        ib.inventory_id,
        ib.batch_number,
        ib.quantity,
        ib.unit_price,
        to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        ib.last_restocked_at,
        m.medicine_id,
        m.medicine_name,
        m.strength,
        m.dosage_form
       FROM public.inventory_batches ib
       JOIN public.medicines m ON m.medicine_id = ib.medicine_id
       WHERE ib.pharmacy_id = $1
       ORDER BY ib.inventory_id DESC
       LIMIT 5`,
      [pharmacyId],
    );

    // 8. Recent inventory transactions / activity (last 10)
    const recentTxRes = await this.db.query(
      `SELECT 
        it.transaction_id,
        it.transaction_type,
        it.quantity,
        it.previous_quantity,
        it.new_quantity,
        it.reason,
        it.created_at,
        ib.batch_number,
        m.medicine_name,
        pu.full_name AS staff_name
       FROM public.inventory_transactions it
       JOIN public.inventory_batches ib ON ib.inventory_id = it.inventory_id
       JOIN public.medicines m ON m.medicine_id = ib.medicine_id
       LEFT JOIN public.pharmacy_users pu ON pu.pharmacy_user_id = it.pharmacy_user_id
       WHERE it.pharmacy_id = $1
       ORDER BY it.transaction_id DESC
       LIMIT 10`,
      [pharmacyId],
    );

    return {
      success: true,
      message: 'Inventory dashboard statistics retrieved successfully.',
      data: {
        summary: {
          totalMedicines,
          totalStockQuantity,
          totalInventoryValuation,
          lowStockCount,
          outOfStockCount,
          expiredCount,
          totalExpiringSoon,
          expiringBreakdown: {
            within30Days: expiring30,
            within60Days: expiring60,
            within90Days: expiring90,
          },
        },
        recentlyAddedBatches: recentBatchesRes.rows,
        recentActivity: recentTxRes.rows,
      },
    };
  }

  // =========================================================================
  // 2. MEDICINES CATALOGUE & PHARMACY INVENTORY (Section 4)
  // =========================================================================

  /**
   * Search central medicines catalogue (for selecting medicines to stock or browse)
   */
  async searchCatalogue(query: {
    search?: string;
    dosageForm?: string;
    requiresPrescription?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        `(medicine_name ILIKE $${paramIdx} OR generic_name ILIKE $${paramIdx} OR brand_name ILIKE $${paramIdx} OR strength ILIKE $${paramIdx})`,
      );
      params.push(term);
      paramIdx++;
    }

    if (query.dosageForm?.trim()) {
      conditions.push(`dosage_form ILIKE $${paramIdx}`);
      params.push(`%${query.dosageForm.trim()}%`);
      paramIdx++;
    }

    if (query.requiresPrescription !== undefined) {
      conditions.push(`requires_prescription = $${paramIdx}`);
      params.push(query.requiresPrescription);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.db.query(
      `SELECT COUNT(*) FROM public.medicines ${whereClause}`,
      params,
    );
    const total = Number(countRes.rows[0].count);

    const listRes = await this.db.query(
      `SELECT medicine_id, medicine_name, generic_name, brand_name, strength, dosage_form, description, requires_prescription, created_at 
       FROM public.medicines 
       ${whereClause} 
       ORDER BY medicine_name ASC 
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset],
    );

    return {
      success: true,
      message: 'Medicines catalogue retrieved successfully.',
      data: {
        medicines: listRes.rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * Register a new medicine in the central catalogue
   */
  async createMedicine(dto: CreateMedicineDto): Promise<ApiResponse> {
    const {
      medicineName,
      genericName,
      brandName,
      strength,
      dosageForm,
      description,
      requiresPrescription = false,
    } = dto;

    const existing = await this.db.query(
      'SELECT medicine_id FROM public.medicines WHERE LOWER(medicine_name) = $1 LIMIT 1',
      [medicineName.trim().toLowerCase()],
    );
    if (existing.rows.length > 0) {
      throw new BadRequestException('A medicine with this name already exists in the catalogue.');
    }

    const res = await this.db.query(
      `INSERT INTO public.medicines 
        (medicine_name, generic_name, brand_name, strength, dosage_form, description, requires_prescription)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING medicine_id, medicine_name, generic_name, brand_name, strength, dosage_form, description, requires_prescription, created_at`,
      [
        medicineName.trim(),
        genericName?.trim() || null,
        brandName?.trim() || null,
        strength?.trim() || null,
        dosageForm?.trim() || null,
        description?.trim() || null,
        Boolean(requiresPrescription),
      ],
    );

    return {
      success: true,
      message: 'Medicine registered in catalogue successfully.',
      data: res.rows[0],
    };
  }

  /**
   * Edit medicine information in central catalogue
   */
  async updateMedicine(medicineId: number, dto: UpdateMedicineDto): Promise<ApiResponse> {
    const check = await this.db.query(
      'SELECT medicine_id FROM public.medicines WHERE medicine_id = $1',
      [medicineId],
    );
    if (check.rows.length === 0) {
      throw new NotFoundException(`Medicine with ID ${medicineId} not found.`);
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (dto.medicineName !== undefined) {
      updates.push(`medicine_name = $${paramIdx++}`);
      params.push(dto.medicineName.trim());
    }
    if (dto.genericName !== undefined) {
      updates.push(`generic_name = $${paramIdx++}`);
      params.push(dto.genericName.trim() || null);
    }
    if (dto.brandName !== undefined) {
      updates.push(`brand_name = $${paramIdx++}`);
      params.push(dto.brandName.trim() || null);
    }
    if (dto.strength !== undefined) {
      updates.push(`strength = $${paramIdx++}`);
      params.push(dto.strength.trim() || null);
    }
    if (dto.dosageForm !== undefined) {
      updates.push(`dosage_form = $${paramIdx++}`);
      params.push(dto.dosageForm.trim() || null);
    }
    if (dto.description !== undefined) {
      updates.push(`description = $${paramIdx++}`);
      params.push(dto.description.trim() || null);
    }
    if (dto.requiresPrescription !== undefined) {
      updates.push(`requires_prescription = $${paramIdx++}`);
      params.push(Boolean(dto.requiresPrescription));
    }

    if (updates.length === 0) {
      throw new BadRequestException('No fields provided to update.');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(medicineId);

    const res = await this.db.query(
      `UPDATE public.medicines SET ${updates.join(', ')} WHERE medicine_id = $${paramIdx} RETURNING *`,
      params,
    );

    return {
      success: true,
      message: 'Medicine updated successfully.',
      data: res.rows[0],
    };
  }

  /**
   * Display all medicines available in the pharmacy's inventory with aggregated stock
   */
  async getPharmacyMedicines(pharmacyId: number, query: QueryInventoryDto): Promise<ApiResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['ib.pharmacy_id = $1'];
    const params: any[] = [pharmacyId];
    let paramIdx = 2;

    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        `(m.medicine_name ILIKE $${paramIdx} OR m.generic_name ILIKE $${paramIdx} OR m.brand_name ILIKE $${paramIdx} OR m.strength ILIKE $${paramIdx})`,
      );
      params.push(term);
      paramIdx++;
    }

    if (query.dosageForm?.trim()) {
      conditions.push(`m.dosage_form ILIKE $${paramIdx}`);
      params.push(`%${query.dosageForm.trim()}%`);
      paramIdx++;
    }

    if (query.requiresPrescription !== undefined) {
      conditions.push(`m.requires_prescription = $${paramIdx}`);
      params.push(query.requiresPrescription);
      paramIdx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Having clause for stock status filter
    let havingClause = '';
    if (query.stockStatus === 'IN_STOCK') {
      havingClause = 'HAVING COALESCE(SUM(ib.quantity), 0) > 0';
    } else if (query.stockStatus === 'LOW_STOCK') {
      havingClause = 'HAVING COALESCE(SUM(ib.quantity), 0) > 0 AND COALESCE(SUM(ib.quantity), 0) <= COALESCE(MIN(ib.reorder_level), 10)';
    } else if (query.stockStatus === 'OUT_OF_STOCK') {
      havingClause = 'HAVING COALESCE(SUM(ib.quantity), 0) = 0';
    }

    // Determine sorting
    let orderBy = 'm.medicine_name ASC';
    if (query.sortBy === 'quantity') {
      orderBy = `total_quantity ${query.sortOrder || 'DESC'}`;
    } else if (query.sortBy === 'expiry') {
      orderBy = `earliest_expiry ${query.sortOrder || 'ASC'} NULLS LAST`;
    }

    const countQuery = `
      SELECT COUNT(*) FROM (
        SELECT m.medicine_id
        FROM public.inventory_batches ib
        JOIN public.medicines m ON m.medicine_id = ib.medicine_id
        ${whereClause}
        GROUP BY m.medicine_id
        ${havingClause}
      ) AS aggregated
    `;
    const countRes = await this.db.query(countQuery, params);
    const total = Number(countRes.rows[0]?.count || 0);

    const dataQuery = `
      SELECT 
        m.medicine_id,
        m.medicine_name,
        m.generic_name,
        m.brand_name,
        m.strength,
        m.dosage_form,
        m.requires_prescription,
        COUNT(ib.inventory_id) AS batch_count,
        COALESCE(SUM(ib.quantity), 0)::INTEGER AS total_quantity,
        MIN(ib.reorder_level) AS min_reorder_level,
        MIN(ib.unit_price) AS min_unit_price,
        MAX(ib.unit_price) AS max_unit_price,
        MIN(ib.expiry_date) AS earliest_expiry,
        CASE 
          WHEN COALESCE(SUM(ib.quantity), 0) = 0 THEN 'OUT_OF_STOCK'
          WHEN COALESCE(SUM(ib.quantity), 0) <= COALESCE(MIN(ib.reorder_level), 10) THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END AS stock_status
      FROM public.inventory_batches ib
      JOIN public.medicines m ON m.medicine_id = ib.medicine_id
      ${whereClause}
      GROUP BY m.medicine_id
      ${havingClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    const listRes = await this.db.query(dataQuery, [...params, limit, offset]);

    return {
      success: true,
      message: 'Pharmacy medicine inventory retrieved successfully.',
      data: {
        medicines: listRes.rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * View complete medicine details and all its batches in this pharmacy (FEFO ordered)
   */
  async getMedicineDetails(pharmacyId: number, medicineId: number): Promise<ApiResponse> {
    const medRes = await this.db.query(
      'SELECT * FROM public.medicines WHERE medicine_id = $1',
      [medicineId],
    );
    if (medRes.rows.length === 0) {
      throw new NotFoundException(`Medicine with ID ${medicineId} not found.`);
    }

    const batchesRes = await this.db.query(
      `SELECT 
        ib.inventory_id,
        ib.batch_number,
        ib.quantity,
        ib.unit_price,
        to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        ib.reorder_level,
        ib.status,
        ib.last_restocked_at,
        ib.updated_at,
        CASE 
          WHEN ib.expiry_date < CURRENT_DATE THEN true 
          ELSE false 
        END AS is_expired,
        (ib.expiry_date - CURRENT_DATE) AS days_until_expiry
       FROM public.inventory_batches ib
       WHERE ib.pharmacy_id = $1 AND ib.medicine_id = $2
       ORDER BY ib.expiry_date ASC NULLS LAST, ib.inventory_id ASC`,
      [pharmacyId, medicineId],
    );

    const totalStock = batchesRes.rows.reduce((sum, b) => sum + Number(b.quantity), 0);

    return {
      success: true,
      message: 'Medicine details retrieved successfully.',
      data: {
        medicine: medRes.rows[0],
        totalAvailableStock: totalStock,
        batchCount: batchesRes.rows.length,
        batches: batchesRes.rows,
      },
    };
  }

  // =========================================================================
  // 3. ADD NEW STOCK / RECEIVE BATCH (Section 5)
  // =========================================================================

  async addStock(
    pharmacyId: number,
    dto: AddStockDto,
    userEmail?: string,
  ): Promise<ApiResponse> {
    const {
      medicineId,
      batchNumber,
      quantityReceived,
      unitPrice,
      expiryDate,
      reorderLevel = 10,
      notes,
    } = dto;

    // 1. Validate quantity > 0
    if (quantityReceived <= 0) {
      throw new BadRequestException('Quantity received must be greater than zero.');
    }

    // 2. Validate unit price >= 0
    if (unitPrice < 0) {
      throw new BadRequestException('Unit price cannot be negative.');
    }

    // 3. Validate expiry date (must be in future)
    const expDate = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(expDate.getTime()) || expDate <= today) {
      throw new BadRequestException('Expiry date must be a valid future date.');
    }

    // 4. Verify medicine exists in central catalogue
    const medRes = await this.db.query(
      'SELECT medicine_id, medicine_name, strength FROM public.medicines WHERE medicine_id = $1',
      [medicineId],
    );
    if (medRes.rows.length === 0) {
      throw new NotFoundException(`Medicine with ID ${medicineId} not found in catalogue.`);
    }
    const medicine = medRes.rows[0];

    // 5. Verify pharmacy exists and is active
    const pharmRes = await this.db.query(
      'SELECT pharmacy_id, pharmacy_name, is_active FROM public.pharmacies WHERE pharmacy_id = $1',
      [pharmacyId],
    );
    if (pharmRes.rows.length === 0 || !pharmRes.rows[0].is_active) {
      throw new ForbiddenException('Pharmacy account not found or is inactive.');
    }

    // 6. Resolve pharmacy user for audit trail
    const pharmacyUserId = await this.getPharmacyUserId(pharmacyId, userEmail);

    // 7. Atomic transaction: create batch, record transaction, notify
    const result = await this.db.transaction(async (client) => {
      // Check if this exact batch number already exists for this pharmacy and medicine
      const existingBatch = await client.query(
        `SELECT inventory_id, quantity, unit_price 
         FROM public.inventory_batches 
         WHERE pharmacy_id = $1 AND medicine_id = $2 AND batch_number = $3 
         LIMIT 1`,
        [pharmacyId, medicineId, batchNumber.trim()],
      );

      let batchRecord: any;
      let prevQuantity = 0;
      let newQuantity = quantityReceived;

      if (existingBatch.rows.length > 0) {
        // If same batch exists, increment existing batch quantity and update restock date
        const eb = existingBatch.rows[0];
        prevQuantity = Number(eb.quantity);
        newQuantity = prevQuantity + quantityReceived;

        const updateRes = await client.query(
          `UPDATE public.inventory_batches 
           SET quantity = $1, unit_price = $2, last_restocked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, status = 'ACTIVE'
           WHERE inventory_id = $3
           RETURNING inventory_id, pharmacy_id, medicine_id, batch_number, quantity, unit_price, to_char(expiry_date, 'YYYY-MM-DD') AS expiry_date, reorder_level, status, last_restocked_at`,
          [newQuantity, unitPrice, eb.inventory_id],
        );
        batchRecord = updateRes.rows[0];
      } else {
        // Insert new batch record
        const insertRes = await client.query(
          `INSERT INTO public.inventory_batches 
            (pharmacy_id, medicine_id, batch_number, quantity, unit_price, expiry_date, reorder_level, last_restocked_at, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, 'ACTIVE')
           RETURNING inventory_id, pharmacy_id, medicine_id, batch_number, quantity, unit_price, to_char(expiry_date, 'YYYY-MM-DD') AS expiry_date, reorder_level, status, last_restocked_at`,
          [pharmacyId, medicineId, batchNumber.trim(), quantityReceived, unitPrice, expiryDate, reorderLevel],
        );
        batchRecord = insertRes.rows[0];
      }

      // Record in inventory_transactions
      const txRes = await client.query(
        `INSERT INTO public.inventory_transactions 
          (inventory_id, pharmacy_id, pharmacy_user_id, transaction_type, quantity, previous_quantity, new_quantity, reason, notes)
         VALUES ($1, $2, $3, 'STOCK_IN', $4, $5, $6, $7, $8)
         RETURNING transaction_id, transaction_type, quantity, previous_quantity, new_quantity, reason, notes, created_at`,
        [
          batchRecord.inventory_id,
          pharmacyId,
          pharmacyUserId,
          quantityReceived,
          prevQuantity,
          newQuantity,
          'New stock received',
          notes?.trim() || null,
        ],
      );

      // Create notification
      await client.query(
        `INSERT INTO public.notifications 
          (pharmacy_id, pharmacy_user_id, notification_type, title, message)
         VALUES ($1, $2, 'GENERAL', $3, $4)`,
        [
          pharmacyId,
          pharmacyUserId,
          `Stock In: ${medicine.medicine_name}`,
          `Added ${quantityReceived} units of ${medicine.medicine_name} (Batch: ${batchNumber.trim()}). Total batch stock: ${newQuantity}.`,
        ],
      );

      return {
        batch: batchRecord,
        transaction: txRes.rows[0],
      };
    });

    return {
      success: true,
      message: 'New stock registered successfully.',
      data: {
        medicine: {
          id: Number(medicine.medicine_id),
          name: medicine.medicine_name,
          strength: medicine.strength,
        },
        batch: result.batch,
        transaction: result.transaction,
      },
    };
  }

  // =========================================================================
  // 4. STOCK ADJUSTMENTS (Section 6 & 10)
  // =========================================================================

  async adjustStock(
    pharmacyId: number,
    dto: StockAdjustmentDto,
    userEmail?: string,
  ): Promise<ApiResponse> {
    const { inventoryId, adjustmentType, quantity, reason, notes } = dto;

    // 1. Verify batch belongs to pharmacy (strict data isolation!)
    const batchRes = await this.db.query(
      `SELECT 
        ib.inventory_id,
        ib.pharmacy_id,
        ib.medicine_id,
        ib.batch_number,
        ib.quantity,
        ib.unit_price,
        ib.reorder_level,
        ib.status,
        m.medicine_name
       FROM public.inventory_batches ib
       JOIN public.medicines m ON m.medicine_id = ib.medicine_id
       WHERE ib.inventory_id = $1 AND ib.pharmacy_id = $2`,
      [inventoryId, pharmacyId],
    );

    if (batchRes.rows.length === 0) {
      throw new NotFoundException(
        `Batch with ID ${inventoryId} not found in your pharmacy's inventory.`,
      );
    }

    const batch = batchRes.rows[0];
    const currentQty = Number(batch.quantity);
    let newQty: number;
    let deltaQty: number;

    switch (adjustmentType) {
      case 'INCREASE':
        if (quantity <= 0) {
          throw new BadRequestException('Adjustment quantity must be greater than zero for INCREASE.');
        }
        deltaQty = quantity;
        newQty = currentQty + quantity;
        break;

      case 'DECREASE':
      case 'DAMAGED':
      case 'EXPIRED':
      case 'LOST':
        if (quantity <= 0) {
          throw new BadRequestException(`Adjustment quantity must be greater than zero for ${adjustmentType}.`);
        }
        if (currentQty - quantity < 0) {
          throw new BadRequestException(
            `Cannot reduce ${quantity} items. Available quantity is only ${currentQty}. Negative stock is prohibited.`,
          );
        }
        deltaQty = quantity;
        newQty = currentQty - quantity;
        break;

      case 'PHYSICAL_COUNT':
        if (quantity < 0) {
          throw new BadRequestException('Physical count quantity cannot be negative.');
        }
        deltaQty = Math.abs(quantity - currentQty);
        newQty = quantity;
        break;

      default:
        throw new BadRequestException(`Unsupported adjustment type: ${adjustmentType}`);
    }

    // Determine status update
    let newStatus = batch.status;
    if (newQty === 0) {
      newStatus = adjustmentType === 'EXPIRED' ? 'EXPIRED' : 'DEPLETED';
    } else if (batch.status === 'DEPLETED' && newQty > 0) {
      newStatus = 'ACTIVE';
    }

    const pharmacyUserId = await this.getPharmacyUserId(pharmacyId, userEmail);

    // Atomic update + transaction record
    const result = await this.db.transaction(async (client) => {
      // 1. Update batch quantity
      const updatedBatchRes = await client.query(
        `UPDATE public.inventory_batches 
         SET quantity = $1, status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE inventory_id = $3
         RETURNING inventory_id, pharmacy_id, medicine_id, batch_number, quantity, unit_price, to_char(expiry_date, 'YYYY-MM-DD') AS expiry_date, reorder_level, status, updated_at`,
        [newQty, newStatus, inventoryId],
      );

      // 2. Record transaction
      const txRes = await client.query(
        `INSERT INTO public.inventory_transactions 
          (inventory_id, pharmacy_id, pharmacy_user_id, transaction_type, quantity, previous_quantity, new_quantity, reason, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING transaction_id, transaction_type, quantity, previous_quantity, new_quantity, reason, notes, created_at`,
        [
          inventoryId,
          pharmacyId,
          pharmacyUserId,
          `ADJUSTMENT_${adjustmentType}`,
          deltaQty,
          currentQty,
          newQty,
          reason.trim(),
          notes?.trim() || null,
        ],
      );

      // 3. Trigger low-stock / out-of-stock notification if threshold breached
      if (newQty === 0) {
        await client.query(
          `INSERT INTO public.notifications 
            (pharmacy_id, pharmacy_user_id, notification_type, title, message)
           VALUES ($1, $2, 'LOW_STOCK', $3, $4)`,
          [
            pharmacyId,
            pharmacyUserId,
            `Out of Stock: ${batch.medicine_name}`,
            `Batch ${batch.batch_number} of ${batch.medicine_name} is now completely out of stock following a ${adjustmentType} adjustment.`,
          ],
        );
      } else if (newQty <= Number(batch.reorder_level)) {
        await client.query(
          `INSERT INTO public.notifications 
            (pharmacy_id, pharmacy_user_id, notification_type, title, message)
           VALUES ($1, $2, 'LOW_STOCK', $3, $4)`,
          [
            pharmacyId,
            pharmacyUserId,
            `Low Stock Warning: ${batch.medicine_name}`,
            `Batch ${batch.batch_number} of ${batch.medicine_name} is low on stock (${newQty} remaining, threshold: ${batch.reorder_level}).`,
          ],
        );
      }

      return {
        batch: updatedBatchRes.rows[0],
        transaction: txRes.rows[0],
      };
    });

    return {
      success: true,
      message: `Stock adjusted successfully (${adjustmentType}).`,
      data: result,
    };
  }

  // =========================================================================
  // 5. BATCH MANAGEMENT (Section 7)
  // =========================================================================

  /**
   * Get all batches for pharmacy with FEFO ordering and search/filters
   */
  async getBatches(pharmacyId: number, query: QueryInventoryDto): Promise<ApiResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['ib.pharmacy_id = $1'];
    const params: any[] = [pharmacyId];
    let paramIdx = 2;

    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        `(ib.batch_number ILIKE $${paramIdx} OR m.medicine_name ILIKE $${paramIdx} OR m.generic_name ILIKE $${paramIdx} OR m.brand_name ILIKE $${paramIdx})`,
      );
      params.push(term);
      paramIdx++;
    }

    if (query.dosageForm?.trim()) {
      conditions.push(`m.dosage_form ILIKE $${paramIdx}`);
      params.push(`%${query.dosageForm.trim()}%`);
      paramIdx++;
    }

    if (query.stockStatus === 'IN_STOCK') {
      conditions.push('ib.quantity > 0');
    } else if (query.stockStatus === 'LOW_STOCK') {
      conditions.push('ib.quantity > 0 AND ib.quantity <= ib.reorder_level');
    } else if (query.stockStatus === 'OUT_OF_STOCK') {
      conditions.push('ib.quantity = 0');
    } else if (query.stockStatus === 'EXPIRED') {
      conditions.push('ib.expiry_date < CURRENT_DATE');
    }

    if (query.expiryStatus === 'VALID') {
      conditions.push('(ib.expiry_date IS NULL OR ib.expiry_date >= CURRENT_DATE)');
    } else if (query.expiryStatus === 'EXPIRING_30') {
      conditions.push("ib.expiry_date >= CURRENT_DATE AND ib.expiry_date <= CURRENT_DATE + INTERVAL '30 days'");
    } else if (query.expiryStatus === 'EXPIRING_60') {
      conditions.push("ib.expiry_date > CURRENT_DATE + INTERVAL '30 days' AND ib.expiry_date <= CURRENT_DATE + INTERVAL '60 days'");
    } else if (query.expiryStatus === 'EXPIRING_90') {
      conditions.push("ib.expiry_date > CURRENT_DATE + INTERVAL '60 days' AND ib.expiry_date <= CURRENT_DATE + INTERVAL '90 days'");
    } else if (query.expiryStatus === 'EXPIRED') {
      conditions.push('ib.expiry_date < CURRENT_DATE');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // FEFO order: First Expired First Out
    let orderBy = 'ib.expiry_date ASC NULLS LAST, ib.inventory_id ASC';
    if (query.sortBy === 'quantity') {
      orderBy = `ib.quantity ${query.sortOrder || 'DESC'}`;
    } else if (query.sortBy === 'name') {
      orderBy = `m.medicine_name ${query.sortOrder || 'ASC'}`;
    } else if (query.sortBy === 'unit_price') {
      orderBy = `ib.unit_price ${query.sortOrder || 'ASC'}`;
    } else if (query.sortBy === 'created_at') {
      orderBy = `ib.inventory_id ${query.sortOrder || 'DESC'}`;
    }

    const countRes = await this.db.query(
      `SELECT COUNT(*) 
       FROM public.inventory_batches ib
       JOIN public.medicines m ON m.medicine_id = ib.medicine_id
       ${whereClause}`,
      params,
    );
    const total = Number(countRes.rows[0].count);

    const listRes = await this.db.query(
      `SELECT 
        ib.inventory_id,
        ib.pharmacy_id,
        ib.medicine_id,
        m.medicine_name,
        m.generic_name,
        m.brand_name,
        m.strength,
        m.dosage_form,
        m.requires_prescription,
        ib.batch_number,
        ib.quantity,
        ib.unit_price,
        to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        ib.reorder_level,
        ib.status,
        ib.last_restocked_at,
        ib.updated_at,
        CASE 
          WHEN ib.expiry_date < CURRENT_DATE THEN true 
          ELSE false 
        END AS is_expired,
        (ib.expiry_date - CURRENT_DATE) AS days_until_expiry,
        (ib.quantity * ib.unit_price) AS batch_valuation
       FROM public.inventory_batches ib
       JOIN public.medicines m ON m.medicine_id = ib.medicine_id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset],
    );

    return {
      success: true,
      message: 'Inventory batches retrieved successfully.',
      data: {
        batches: listRes.rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * View details of a specific batch, including its transaction history
   */
  async getBatchDetails(pharmacyId: number, inventoryId: number): Promise<ApiResponse> {
    const batchRes = await this.db.query(
      `SELECT 
        ib.inventory_id,
        ib.pharmacy_id,
        ib.medicine_id,
        m.medicine_name,
        m.generic_name,
        m.brand_name,
        m.strength,
        m.dosage_form,
        m.requires_prescription,
        ib.batch_number,
        ib.quantity,
        ib.unit_price,
        to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        ib.reorder_level,
        ib.status,
        ib.last_restocked_at,
        ib.updated_at,
        CASE 
          WHEN ib.expiry_date < CURRENT_DATE THEN true 
          ELSE false 
        END AS is_expired,
        (ib.expiry_date - CURRENT_DATE) AS days_until_expiry,
        (ib.quantity * ib.unit_price) AS batch_valuation
       FROM public.inventory_batches ib
       JOIN public.medicines m ON m.medicine_id = ib.medicine_id
       WHERE ib.inventory_id = $1 AND ib.pharmacy_id = $2`,
      [inventoryId, pharmacyId],
    );

    if (batchRes.rows.length === 0) {
      throw new NotFoundException(`Batch with ID ${inventoryId} not found.`);
    }

    const txRes = await this.db.query(
      `SELECT 
        it.transaction_id,
        it.transaction_type,
        it.quantity,
        it.previous_quantity,
        it.new_quantity,
        it.reason,
        it.notes,
        it.created_at,
        pu.full_name AS staff_name
       FROM public.inventory_transactions it
       LEFT JOIN public.pharmacy_users pu ON pu.pharmacy_user_id = it.pharmacy_user_id
       WHERE it.inventory_id = $1
       ORDER BY it.transaction_id DESC`,
      [inventoryId],
    );

    return {
      success: true,
      message: 'Batch details retrieved successfully.',
      data: {
        batch: batchRes.rows[0],
        transactions: txRes.rows,
      },
    };
  }

  /**
   * Update permitted information for an inventory batch (unit price, reorder level, status)
   */
  async updateBatch(
    pharmacyId: number,
    inventoryId: number,
    dto: UpdateBatchDto,
  ): Promise<ApiResponse> {
    const check = await this.db.query(
      'SELECT inventory_id FROM public.inventory_batches WHERE inventory_id = $1 AND pharmacy_id = $2',
      [inventoryId, pharmacyId],
    );
    if (check.rows.length === 0) {
      throw new NotFoundException(`Batch with ID ${inventoryId} not found.`);
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (dto.unitPrice !== undefined) {
      updates.push(`unit_price = $${paramIdx++}`);
      params.push(dto.unitPrice);
    }
    if (dto.reorderLevel !== undefined) {
      updates.push(`reorder_level = $${paramIdx++}`);
      params.push(dto.reorderLevel);
    }
    if (dto.status !== undefined) {
      updates.push(`status = $${paramIdx++}`);
      params.push(dto.status);
    }

    if (updates.length === 0) {
      throw new BadRequestException('No fields provided to update.');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(inventoryId, pharmacyId);

    const res = await this.db.query(
      `UPDATE public.inventory_batches 
       SET ${updates.join(', ')} 
       WHERE inventory_id = $${paramIdx} AND pharmacy_id = $${paramIdx + 1} 
       RETURNING inventory_id, batch_number, quantity, unit_price, to_char(expiry_date, 'YYYY-MM-DD') AS expiry_date, reorder_level, status, updated_at`,
      params,
    );

    return {
      success: true,
      message: 'Batch updated successfully.',
      data: res.rows[0],
    };
  }

  // =========================================================================
  // 6. LOW STOCK & EXPIRY MONITORING & ALERTS (Section 8)
  // =========================================================================

  async getAlerts(pharmacyId: number): Promise<ApiResponse> {
    // 1. Low stock batches
    const lowStock = await this.db.query(
      `SELECT 
        ib.inventory_id,
        ib.batch_number,
        ib.quantity,
        ib.reorder_level,
        to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        m.medicine_id,
        m.medicine_name,
        m.strength
       FROM public.inventory_batches ib
       JOIN public.medicines m ON m.medicine_id = ib.medicine_id
       WHERE ib.pharmacy_id = $1 AND ib.quantity > 0 AND ib.quantity <= ib.reorder_level AND (ib.expiry_date IS NULL OR ib.expiry_date >= CURRENT_DATE)
       ORDER BY ib.quantity ASC`,
      [pharmacyId],
    );

    // 2. Out of stock batches
    const outOfStock = await this.db.query(
      `SELECT 
        ib.inventory_id,
        ib.batch_number,
        ib.quantity,
        m.medicine_id,
        m.medicine_name,
        m.strength
       FROM public.inventory_batches ib
       JOIN public.medicines m ON m.medicine_id = ib.medicine_id
       WHERE ib.pharmacy_id = $1 AND ib.quantity = 0
       ORDER BY m.medicine_name ASC`,
      [pharmacyId],
    );

    // 3. Expired batches
    const expired = await this.db.query(
      `SELECT 
        ib.inventory_id,
        ib.batch_number,
        ib.quantity,
        to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        (CURRENT_DATE - ib.expiry_date) AS days_expired,
        m.medicine_id,
        m.medicine_name,
        m.strength
       FROM public.inventory_batches ib
       JOIN public.medicines m ON m.medicine_id = ib.medicine_id
       WHERE ib.pharmacy_id = $1 AND ib.expiry_date < CURRENT_DATE
       ORDER BY ib.expiry_date ASC`,
      [pharmacyId],
    );

    // 4. Expiring soon in 30, 60, 90 days
    const nearExpiry = await this.db.query(
      `SELECT 
        ib.inventory_id,
        ib.batch_number,
        ib.quantity,
        to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        (ib.expiry_date - CURRENT_DATE) AS days_until_expiry,
        CASE 
          WHEN ib.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN '30_DAYS'
          WHEN ib.expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN '60_DAYS'
          ELSE '90_DAYS'
        END AS urgency_tier,
        m.medicine_id,
        m.medicine_name,
        m.strength
       FROM public.inventory_batches ib
       JOIN public.medicines m ON m.medicine_id = ib.medicine_id
       WHERE ib.pharmacy_id = $1 AND ib.quantity > 0 AND ib.expiry_date >= CURRENT_DATE AND ib.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
       ORDER BY ib.expiry_date ASC`,
      [pharmacyId],
    );

    return {
      success: true,
      message: 'Inventory alerts and warnings retrieved successfully.',
      data: {
        summary: {
          lowStockCount: lowStock.rows.length,
          outOfStockCount: outOfStock.rows.length,
          expiredCount: expired.rows.length,
          nearExpiryCount: nearExpiry.rows.length,
        },
        lowStockItems: lowStock.rows,
        outOfStockItems: outOfStock.rows,
        expiredBatches: expired.rows,
        nearExpiryBatches: nearExpiry.rows,
      },
    };
  }

  /**
   * Get notifications for this pharmacy
   */
  async getNotifications(
    pharmacyId: number,
    query: { page?: number; limit?: number; unreadOnly?: boolean },
  ): Promise<ApiResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['pharmacy_id = $1'];
    const params: any[] = [pharmacyId];

    if (query.unreadOnly) {
      conditions.push('is_read = false');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const unreadRes = await this.db.query(
      'SELECT COUNT(*) FROM public.notifications WHERE pharmacy_id = $1 AND is_read = false',
      [pharmacyId],
    );
    const unreadCount = Number(unreadRes.rows[0].count);

    const countRes = await this.db.query(
      `SELECT COUNT(*) FROM public.notifications ${whereClause}`,
      params,
    );
    const total = Number(countRes.rows[0].count);

    const listRes = await this.db.query(
      `SELECT notification_id, notification_type, title, message, is_read, created_at, read_at 
       FROM public.notifications 
       ${whereClause} 
       ORDER BY notification_id DESC 
       LIMIT $2 OFFSET $3`,
      [pharmacyId, limit, offset],
    );

    return {
      success: true,
      message: 'Notifications retrieved successfully.',
      data: {
        notifications: listRes.rows,
        unreadCount,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * Mark a notification as read
   */
  async markNotificationRead(pharmacyId: number, notificationId: number): Promise<ApiResponse> {
    const res = await this.db.query(
      `UPDATE public.notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP 
       WHERE notification_id = $1 AND pharmacy_id = $2 
       RETURNING notification_id, is_read, read_at`,
      [notificationId, pharmacyId],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException('Notification not found.');
    }
    return {
      success: true,
      message: 'Notification marked as read.',
      data: res.rows[0],
    };
  }

  /**
   * Scan inventory and generate alerts for low stock and near expiry
   */
  async scanAndGenerateAlerts(pharmacyId: number): Promise<ApiResponse> {
    const alerts = await this.getAlerts(pharmacyId);
    const { lowStockItems, expiredBatches, nearExpiryBatches } = alerts.data;

    let createdCount = 0;

    // Generate notifications for low stock (if not notified today)
    for (const item of lowStockItems) {
      const existing = await this.db.query(
        `SELECT notification_id FROM public.notifications 
         WHERE pharmacy_id = $1 AND notification_type = 'LOW_STOCK' AND title LIKE $2 AND created_at >= CURRENT_DATE LIMIT 1`,
        [pharmacyId, `%${item.batch_number}%`],
      );
      if (existing.rows.length === 0) {
        await this.db.query(
          `INSERT INTO public.notifications (pharmacy_id, notification_type, title, message)
           VALUES ($1, 'LOW_STOCK', $2, $3)`,
          [
            pharmacyId,
            `Low Stock: ${item.medicine_name} (${item.batch_number})`,
            `Medicine ${item.medicine_name} batch ${item.batch_number} has ${item.quantity} units remaining (reorder level: ${item.reorder_level}).`,
          ],
        );
        createdCount++;
      }
    }

    // Generate notifications for near expiry (within 30 days)
    for (const item of nearExpiryBatches.filter((b: any) => b.urgency_tier === '30_DAYS')) {
      const existing = await this.db.query(
        `SELECT notification_id FROM public.notifications 
         WHERE pharmacy_id = $1 AND notification_type = 'EXPIRY_REMINDER' AND title LIKE $2 AND created_at >= CURRENT_DATE LIMIT 1`,
        [pharmacyId, `%${item.batch_number}%`],
      );
      if (existing.rows.length === 0) {
        await this.db.query(
          `INSERT INTO public.notifications (pharmacy_id, notification_type, title, message)
           VALUES ($1, 'EXPIRY_REMINDER', $2, $3)`,
          [
            pharmacyId,
            `Expiring Soon: ${item.medicine_name} (${item.batch_number})`,
            `Batch ${item.batch_number} of ${item.medicine_name} expires on ${item.expiry_date} (${item.days_until_expiry} days remaining).`,
          ],
        );
        createdCount++;
      }
    }

    // Generate notifications for expired batches
    for (const item of expiredBatches) {
      const existing = await this.db.query(
        `SELECT notification_id FROM public.notifications 
         WHERE pharmacy_id = $1 AND notification_type = 'EXPIRY_REMINDER' AND title LIKE $2 AND created_at >= CURRENT_DATE LIMIT 1`,
        [pharmacyId, `%${item.batch_number}%`],
      );
      if (existing.rows.length === 0) {
        await this.db.query(
          `INSERT INTO public.notifications (pharmacy_id, notification_type, title, message)
           VALUES ($1, 'EXPIRY_REMINDER', $2, $3)`,
          [
            pharmacyId,
            `Expired Stock: ${item.medicine_name} (${item.batch_number})`,
            `Batch ${item.batch_number} of ${item.medicine_name} has expired on ${item.expiry_date}. Must be removed from dispensing.`,
          ],
        );
        createdCount++;
      }
    }

    return {
      success: true,
      message: `Inventory alert scan completed. ${createdCount} new notifications generated.`,
      data: {
        newNotificationsCreated: createdCount,
      },
    };
  }

  // =========================================================================
  // 7. INVENTORY TRANSACTION HISTORY (Section 10)
  // =========================================================================

  async getTransactions(
    pharmacyId: number,
    query: {
      inventoryId?: number;
      medicineId?: number;
      transactionType?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<ApiResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['it.pharmacy_id = $1'];
    const params: any[] = [pharmacyId];
    let paramIdx = 2;

    if (query.inventoryId) {
      conditions.push(`it.inventory_id = $${paramIdx++}`);
      params.push(query.inventoryId);
    }

    if (query.medicineId) {
      conditions.push(`ib.medicine_id = $${paramIdx++}`);
      params.push(query.medicineId);
    }

    if (query.transactionType?.trim()) {
      conditions.push(`it.transaction_type ILIKE $${paramIdx++}`);
      params.push(`%${query.transactionType.trim()}%`);
    }

    if (query.startDate?.trim()) {
      conditions.push(`it.created_at >= $${paramIdx++}`);
      params.push(`${query.startDate.trim()} 00:00:00`);
    }

    if (query.endDate?.trim()) {
      conditions.push(`it.created_at <= $${paramIdx++}`);
      params.push(`${query.endDate.trim()} 23:59:59`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await this.db.query(
      `SELECT COUNT(*) 
       FROM public.inventory_transactions it
       JOIN public.inventory_batches ib ON ib.inventory_id = it.inventory_id
       ${whereClause}`,
      params,
    );
    const total = Number(countRes.rows[0].count);

    const listRes = await this.db.query(
      `SELECT 
        it.transaction_id,
        it.inventory_id,
        it.pharmacy_id,
        it.transaction_type,
        it.quantity,
        it.previous_quantity,
        it.new_quantity,
        it.reason,
        it.notes,
        it.created_at,
        ib.batch_number,
        to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        m.medicine_id,
        m.medicine_name,
        m.strength,
        pu.full_name AS performed_by_name,
        pu.email AS performed_by_email
       FROM public.inventory_transactions it
       JOIN public.inventory_batches ib ON ib.inventory_id = it.inventory_id
       JOIN public.medicines m ON m.medicine_id = ib.medicine_id
       LEFT JOIN public.pharmacy_users pu ON pu.pharmacy_user_id = it.pharmacy_user_id
       ${whereClause}
       ORDER BY it.transaction_id DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset],
    );

    return {
      success: true,
      message: 'Inventory transaction history retrieved successfully.',
      data: {
        transactions: listRes.rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  // =========================================================================
  // 8. INVENTORY REPORTS & VALUATION (Section 9)
  // =========================================================================

  async generateReport(
    pharmacyId: number,
    query: QueryReportDto,
  ): Promise<{ response: ApiResponse; csvString?: string }> {
    const { reportType, startDate, endDate, medicineId, batchNumber, transactionType } = query;

    let items: any[] = [];
    let summary: Record<string, any> = {};

    switch (reportType) {
      case 'CURRENT_STOCK': {
        const conditions: string[] = ['ib.pharmacy_id = $1'];
        const params: any[] = [pharmacyId];
        let pIdx = 2;

        if (medicineId) {
          conditions.push(`ib.medicine_id = $${pIdx++}`);
          params.push(medicineId);
        }
        if (batchNumber?.trim()) {
          conditions.push(`ib.batch_number ILIKE $${pIdx++}`);
          params.push(`%${batchNumber.trim()}%`);
        }

        const res = await this.db.query(
          `SELECT 
            ib.inventory_id,
            m.medicine_name,
            m.generic_name,
            m.strength,
            m.dosage_form,
            ib.batch_number,
            ib.quantity,
            ib.unit_price,
            (ib.quantity * ib.unit_price) AS total_value,
            to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry_date,
            ib.reorder_level,
            ib.status
           FROM public.inventory_batches ib
           JOIN public.medicines m ON m.medicine_id = ib.medicine_id
           WHERE ${conditions.join(' AND ')}
           ORDER BY m.medicine_name ASC, ib.expiry_date ASC`,
          params,
        );
        items = res.rows;
        const totalQty = items.reduce((s, r) => s + Number(r.quantity), 0);
        const totalVal = items.reduce((s, r) => s + Number(r.total_value), 0);
        summary = {
          totalBatches: items.length,
          totalQuantity: totalQty,
          totalValuation: Number(totalVal.toFixed(2)),
        };
        break;
      }

      case 'STOCK_IN': {
        const conditions: string[] = ["it.pharmacy_id = $1 AND it.transaction_type = 'STOCK_IN'"];
        const params: any[] = [pharmacyId];
        let pIdx = 2;

        if (startDate?.trim()) {
          conditions.push(`it.created_at >= $${pIdx++}`);
          params.push(`${startDate.trim()} 00:00:00`);
        }
        if (endDate?.trim()) {
          conditions.push(`it.created_at <= $${pIdx++}`);
          params.push(`${endDate.trim()} 23:59:59`);
        }
        if (medicineId) {
          conditions.push(`ib.medicine_id = $${pIdx++}`);
          params.push(medicineId);
        }

        const res = await this.db.query(
          `SELECT 
            it.transaction_id,
            m.medicine_name,
            ib.batch_number,
            it.quantity AS quantity_received,
            ib.unit_price,
            (it.quantity * ib.unit_price) AS estimated_value,
            it.reason,
            it.notes,
            to_char(it.created_at, 'YYYY-MM-DD HH24:MI:SS') AS date_received,
            pu.full_name AS received_by
           FROM public.inventory_transactions it
           JOIN public.inventory_batches ib ON ib.inventory_id = it.inventory_id
           JOIN public.medicines m ON m.medicine_id = ib.medicine_id
           LEFT JOIN public.pharmacy_users pu ON pu.pharmacy_user_id = it.pharmacy_user_id
           WHERE ${conditions.join(' AND ')}
           ORDER BY it.transaction_id DESC`,
          params,
        );
        items = res.rows;
        const totalQty = items.reduce((s, r) => s + Number(r.quantity_received), 0);
        summary = { totalStockInOperations: items.length, totalQuantityReceived: totalQty };
        break;
      }

      case 'STOCK_OUT': {
        const conditions: string[] = [
          "it.pharmacy_id = $1 AND (it.transaction_type LIKE 'ADJUSTMENT_DECREASE%' OR it.transaction_type LIKE 'ADJUSTMENT_DAMAGED%' OR it.transaction_type LIKE 'ADJUSTMENT_EXPIRED%' OR it.transaction_type LIKE 'ADJUSTMENT_LOST%' OR it.transaction_type = 'STOCK_OUT')",
        ];
        const params: any[] = [pharmacyId];
        let pIdx = 2;

        if (startDate?.trim()) {
          conditions.push(`it.created_at >= $${pIdx++}`);
          params.push(`${startDate.trim()} 00:00:00`);
        }
        if (endDate?.trim()) {
          conditions.push(`it.created_at <= $${pIdx++}`);
          params.push(`${endDate.trim()} 23:59:59`);
        }

        const res = await this.db.query(
          `SELECT 
            it.transaction_id,
            it.transaction_type,
            m.medicine_name,
            ib.batch_number,
            it.quantity AS quantity_out,
            it.reason,
            it.notes,
            to_char(it.created_at, 'YYYY-MM-DD HH24:MI:SS') AS timestamp,
            pu.full_name AS staff_name
           FROM public.inventory_transactions it
           JOIN public.inventory_batches ib ON ib.inventory_id = it.inventory_id
           JOIN public.medicines m ON m.medicine_id = ib.medicine_id
           LEFT JOIN public.pharmacy_users pu ON pu.pharmacy_user_id = it.pharmacy_user_id
           WHERE ${conditions.join(' AND ')}
           ORDER BY it.transaction_id DESC`,
          params,
        );
        items = res.rows;
        const totalQty = items.reduce((s, r) => s + Number(r.quantity_out), 0);
        summary = { totalStockOutOperations: items.length, totalQuantityOut: totalQty };
        break;
      }

      case 'LOW_STOCK': {
        const res = await this.db.query(
          `SELECT 
            ib.inventory_id,
            m.medicine_name,
            m.strength,
            ib.batch_number,
            ib.quantity AS available_quantity,
            ib.reorder_level,
            to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry_date,
            ib.unit_price,
            (ib.reorder_level - ib.quantity) AS suggested_reorder_qty
           FROM public.inventory_batches ib
           JOIN public.medicines m ON m.medicine_id = ib.medicine_id
           WHERE ib.pharmacy_id = $1 AND ib.quantity <= ib.reorder_level
           ORDER BY ib.quantity ASC`,
          [pharmacyId],
        );
        items = res.rows;
        summary = { lowStockBatchesCount: items.length };
        break;
      }

      case 'EXPIRED': {
        const res = await this.db.query(
          `SELECT 
            ib.inventory_id,
            m.medicine_name,
            m.strength,
            ib.batch_number,
            ib.quantity AS expired_quantity,
            to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry_date,
            (CURRENT_DATE - ib.expiry_date) AS days_expired,
            ib.unit_price,
            (ib.quantity * ib.unit_price) AS lost_valuation
           FROM public.inventory_batches ib
           JOIN public.medicines m ON m.medicine_id = ib.medicine_id
           WHERE ib.pharmacy_id = $1 AND ib.expiry_date < CURRENT_DATE
           ORDER BY ib.expiry_date ASC`,
          [pharmacyId],
        );
        items = res.rows;
        const totalLost = items.reduce((s, r) => s + Number(r.lost_valuation), 0);
        summary = {
          totalExpiredBatches: items.length,
          totalLostValuation: Number(totalLost.toFixed(2)),
        };
        break;
      }

      case 'NEAR_EXPIRY': {
        const res = await this.db.query(
          `SELECT 
            ib.inventory_id,
            m.medicine_name,
            m.strength,
            ib.batch_number,
            ib.quantity,
            to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry_date,
            (ib.expiry_date - CURRENT_DATE) AS days_remaining,
            ib.unit_price,
            (ib.quantity * ib.unit_price) AS potential_risk_valuation
           FROM public.inventory_batches ib
           JOIN public.medicines m ON m.medicine_id = ib.medicine_id
           WHERE ib.pharmacy_id = $1 AND ib.quantity > 0 AND ib.expiry_date >= CURRENT_DATE AND ib.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
           ORDER BY ib.expiry_date ASC`,
          [pharmacyId],
        );
        items = res.rows;
        const totalRisk = items.reduce((s, r) => s + Number(r.potential_risk_valuation), 0);
        summary = {
          totalNearExpiryBatches: items.length,
          totalAtRiskValuation: Number(totalRisk.toFixed(2)),
        };
        break;
      }

      case 'ADJUSTMENT': {
        const conditions: string[] = ["it.pharmacy_id = $1 AND it.transaction_type LIKE 'ADJUSTMENT%'"];
        const params: any[] = [pharmacyId];
        let pIdx = 2;

        if (startDate?.trim()) {
          conditions.push(`it.created_at >= $${pIdx++}`);
          params.push(`${startDate.trim()} 00:00:00`);
        }
        if (endDate?.trim()) {
          conditions.push(`it.created_at <= $${pIdx++}`);
          params.push(`${endDate.trim()} 23:59:59`);
        }
        if (transactionType?.trim()) {
          conditions.push(`it.transaction_type ILIKE $${pIdx++}`);
          params.push(`%${transactionType.trim()}%`);
        }

        const res = await this.db.query(
          `SELECT 
            it.transaction_id,
            it.transaction_type,
            m.medicine_name,
            ib.batch_number,
            it.quantity,
            it.previous_quantity,
            it.new_quantity,
            it.reason,
            it.notes,
            to_char(it.created_at, 'YYYY-MM-DD HH24:MI:SS') AS timestamp,
            pu.full_name AS staff_name
           FROM public.inventory_transactions it
           JOIN public.inventory_batches ib ON ib.inventory_id = it.inventory_id
           JOIN public.medicines m ON m.medicine_id = ib.medicine_id
           LEFT JOIN public.pharmacy_users pu ON pu.pharmacy_user_id = it.pharmacy_user_id
           WHERE ${conditions.join(' AND ')}
           ORDER BY it.transaction_id DESC`,
          params,
        );
        items = res.rows;
        summary = { totalAdjustments: items.length };
        break;
      }

      case 'VALUATION': {
        const res = await this.db.query(
          `SELECT 
            m.medicine_id,
            m.medicine_name,
            m.strength,
            m.dosage_form,
            COUNT(ib.inventory_id) AS batch_count,
            COALESCE(SUM(ib.quantity), 0)::INTEGER AS total_quantity,
            COALESCE(SUM(ib.quantity * ib.unit_price), 0)::NUMERIC AS total_valuation,
            ROUND(AVG(ib.unit_price), 2) AS average_unit_price
           FROM public.inventory_batches ib
           JOIN public.medicines m ON m.medicine_id = ib.medicine_id
           WHERE ib.pharmacy_id = $1 AND ib.quantity > 0
           GROUP BY m.medicine_id
           ORDER BY total_valuation DESC`,
          [pharmacyId],
        );
        items = res.rows;
        const grandTotalVal = items.reduce((s, r) => s + Number(r.total_valuation), 0);
        const grandTotalQty = items.reduce((s, r) => s + Number(r.total_quantity), 0);
        summary = {
          totalMedicinesStocked: items.length,
          grandTotalQuantity: grandTotalQty,
          grandTotalValuation: Number(grandTotalVal.toFixed(2)),
        };
        break;
      }

      default:
        throw new BadRequestException(`Unknown report type: ${reportType}`);
    }

    let csvString: string | undefined;
    if (query.exportFormat === 'csv') {
      csvString = jsonToCsv(items);
    }

    return {
      response: {
        success: true,
        message: `${reportType} report generated successfully.`,
        data: {
          reportType,
          generatedAt: new Date().toISOString(),
          filters: {
            startDate: startDate || null,
            endDate: endDate || null,
            medicineId: medicineId || null,
            batchNumber: batchNumber || null,
            transactionType: transactionType || null,
          },
          summary,
          items,
        },
      },
      csvString,
    };
  }
}
