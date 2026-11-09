import crypto from 'node:crypto';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { CreateSaleDto } from './dto/create-sale.dto.js';
import type { CalculateBillDto } from './dto/calculate-bill.dto.js';
import type { QuerySalesDto } from './dto/query-sales.dto.js';
import type { RefundSaleDto } from './dto/refund-sale.dto.js';
import type { UpdateClaimDto } from './dto/update-claim.dto.js';
import type { RegisterSalePatientDto } from './dto/register-sale-patient.dto.js';
import type { ApiResponse } from '../common/interfaces/api-response.interface.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import {
  ReceiptData,
  generateHtmlReceipt,
} from './utils/receipt-generator.js';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Enforces strict pharmacy-level tenant isolation.
   */
  async resolvePharmacyId(user: JwtPayload, requestedPharmacyId?: number): Promise<number> {
    if (user.role === 'PHARMACY') {
      return Number(user.sub);
    }
    if (user.role === 'ADMIN') {
      if (requestedPharmacyId) {
        return Number(requestedPharmacyId);
      }
      const res = await this.db.query(
        'SELECT pharmacy_id FROM public.pharmacies ORDER BY pharmacy_id ASC LIMIT 1',
      );
      if (res.rows.length === 0) {
        throw new NotFoundException('No pharmacies exist in the system.');
      }
      return Number(res.rows[0].pharmacy_id);
    }
    throw new ForbiddenException('Access denied. Patient accounts cannot access sales or billing.');
  }

  /**
   * Find pharmacy_user_id for audit logs from user email or fallback to pharmacy owner
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
    const ownerRes = await this.db.query(
      'SELECT pharmacy_user_id FROM public.pharmacy_users WHERE pharmacy_id = $1 ORDER BY pharmacy_user_id ASC LIMIT 1',
      [pharmacyId],
    );
    return ownerRes.rows.length > 0 ? Number(ownerRes.rows[0].pharmacy_user_id) : null;
  }

  // =========================================================================
  // 1. SALES DASHBOARD (Section 3)
  // =========================================================================

  async getSalesDashboard(
    pharmacyId: number,
    filter: { period?: 'today' | 'week' | 'month' | 'custom'; startDate?: string; endDate?: string },
  ): Promise<ApiResponse> {
    const period = filter.period || 'today';
    let dateCondition = 's.created_at >= CURRENT_DATE';

    if (period === 'week') {
      dateCondition = "s.created_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateCondition = "s.created_at >= CURRENT_DATE - INTERVAL '30 days'";
    } else if (period === 'custom' && filter.startDate && filter.endDate) {
      dateCondition = `s.created_at >= '${filter.startDate} 00:00:00' AND s.created_at <= '${filter.endDate} 23:59:59'`;
    }

    // 1. Total sales count, revenue, medicines sold
    const totalsRes = await this.db.query(
      `SELECT 
        COUNT(s.sale_id) AS total_sales,
        COALESCE(SUM(s.net_total_amount), 0) AS total_revenue,
        COALESCE(SUM(s.patient_contribution), 0) AS total_patient_contribution,
        COALESCE(SUM(s.insurance_contribution), 0) AS total_insurance_contribution,
        COUNT(s.sale_id) FILTER (WHERE s.payment_category = 'PRIVATE') AS private_sales_count,
        COALESCE(SUM(s.net_total_amount) FILTER (WHERE s.payment_category = 'PRIVATE'), 0) AS private_revenue,
        COUNT(s.sale_id) FILTER (WHERE s.payment_category = 'INSURANCE') AS insurance_sales_count,
        COALESCE(SUM(s.net_total_amount) FILTER (WHERE s.payment_category = 'INSURANCE'), 0) AS insurance_revenue,
        COALESCE(SUM(s.outstanding_balance) FILTER (WHERE s.outstanding_balance > 0), 0) AS outstanding_balances
       FROM public.sales s
       WHERE s.pharmacy_id = $1 AND s.sale_status = 'COMPLETED' AND ${dateCondition}`,
      [pharmacyId],
    );
    const row = totalsRes.rows[0];

    // 2. Total medicine units sold
    const itemsRes = await this.db.query(
      `SELECT COALESCE(SUM(si.quantity), 0) AS total_medicines_sold
       FROM public.sale_items si
       JOIN public.sales s ON s.sale_id = si.sale_id
       WHERE s.pharmacy_id = $1 AND s.sale_status = 'COMPLETED' AND ${dateCondition}`,
      [pharmacyId],
    );
    const totalMedicinesSold = Number(itemsRes.rows[0].total_medicines_sold);

    // 3. Pending insurance claims
    const claimsRes = await this.db.query(
      `SELECT 
        COUNT(*) AS pending_claims_count,
        COALESCE(SUM(total_claimed_amount - paid_amount), 0) AS pending_claims_amount
       FROM public.insurance_claims
       WHERE pharmacy_id = $1 AND claim_status IN ('PENDING', 'SUBMITTED', 'APPROVED', 'PARTIALLY_PAID')`,
      [pharmacyId],
    );
    const pendingClaimsCount = Number(claimsRes.rows[0].pending_claims_count);
    const pendingClaimsAmount = Number(Number(claimsRes.rows[0].pending_claims_amount).toFixed(2));

    // 4. Recent sales transactions (last 10)
    const recentSalesRes = await this.db.query(
      `SELECT 
        s.sale_id,
        s.receipt_number,
        s.customer_name,
        s.customer_type,
        s.payment_category,
        s.net_total_amount,
        s.patient_contribution,
        s.insurance_contribution,
        s.amount_paid,
        s.outstanding_balance,
        s.payment_status,
        s.sale_status,
        to_char(s.created_at, 'YYYY-MM-DD HH24:MI:SS') AS transaction_date,
        ip.provider_name AS insurance_provider
       FROM public.sales s
       LEFT JOIN public.insurance_providers ip ON ip.provider_id = s.provider_id
       WHERE s.pharmacy_id = $1
       ORDER BY s.sale_id DESC
       LIMIT 10`,
      [pharmacyId],
    );

    return {
      success: true,
      message: 'Sales dashboard statistics retrieved successfully.',
      data: {
        period,
        summary: {
          totalSales: Number(row.total_sales || 0),
          totalRevenue: Number(Number(row.total_revenue || 0).toFixed(2)),
          totalMedicinesSold,
          privateSales: {
            count: Number(row.private_sales_count || 0),
            revenue: Number(Number(row.private_revenue || 0).toFixed(2)),
          },
          insuranceSales: {
            count: Number(row.insurance_sales_count || 0),
            revenue: Number(Number(row.insurance_revenue || 0).toFixed(2)),
            patientContribution: Number(Number(row.total_patient_contribution || 0).toFixed(2)),
            insuranceContribution: Number(Number(row.total_insurance_contribution || 0).toFixed(2)),
          },
          outstandingBalances: Number(Number(row.outstanding_balances || 0).toFixed(2)),
          pendingClaims: {
            count: pendingClaimsCount,
            amount: pendingClaimsAmount,
          },
        },
        recentSales: recentSalesRes.rows,
      },
    };
  }

  // =========================================================================
  // 2. POS MEDICINE SEARCH & BATCH AVAILABILITY (Section 4 & 8)
  // =========================================================================

  async searchMedicinesForPos(pharmacyId: number, query: string): Promise<ApiResponse> {
    const term = `%${query.trim()}%`;

    // Retrieve matching medicines that have at least one active, non-expired batch with quantity > 0
    const medicinesRes = await this.db.query(
      `SELECT DISTINCT
        m.medicine_id,
        m.medicine_name,
        m.generic_name,
        m.brand_name,
        m.strength,
        m.dosage_form,
        m.requires_prescription
       FROM public.medicines m
       JOIN public.inventory_batches ib ON ib.medicine_id = m.medicine_id
       WHERE ib.pharmacy_id = $1 
         AND ib.quantity > 0 
         AND (ib.expiry_date IS NULL OR ib.expiry_date >= CURRENT_DATE)
         AND (m.medicine_name ILIKE $2 OR m.generic_name ILIKE $2 OR m.brand_name ILIKE $2 OR m.strength ILIKE $2)
       ORDER BY m.medicine_name ASC
       LIMIT 25`,
      [pharmacyId, term],
    );

    const medicines = medicinesRes.rows;

    // For each medicine, fetch all available batches sorted by FEFO (First Expired, First Out)
    const results = [];
    for (const med of medicines) {
      const batchesRes = await this.db.query(
        `SELECT 
          ib.inventory_id,
          ib.batch_number,
          ib.quantity,
          ib.unit_price,
          to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry_date,
          (ib.expiry_date - CURRENT_DATE) AS days_until_expiry,
          ib.status
         FROM public.inventory_batches ib
         WHERE ib.pharmacy_id = $1 
           AND ib.medicine_id = $2 
           AND ib.quantity > 0 
           AND (ib.expiry_date IS NULL OR ib.expiry_date >= CURRENT_DATE)
         ORDER BY ib.expiry_date ASC NULLS LAST, ib.inventory_id ASC`,
        [pharmacyId, med.medicine_id],
      );

      const totalAvailable = batchesRes.rows.reduce((sum, b) => sum + Number(b.quantity), 0);

      results.push({
        ...med,
        totalAvailableStock: totalAvailable,
        batches: batchesRes.rows,
      });
    }

    return {
      success: true,
      message: 'POS medicines and batches retrieved successfully.',
      data: results,
    };
  }

  // =========================================================================
  // 3. PATIENT MANAGEMENT & INSURANCE CARDS (Section 5)
  // =========================================================================

  async searchPatients(query: string): Promise<ApiResponse> {
    const term = `%${query.trim()}%`;
    const res = await this.db.query(
      `SELECT 
        p.patient_id,
        p.full_name,
        p.phone_number,
        p.email,
        p.national_id,
        to_char(p.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
        p.age,
        p.gender,
        COALESCE(
          json_agg(
            json_build_object(
              'patientInsuranceId', pi.patient_insurance_id,
              'providerId', ip.provider_id,
              'providerName', ip.provider_name,
              'providerCode', ip.provider_code,
              'cardNumber', pi.card_number,
              'coveragePercentage', pi.coverage_percentage,
              'expiryDate', to_char(pi.expiry_date, 'YYYY-MM-DD'),
              'isActive', pi.is_active
            )
          ) FILTER (WHERE pi.patient_insurance_id IS NOT NULL), '[]'
        ) AS insurances
       FROM public.patients p
       LEFT JOIN public.patient_insurances pi ON pi.patient_id = p.patient_id AND pi.is_active = true
       LEFT JOIN public.insurance_providers ip ON ip.provider_id = pi.provider_id
       WHERE p.full_name ILIKE $1 
          OR p.phone_number ILIKE $1 
          OR p.national_id ILIKE $1 
          OR p.email ILIKE $1
       GROUP BY p.patient_id
       ORDER BY p.full_name ASC
       LIMIT 20`,
      [term],
    );

    return {
      success: true,
      message: 'Patients found successfully.',
      data: res.rows,
    };
  }

  async registerWalkinPatient(dto: RegisterSalePatientDto): Promise<ApiResponse> {
    const { fullName, phoneNumber, nationalId, email, dateOfBirth, gender, address, providerId, insuranceCardNumber } = dto;

    const patientRes = await this.db.query(
      `INSERT INTO public.patients 
        (full_name, phone_number, national_id, email, date_of_birth, gender, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING patient_id, full_name, phone_number, national_id, email, to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth, gender`,
      [
        fullName.trim(),
        phoneNumber?.trim() || null,
        nationalId?.trim() || null,
        email?.trim().toLowerCase() || null,
        dateOfBirth || null,
        gender || null,
      ],
    );

    const patient = patientRes.rows[0];

    // If insurance provider was also supplied, link it
    let insuranceRecord = null;
    if (providerId && insuranceCardNumber) {
      const provRes = await this.db.query(
        'SELECT default_coverage_percentage FROM public.insurance_providers WHERE provider_id = $1',
        [providerId],
      );
      const coverage = provRes.rows.length > 0 ? Number(provRes.rows[0].default_coverage_percentage) : 75.0;

      const insRes = await this.db.query(
        `INSERT INTO public.patient_insurances 
          (patient_id, provider_id, card_number, coverage_percentage, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING patient_insurance_id, provider_id, card_number, coverage_percentage`,
        [patient.patient_id, providerId, insuranceCardNumber.trim(), coverage],
      );
      insuranceRecord = insRes.rows[0];
    }

    return {
      success: true,
      message: 'Patient registered successfully.',
      data: {
        ...patient,
        insurance: insuranceRecord,
      },
    };
  }

  // =========================================================================
  // 4. PRESCRIPTION INTEGRATION (Section 9)
  // =========================================================================

  async searchPrescriptions(pharmacyId: number, query?: string): Promise<ApiResponse> {
    const term = `%${(query || '').trim()}%`;

    const res = await this.db.query(
      `SELECT 
        pr.prescription_id,
        pr.prescription_reference,
        to_char(pr.issued_date, 'YYYY-MM-DD') AS issued_date,
        pr.status,
        p.patient_id,
        p.full_name AS patient_name,
        p.phone_number AS patient_phone,
        COALESCE(
          json_agg(
            json_build_object(
              'prescriptionItemId', pi.prescription_item_id,
              'medicineId', m.medicine_id,
              'medicineName', m.medicine_name,
              'strength', m.strength,
              'dosageForm', m.dosage_form,
              'prescribedQuantity', pi.quantity,
              'dosageInstructions', pi.dosage_instructions
            )
          ) FILTER (WHERE pi.prescription_item_id IS NOT NULL), '[]'
        ) AS items
       FROM public.prescriptions pr
       JOIN public.patients p ON p.patient_id = pr.patient_id
       LEFT JOIN public.prescription_items pi ON pi.prescription_id = pr.prescription_id
       LEFT JOIN public.medicines m ON m.medicine_id = pi.medicine_id
       WHERE pr.prescription_reference ILIKE $1 
          OR p.full_name ILIKE $1 
          OR p.phone_number ILIKE $1
       GROUP BY pr.prescription_id, p.patient_id
       ORDER BY pr.prescription_id DESC
       LIMIT 20`,
      [term],
    );

    return {
      success: true,
      message: 'Prescriptions retrieved successfully.',
      data: res.rows,
    };
  }

  // =========================================================================
  // 5. INSURANCE PROVIDERS (Section 6 & 12)
  // =========================================================================

  async getInsuranceProviders(): Promise<ApiResponse> {
    const res = await this.db.query(
      `SELECT provider_id, provider_name, provider_code, default_coverage_percentage, contact_phone, contact_email, is_active 
       FROM public.insurance_providers 
       WHERE is_active = true 
       ORDER BY provider_name ASC`,
    );

    return {
      success: true,
      message: 'Insurance providers retrieved successfully.',
      data: res.rows,
    };
  }

  // =========================================================================
  // 6. AUTOMATIC BILLING CALCULATION (Section 7)
  // =========================================================================

  async calculateBill(pharmacyId: number, dto: CalculateBillDto): Promise<ApiResponse> {
    const { paymentCategory, items, providerId, globalCoveragePercentage, discountAmount = 0 } = dto;

    if (!items || items.length === 0) {
      throw new BadRequestException('At least one item is required to calculate bill.');
    }

    let defaultCoverage = 75.0;
    let providerName = '';
    if (paymentCategory === 'INSURANCE') {
      if (providerId) {
        const provRes = await this.db.query(
          'SELECT provider_name, default_coverage_percentage FROM public.insurance_providers WHERE provider_id = $1',
          [providerId],
        );
        if (provRes.rows.length > 0) {
          defaultCoverage = Number(provRes.rows[0].default_coverage_percentage);
          providerName = provRes.rows[0].provider_name;
        }
      }
      if (globalCoveragePercentage !== undefined && globalCoveragePercentage >= 0) {
        defaultCoverage = Number(globalCoveragePercentage);
      }
    }

    let grossTotal = 0;
    let totalInsuranceContribution = 0;
    let totalPatientContribution = 0;
    const calculatedItems = [];

    for (const item of items) {
      const batchRes = await this.db.query(
        `SELECT 
          ib.inventory_id,
          ib.pharmacy_id,
          ib.medicine_id,
          ib.batch_number,
          ib.quantity,
          ib.unit_price,
          to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry_date,
          m.medicine_name,
          m.strength,
          m.dosage_form
         FROM public.inventory_batches ib
         JOIN public.medicines m ON m.medicine_id = ib.medicine_id
         WHERE ib.inventory_id = $1 AND ib.pharmacy_id = $2`,
        [item.inventoryId, pharmacyId],
      );

      if (batchRes.rows.length === 0) {
        throw new NotFoundException(`Inventory batch with ID ${item.inventoryId} not found in this pharmacy.`);
      }

      const batch = batchRes.rows[0];
      const availableQty = Number(batch.quantity);
      const unitPrice = Number(batch.unit_price);
      const isExpired = batch.expiry_date && new Date(batch.expiry_date) < new Date();

      if (isExpired) {
        throw new BadRequestException(
          `Batch ${batch.batch_number} of ${batch.medicine_name} is expired (${batch.expiry_date}) and cannot be dispensed.`,
        );
      }

      if (item.quantity > availableQty) {
        throw new BadRequestException(
          `Insufficient stock for ${batch.medicine_name} (Batch: ${batch.batch_number}). Requested: ${item.quantity}, Available: ${availableQty}.`,
        );
      }

      const itemSubtotal = Math.round(unitPrice * item.quantity);
      grossTotal += itemSubtotal;

      let itemInsurance = 0;
      let itemPatient = itemSubtotal;
      let appliedCoverage = 0;

      if (paymentCategory === 'INSURANCE') {
        const isCovered = item.isInsuranceCovered !== false;
        if (isCovered) {
          appliedCoverage = item.customCoveragePercentage !== undefined ? item.customCoveragePercentage : defaultCoverage;
          itemInsurance = Math.round((itemSubtotal * appliedCoverage) / 100);
          itemPatient = itemSubtotal - itemInsurance;
        }
      }

      totalInsuranceContribution += itemInsurance;
      totalPatientContribution += itemPatient;

      calculatedItems.push({
        inventoryId: Number(batch.inventory_id),
        medicineId: Number(batch.medicine_id),
        medicineName: batch.medicine_name,
        strength: batch.strength,
        dosageForm: batch.dosage_form,
        batchNumber: batch.batch_number,
        expiryDate: batch.expiry_date,
        quantity: item.quantity,
        unitPrice,
        subtotal: itemSubtotal,
        isInsuranceCovered: paymentCategory === 'INSURANCE' ? (item.isInsuranceCovered !== false) : false,
        coveragePercentage: appliedCoverage,
        insuranceContribution: itemInsurance,
        patientContribution: itemPatient,
      });
    }

    const netTotal = Math.max(0, grossTotal - discountAmount);

    return {
      success: true,
      message: 'Bill calculated successfully.',
      data: {
        paymentCategory,
        providerId: providerId || null,
        providerName: providerName || null,
        items: calculatedItems,
        financials: {
          grossTotal,
          discountAmount,
          netTotal,
          insuranceContribution: totalInsuranceContribution,
          patientContribution: totalPatientContribution,
          currency: 'RWF',
        },
      },
    };
  }

  // =========================================================================
  // 7. NEW SALE / POS EXECUTION (Section 4, 6, 8)
  // =========================================================================

  async createSale(
    pharmacyId: number,
    dto: CreateSaleDto,
    userEmail?: string,
  ): Promise<ApiResponse> {
    const {
      paymentCategory,
      paymentMethod,
      items,
      amountPaid = 0,
      patientId,
      customerName,
      customerPhone,
      prescriptionId,
      providerId,
      insuranceCardNumber,
      discountAmount = 0,
      paymentReference,
      notes,
    } = dto;

    if (!items || items.length === 0) {
      throw new BadRequestException('At least one medicine item is required to complete a sale.');
    }

    if (paymentCategory === 'INSURANCE') {
      if (!providerId) {
        throw new BadRequestException('Insurance provider is required for insurance sales.');
      }
      if (!insuranceCardNumber?.trim()) {
        throw new BadRequestException('Insurance membership card number is required for insurance sales.');
      }
    }

    const pharmacyUserId = await this.getPharmacyUserId(pharmacyId, userEmail);

    // 1. Calculate bill with current batch prices and validation
    const billCalculation = await this.calculateBill(pharmacyId, {
      paymentCategory,
      items,
      providerId,
      discountAmount,
    });

    const { items: validatedItems, financials } = billCalculation.data;

    // Resolve customer details
    let finalCustomerName = customerName?.trim() || 'Walk-in Customer';
    let finalCustomerPhone = customerPhone?.trim() || null;
    let customerType = 'WALK_IN';

    if (patientId) {
      const patientRes = await this.db.query(
        'SELECT patient_id, full_name, phone_number FROM public.patients WHERE patient_id = $1',
        [patientId],
      );
      if (patientRes.rows.length > 0) {
        finalCustomerName = patientRes.rows[0].full_name;
        finalCustomerPhone = patientRes.rows[0].phone_number || finalCustomerPhone;
        customerType = 'REGISTERED';
      }
    }

    // Determine payment status
    const actualAmountPaid = Number(amountPaid) || 0;
    const requiredPatientPayment = financials.patientContribution;
    const outstandingBalance = Math.max(0, requiredPatientPayment - actualAmountPaid);

    let paymentStatus = 'PAID';
    if (outstandingBalance > 0) {
      paymentStatus = actualAmountPaid > 0 ? 'PARTIAL' : 'PENDING';
    }

    // Atomic transaction: Insert sale, sale items, deduct inventory, record stock-out, record payment, create claim
    const result = await this.db.transaction(async (client) => {
      // 1. Generate unique receipt number (REC-YYYYMMDD-XXXX)
      const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
      const receiptNumber = `REC-${datePrefix}-${randomSuffix}`;

      // 2. Insert into sales
      const saleInsertRes = await client.query(
        `INSERT INTO public.sales 
          (pharmacy_id, pharmacy_user_id, patient_id, prescription_id, receipt_number, customer_type, 
           customer_name, customer_phone, payment_category, provider_id, insurance_card_number, 
           total_amount, discount_amount, net_total_amount, patient_contribution, insurance_contribution, 
           amount_paid, outstanding_balance, payment_status, sale_status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'COMPLETED', $20)
         RETURNING sale_id, receipt_number, created_at`,
        [
          pharmacyId,
          pharmacyUserId,
          patientId || null,
          prescriptionId || null,
          receiptNumber,
          customerType,
          finalCustomerName,
          finalCustomerPhone,
          paymentCategory,
          providerId || null,
          insuranceCardNumber?.trim() || null,
          financials.grossTotal,
          discountAmount,
          financials.netTotal,
          financials.patientContribution,
          financials.insuranceContribution,
          actualAmountPaid,
          outstandingBalance,
          paymentStatus,
          notes?.trim() || null,
        ],
      );

      const sale = saleInsertRes.rows[0];
      const saleId = Number(sale.sale_id);

      // 3. Insert sale items and deduct stock
      for (const item of validatedItems) {
        // Insert sale_item
        await client.query(
          `INSERT INTO public.sale_items 
            (sale_id, inventory_id, medicine_id, batch_number, quantity, unit_price, subtotal, 
             is_insurance_covered, coverage_percentage, insurance_contribution, patient_contribution)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            saleId,
            item.inventoryId,
            item.medicineId,
            item.batchNumber,
            item.quantity,
            item.unitPrice,
            item.subtotal,
            item.isInsuranceCovered,
            item.coveragePercentage,
            item.insuranceContribution,
            item.patientContribution,
          ],
        );

        // Deduct inventory
        const batchUpdateRes = await client.query(
          `UPDATE public.inventory_batches 
           SET quantity = quantity - $1,
               status = CASE WHEN quantity - $1 = 0 THEN 'DEPLETED' ELSE status END,
               updated_at = CURRENT_TIMESTAMP
           WHERE inventory_id = $2 AND pharmacy_id = $3
           RETURNING inventory_id, quantity, reorder_level`,
          [item.quantity, item.inventoryId, pharmacyId],
        );

        const updatedBatch = batchUpdateRes.rows[0];
        const newQty = Number(updatedBatch.quantity);

        // Record stock-out in inventory_transactions
        await client.query(
          `INSERT INTO public.inventory_transactions 
            (inventory_id, pharmacy_id, pharmacy_user_id, transaction_type, quantity, previous_quantity, new_quantity, reason, notes)
           VALUES ($1, $2, $3, 'STOCK_OUT', $4, $5, $6, $7, $8)`,
          [
            item.inventoryId,
            pharmacyId,
            pharmacyUserId,
            item.quantity,
            newQty + item.quantity,
            newQty,
            `Sale dispensed - ${receiptNumber}`,
            `Item: ${item.medicineName} (${item.batchNumber})`,
          ],
        );

        // Trigger low stock notification if breached
        if (newQty <= Number(updatedBatch.reorder_level)) {
          await client.query(
            `INSERT INTO public.notifications (pharmacy_id, pharmacy_user_id, notification_type, title, message)
             VALUES ($1, $2, 'LOW_STOCK', $3, $4)`,
            [
              pharmacyId,
              pharmacyUserId,
              `Low Stock Warning: ${item.medicineName}`,
              `Batch ${item.batchNumber} has reached low stock (${newQty} remaining) after sale ${receiptNumber}.`,
            ],
          );
        }
      }

      // 4. Record patient payment if amountPaid > 0
      if (actualAmountPaid > 0) {
        await client.query(
          `INSERT INTO public.payments 
            (sale_id, pharmacy_id, amount, payment_method, payment_reference, payer_type, received_by, notes)
           VALUES ($1, $2, $3, $4, $5, 'PATIENT', $6, $7)`,
          [
            saleId,
            pharmacyId,
            actualAmountPaid,
            paymentMethod,
            paymentReference?.trim() || receiptNumber,
            pharmacyUserId,
            'Patient point-of-sale payment',
          ],
        );
      }

      // 5. Generate Insurance Claim if INSURANCE category
      let claimNumber: string | null = null;
      if (paymentCategory === 'INSURANCE' && financials.insuranceContribution > 0) {
        const claimSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
        claimNumber = `CLM-${datePrefix}-${claimSuffix}`;

        await client.query(
          `INSERT INTO public.insurance_claims 
            (sale_id, pharmacy_id, provider_id, claim_number, patient_id, insurance_card_number, 
             total_claimed_amount, claim_status, submission_date, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', CURRENT_TIMESTAMP, $8)`,
          [
            saleId,
            pharmacyId,
            providerId,
            claimNumber,
            patientId || null,
            insuranceCardNumber!.trim(),
            financials.insuranceContribution,
            `Claim generated from sale ${receiptNumber}`,
          ],
        );
      }

      return {
        saleId,
        receiptNumber,
        claimNumber,
        createdAt: sale.created_at,
      };
    });

    // Generate receipt data
    const receipt = await this.getReceipt(pharmacyId, result.saleId);

    return {
      success: true,
      message: 'Sale completed successfully.',
      data: {
        saleId: result.saleId,
        receiptNumber: result.receiptNumber,
        claimNumber: result.claimNumber,
        paymentStatus,
        receipt: receipt.data.receipt,
      },
    };
  }

  // =========================================================================
  // 8. SALES HISTORY & LISTING (Section 11)
  // =========================================================================

  async getSalesHistory(pharmacyId: number, query: QuerySalesDto): Promise<ApiResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['s.pharmacy_id = $1'];
    const params: any[] = [pharmacyId];
    let paramIdx = 2;

    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        `(s.receipt_number ILIKE $${paramIdx} OR s.customer_name ILIKE $${paramIdx} OR s.customer_phone ILIKE $${paramIdx})`,
      );
      params.push(term);
      paramIdx++;
    }

    if (query.startDate?.trim()) {
      conditions.push(`s.created_at >= $${paramIdx++}`);
      params.push(`${query.startDate.trim()} 00:00:00`);
    }

    if (query.endDate?.trim()) {
      conditions.push(`s.created_at <= $${paramIdx++}`);
      params.push(`${query.endDate.trim()} 23:59:59`);
    }

    if (query.paymentCategory && query.paymentCategory !== 'ALL') {
      conditions.push(`s.payment_category = $${paramIdx++}`);
      params.push(query.paymentCategory);
    }

    if (query.paymentStatus && query.paymentStatus !== 'ALL') {
      conditions.push(`s.payment_status = $${paramIdx++}`);
      params.push(query.paymentStatus);
    }

    if (query.providerId) {
      conditions.push(`s.provider_id = $${paramIdx++}`);
      params.push(query.providerId);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    let orderBy = 's.sale_id DESC';
    if (query.sortBy === 'total_amount') {
      orderBy = `s.net_total_amount ${query.sortOrder || 'DESC'}`;
    } else if (query.sortBy === 'receipt_number') {
      orderBy = `s.receipt_number ${query.sortOrder || 'ASC'}`;
    }

    const countRes = await this.db.query(
      `SELECT COUNT(*) FROM public.sales s ${whereClause}`,
      params,
    );
    const total = Number(countRes.rows[0].count);

    const listRes = await this.db.query(
      `SELECT 
        s.sale_id,
        s.receipt_number,
        s.customer_type,
        s.customer_name,
        s.customer_phone,
        s.payment_category,
        s.total_amount,
        s.discount_amount,
        s.net_total_amount,
        s.patient_contribution,
        s.insurance_contribution,
        s.amount_paid,
        s.outstanding_balance,
        s.payment_status,
        s.sale_status,
        to_char(s.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
        ip.provider_name AS insurance_provider,
        pu.full_name AS staff_name,
        (SELECT COUNT(*) FROM public.sale_items si WHERE si.sale_id = s.sale_id) AS items_count
       FROM public.sales s
       LEFT JOIN public.insurance_providers ip ON ip.provider_id = s.provider_id
       LEFT JOIN public.pharmacy_users pu ON pu.pharmacy_user_id = s.pharmacy_user_id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset],
    );

    return {
      success: true,
      message: 'Sales history retrieved successfully.',
      data: {
        sales: listRes.rows,
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
  // 9. RECEIPT GENERATION & DETAILS (Section 10)
  // =========================================================================

  async getReceipt(pharmacyId: number, saleId: number): Promise<ApiResponse> {
    const saleRes = await this.db.query(
      `SELECT 
        s.*,
        to_char(s.created_at, 'YYYY-MM-DD HH24:MI:SS') AS formatted_date,
        ph.pharmacy_name,
        ph.phone_number AS pharmacy_phone,
        ph.email AS pharmacy_email,
        ph.tin AS pharmacy_tin,
        ph.location_address AS pharmacy_address,
        pu.full_name AS staff_name,
        ip.provider_name,
        ip.provider_code,
        pr.prescription_reference,
        ic.claim_number
       FROM public.sales s
       JOIN public.pharmacies ph ON ph.pharmacy_id = s.pharmacy_id
       LEFT JOIN public.pharmacy_users pu ON pu.pharmacy_user_id = s.pharmacy_user_id
       LEFT JOIN public.insurance_providers ip ON ip.provider_id = s.provider_id
       LEFT JOIN public.prescriptions pr ON pr.prescription_id = s.prescription_id
       LEFT JOIN public.insurance_claims ic ON ic.sale_id = s.sale_id
       WHERE s.sale_id = $1 AND s.pharmacy_id = $2`,
      [saleId, pharmacyId],
    );

    if (saleRes.rows.length === 0) {
      throw new NotFoundException(`Sale with ID ${saleId} not found.`);
    }

    const sale = saleRes.rows[0];

    const itemsRes = await this.db.query(
      `SELECT 
        si.*,
        m.medicine_name,
        m.strength,
        m.dosage_form,
        to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry_date
       FROM public.sale_items si
       JOIN public.medicines m ON m.medicine_id = si.medicine_id
       LEFT JOIN public.inventory_batches ib ON ib.inventory_id = si.inventory_id
       WHERE si.sale_id = $1
       ORDER BY si.sale_item_id ASC`,
      [saleId],
    );

    const paymentRes = await this.db.query(
      `SELECT payment_method, payment_reference, amount 
       FROM public.payments 
       WHERE sale_id = $1 AND payer_type = 'PATIENT' 
       ORDER BY payment_id DESC LIMIT 1`,
      [saleId],
    );

    const payment = paymentRes.rows[0];
    const grossTotal = Number(sale.total_amount);
    const discount = Number(sale.discount_amount);
    const netTotal = Number(sale.net_total_amount);
    const patientContrib = Number(sale.patient_contribution);
    const insContrib = Number(sale.insurance_contribution);
    const amtPaid = Number(sale.amount_paid);
    const outBalance = Number(sale.outstanding_balance);
    const changeAmt = Math.max(0, amtPaid - (sale.payment_category === 'INSURANCE' ? patientContrib : netTotal));

    const receiptData: ReceiptData = {
      pharmacy: {
        name: sale.pharmacy_name,
        phone: sale.pharmacy_phone,
        email: sale.pharmacy_email,
        tin: sale.pharmacy_tin,
        address: sale.pharmacy_address,
      },
      receiptNumber: sale.receipt_number,
      transactionDate: sale.formatted_date,
      pharmacistName: sale.staff_name || 'Staff Pharmacist',
      customer: {
        name: sale.customer_name || 'Walk-in Customer',
        phone: sale.customer_phone,
        type: sale.customer_type,
      },
      paymentCategory: sale.payment_category,
      insurance: sale.provider_name
        ? {
            providerName: sale.provider_name,
            providerCode: sale.provider_code,
            cardNumber: sale.insurance_card_number,
            claimNumber: sale.claim_number,
          }
        : undefined,
      items: itemsRes.rows.map((i) => ({
        medicineName: i.medicine_name,
        strength: i.strength,
        dosageForm: i.dosage_form,
        batchNumber: i.batch_number,
        expiryDate: i.expiry_date,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unit_price),
        subtotal: Number(i.subtotal),
        isInsuranceCovered: i.is_insurance_covered,
        coveragePercentage: Number(i.coverage_percentage),
        insuranceContribution: Number(i.insurance_contribution),
        patientContribution: Number(i.patient_contribution),
      })),
      financials: {
        grossTotal,
        discountAmount: discount,
        netTotal,
        insuranceContribution: insContrib,
        patientContribution: patientContrib,
        amountPaid: amtPaid,
        outstandingBalance: outBalance,
        changeAmount: changeAmt,
        currency: 'RWF',
      },
      paymentMethod: payment?.payment_method || 'CASH',
      paymentReference: payment?.payment_reference,
      paymentStatus: sale.payment_status,
      saleStatus: sale.sale_status,
      prescriptionReference: sale.prescription_reference,
    };

    const html = generateHtmlReceipt(receiptData);

    return {
      success: true,
      message: 'Receipt generated successfully.',
      data: {
        receipt: receiptData,
        html,
      },
    };
  }

  // =========================================================================
  // 10. SALES CANCELLATION & REFUNDS (Section 15)
  // =========================================================================

  async refundSale(
    pharmacyId: number,
    saleId: number,
    dto: RefundSaleDto,
    userEmail?: string,
  ): Promise<ApiResponse> {
    const { reason, items: returnItems, refundAmount, refundMethod = 'CASH', notes } = dto;

    const saleRes = await this.db.query(
      `SELECT sale_id, receipt_number, net_total_amount, patient_contribution, amount_paid, payment_status, sale_status 
       FROM public.sales 
       WHERE sale_id = $1 AND pharmacy_id = $2`,
      [saleId, pharmacyId],
    );

    if (saleRes.rows.length === 0) {
      throw new NotFoundException(`Sale with ID ${saleId} not found.`);
    }

    const sale = saleRes.rows[0];
    if (sale.sale_status === 'REFUNDED' || sale.sale_status === 'CANCELLED') {
      throw new BadRequestException(`This sale has already been ${sale.sale_status.toLowerCase()}.`);
    }

    const pharmacyUserId = await this.getPharmacyUserId(pharmacyId, userEmail);

    const result = await this.db.transaction(async (client) => {
      // 1. Mark sale status as REFUNDED
      await client.query(
        `UPDATE public.sales 
         SET sale_status = 'REFUNDED', 
             payment_status = 'REFUNDED',
             cancellation_reason = $1,
             cancelled_by = $2,
             cancelled_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE sale_id = $3`,
        [reason.trim(), pharmacyUserId, saleId],
      );

      // 2. Process returned items and restore stock if accepted
      const saleItemsRes = await client.query(
        'SELECT sale_item_id, inventory_id, medicine_id, batch_number, quantity, returned_quantity FROM public.sale_items WHERE sale_id = $1',
        [saleId],
      );

      let restoredItemsCount = 0;

      for (const item of saleItemsRes.rows) {
        let returnQty = Number(item.quantity);
        let shouldRestore = true;

        if (returnItems && returnItems.length > 0) {
          const match = returnItems.find((r) => r.saleItemId === Number(item.sale_item_id));
          if (!match) continue;
          returnQty = match.quantity;
          shouldRestore = match.restoreToInventory;
        }

        // Update returned quantity on item
        await client.query(
          'UPDATE public.sale_items SET returned_quantity = returned_quantity + $1 WHERE sale_item_id = $2',
          [returnQty, item.sale_item_id],
        );

        if (shouldRestore && returnQty > 0) {
          // Restore stock in inventory_batches
          const batchRes = await client.query(
            `UPDATE public.inventory_batches 
             SET quantity = quantity + $1,
                 status = 'ACTIVE',
                 updated_at = CURRENT_TIMESTAMP
             WHERE inventory_id = $2 AND pharmacy_id = $3
             RETURNING quantity`,
            [returnQty, item.inventory_id, pharmacyId],
          );

          const newQty = Number(batchRes.rows[0]?.quantity || 0);

          // Log inventory transaction
          await client.query(
            `INSERT INTO public.inventory_transactions 
              (inventory_id, pharmacy_id, pharmacy_user_id, transaction_type, quantity, previous_quantity, new_quantity, reason, notes)
             VALUES ($1, $2, $3, 'ADJUSTMENT_INCREASE', $4, $5, $6, $7, $8)`,
            [
              item.inventory_id,
              pharmacyId,
              pharmacyUserId,
              returnQty,
              newQty - returnQty,
              newQty,
              `Sale refund item returned: ${sale.receipt_number}`,
              reason.trim(),
            ],
          );
          restoredItemsCount++;
        }
      }

      // 3. Record refund payment if funds returned to patient
      const actualRefundDisbursed = refundAmount !== undefined ? refundAmount : Number(sale.amount_paid);
      if (actualRefundDisbursed > 0) {
        await client.query(
          `INSERT INTO public.payments 
            (sale_id, pharmacy_id, amount, payment_method, payer_type, received_by, notes)
           VALUES ($1, $2, $3, $4, 'PATIENT', $5, $6)`,
          [
            saleId,
            pharmacyId,
            actualRefundDisbursed,
            refundMethod,
            pharmacyUserId,
            `Refund disbursed for sale ${sale.receipt_number}: ${reason.trim()}`,
          ],
        );
      }

      // 4. Update any associated insurance claim to REJECTED / CANCELLED
      await client.query(
        `UPDATE public.insurance_claims 
         SET claim_status = 'REJECTED', 
             rejection_reason = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE sale_id = $2 AND pharmacy_id = $3`,
        [`Sale refunded: ${reason.trim()}`, saleId, pharmacyId],
      );

      return {
        saleId,
        receiptNumber: sale.receipt_number,
        restoredItemsCount,
        refundAmount: actualRefundDisbursed,
      };
    });

    return {
      success: true,
      message: 'Sale refunded and inventory restored successfully.',
      data: result,
    };
  }

  // =========================================================================
  // 11. INSURANCE CLAIMS MANAGEMENT (Section 12)
  // =========================================================================

  async getInsuranceClaims(
    pharmacyId: number,
    query: {
      providerId?: number;
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<ApiResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['ic.pharmacy_id = $1'];
    const params: any[] = [pharmacyId];
    let paramIdx = 2;

    if (query.providerId) {
      conditions.push(`ic.provider_id = $${paramIdx++}`);
      params.push(query.providerId);
    }

    if (query.status?.trim() && query.status !== 'ALL') {
      conditions.push(`ic.claim_status = $${paramIdx++}`);
      params.push(query.status.trim());
    }

    if (query.startDate?.trim()) {
      conditions.push(`ic.created_at >= $${paramIdx++}`);
      params.push(`${query.startDate.trim()} 00:00:00`);
    }

    if (query.endDate?.trim()) {
      conditions.push(`ic.created_at <= $${paramIdx++}`);
      params.push(`${query.endDate.trim()} 23:59:59`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await this.db.query(
      `SELECT COUNT(*) FROM public.insurance_claims ic ${whereClause}`,
      params,
    );
    const total = Number(countRes.rows[0].count);

    const listRes = await this.db.query(
      `SELECT 
        ic.claim_id,
        ic.sale_id,
        ic.claim_number,
        ic.insurance_card_number,
        ic.total_claimed_amount,
        ic.approved_amount,
        ic.paid_amount,
        ic.claim_status,
        ic.rejection_reason,
        to_char(ic.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
        to_char(ic.settlement_date, 'YYYY-MM-DD') AS settlement_date,
        s.receipt_number,
        s.customer_name,
        ip.provider_name,
        ip.provider_code
       FROM public.insurance_claims ic
       JOIN public.sales s ON s.sale_id = ic.sale_id
       JOIN public.insurance_providers ip ON ip.provider_id = ic.provider_id
       ${whereClause}
       ORDER BY ic.claim_id DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset],
    );

    return {
      success: true,
      message: 'Insurance claims retrieved successfully.',
      data: {
        claims: listRes.rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async updateClaimStatus(
    pharmacyId: number,
    claimId: number,
    dto: UpdateClaimDto,
    userEmail?: string,
  ): Promise<ApiResponse> {
    const { claimStatus, approvedAmount, paidAmount, rejectionReason, paymentReference, notes } = dto;

    const claimRes = await this.db.query(
      'SELECT claim_id, sale_id, total_claimed_amount, claim_status FROM public.insurance_claims WHERE claim_id = $1 AND pharmacy_id = $2',
      [claimId, pharmacyId],
    );

    if (claimRes.rows.length === 0) {
      throw new NotFoundException(`Insurance claim with ID ${claimId} not found.`);
    }

    const claim = claimRes.rows[0];
    const pharmacyUserId = await this.getPharmacyUserId(pharmacyId, userEmail);

    const result = await this.db.transaction(async (client) => {
      const updates = [`claim_status = $1`, `updated_at = CURRENT_TIMESTAMP`];
      const params: any[] = [claimStatus, claimId, pharmacyId];
      let pIdx = 4;

      if (approvedAmount !== undefined) {
        updates.push(`approved_amount = $${pIdx++}`);
        params.push(approvedAmount);
      }
      if (paidAmount !== undefined) {
        updates.push(`paid_amount = $${pIdx++}`);
        params.push(paidAmount);
      }
      if (rejectionReason !== undefined) {
        updates.push(`rejection_reason = $${pIdx++}`);
        params.push(rejectionReason);
      }
      if (notes !== undefined) {
        updates.push(`notes = $${pIdx++}`);
        params.push(notes);
      }
      if (claimStatus === 'PAID' || claimStatus === 'PARTIALLY_PAID') {
        updates.push(`settlement_date = CURRENT_TIMESTAMP`);
      }

      const updateQuery = `
        UPDATE public.insurance_claims 
        SET ${updates.join(', ')} 
        WHERE claim_id = $2 AND pharmacy_id = $3 
        RETURNING claim_id, claim_number, claim_status, total_claimed_amount, approved_amount, paid_amount, rejection_reason, settlement_date
      `;

      const updatedRes = await client.query(updateQuery, params);

      // If insurance payment was received, record in payments table!
      if (paidAmount && paidAmount > 0) {
        await client.query(
          `INSERT INTO public.payments 
            (sale_id, pharmacy_id, amount, payment_method, payment_reference, payer_type, received_by, notes)
           VALUES ($1, $2, $3, 'INSURANCE', $4, 'INSURANCE', $5, $6)`,
          [
            claim.sale_id,
            pharmacyId,
            paidAmount,
            paymentReference || `CLAIM-PAY-${claim.claim_id}`,
            pharmacyUserId,
            `Insurance settlement payment received for claim ${claim.claim_id}`,
          ],
        );
      }

      return updatedRes.rows[0];
    });

    return {
      success: true,
      message: `Claim status updated to ${claimStatus}.`,
      data: result,
    };
  }

  async getClaimsSummary(pharmacyId: number): Promise<ApiResponse> {
    const res = await this.db.query(
      `SELECT 
        COUNT(*) AS total_claims,
        COALESCE(SUM(total_claimed_amount), 0) AS total_claimed,
        COALESCE(SUM(approved_amount), 0) AS total_approved,
        COALESCE(SUM(paid_amount), 0) AS total_paid,
        COALESCE(SUM(total_claimed_amount - paid_amount) FILTER (WHERE claim_status != 'REJECTED'), 0) AS total_outstanding,
        COUNT(*) FILTER (WHERE claim_status = 'PENDING') AS pending_claims,
        COUNT(*) FILTER (WHERE claim_status = 'APPROVED') AS approved_claims,
        COUNT(*) FILTER (WHERE claim_status = 'PAID') AS paid_claims,
        COUNT(*) FILTER (WHERE claim_status = 'REJECTED') AS rejected_claims
       FROM public.insurance_claims
       WHERE pharmacy_id = $1`,
      [pharmacyId],
    );

    const r = res.rows[0];

    return {
      success: true,
      message: 'Insurance claims summary retrieved successfully.',
      data: {
        totalClaims: Number(r.total_claims || 0),
        totalClaimed: Number(Number(r.total_claimed || 0).toFixed(2)),
        totalApproved: Number(Number(r.total_approved || 0).toFixed(2)),
        totalPaid: Number(Number(r.total_paid || 0).toFixed(2)),
        totalOutstanding: Number(Number(r.total_outstanding || 0).toFixed(2)),
        breakdown: {
          pending: Number(r.pending_claims || 0),
          approved: Number(r.approved_claims || 0),
          paid: Number(r.paid_claims || 0),
          rejected: Number(r.rejected_claims || 0),
        },
      },
    };
  }
}

