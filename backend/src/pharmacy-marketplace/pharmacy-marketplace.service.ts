
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service.js';

type PharmacyOrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'READY_FOR_COLLECTION'
  | 'COMPLETED'
  | 'CANCELLED';

@Injectable()
export class PharmacyMarketplaceService {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  // =========================================================
  // VALIDATION
  // =========================================================

  private validatePositiveInteger(
    value: unknown,
    field: string,
  ): number {
    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(
        `${field} must be a positive integer.`,
      );
    }

    return parsed;
  }

  private validatePrice(value: unknown): number {
    const price = Number(value);

    if (!Number.isFinite(price) || price <= 0) {
      throw new BadRequestException(
        'Price must be a number greater than zero.',
      );
    }

    return Number(price.toFixed(2));
  }

  private validateOrderStatus(
    status: unknown,
  ): PharmacyOrderStatus | undefined {
    if (status === undefined || status === '') {
      return undefined;
    }

    const allowed: PharmacyOrderStatus[] = [
      'PENDING',
      'ACCEPTED',
      'REJECTED',
      'READY_FOR_COLLECTION',
      'COMPLETED',
      'CANCELLED',
    ];

    if (
      typeof status !== 'string' ||
      !allowed.includes(status as PharmacyOrderStatus)
    ) {
      throw new BadRequestException(
        'Invalid order status filter.',
      );
    }

    return status as PharmacyOrderStatus;
  }

  /**
   * Verify that the authenticated pharmacy exists and is approved.
   * The pharmacy ID is obtained from the authenticated JWT.
   */
  private async verifyPharmacy(
    client: any,
    pharmacyIdInput: number,
  ) {
    const pharmacyId = this.validatePositiveInteger(
      pharmacyIdInput,
      'Pharmacy ID',
    );

    const result = await client.query(
      `
        SELECT
          pharmacy_id,
          phone_number,
          location_address,
          is_active,
          verification_status
        FROM public.pharmacies
        WHERE pharmacy_id = $1
          AND is_active = TRUE
          AND verification_status = 'APPROVED'
        LIMIT 1
      `,
      [pharmacyId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(
        'Your pharmacy account was not found, is inactive, or is not approved.',
      );
    }

    return result.rows[0];
  }

  /**
   * Retrieve an order only if it belongs to this pharmacy.
   */
  private async getOwnedOrder(
    client: any,
    pharmacyId: number,
    orderId: number,
    lock = false,
  ) {
    const result = await client.query(
      `
        SELECT
          order_id,
          patient_id,
          pharmacy_id,
          status,
          payment_method,
          payment_status,
          subtotal,
          total,
          created_at,
          updated_at
        FROM public.marketplace_orders
        WHERE order_id = $1
          AND pharmacy_id = $2
        LIMIT 1
        ${lock ? 'FOR UPDATE' : ''}
      `,
      [orderId, pharmacyId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(
        'Order not found for this pharmacy.',
      );
    }

    return result.rows[0];
  }

  // =========================================================
  // PHARMACY ORDERS
  // =========================================================

  /**
   * Get incoming orders belonging to the authenticated pharmacy.
   */
  async getOrders(
    pharmacyIdInput: number,
    statusInput?: string,
  ) {
    const pharmacyId = this.validatePositiveInteger(
      pharmacyIdInput,
      'Pharmacy ID',
    );

    const status = this.validateOrderStatus(statusInput);

    await this.verifyPharmacy(
      this.databaseService,
      pharmacyId,
    );

    const params: unknown[] = [pharmacyId];

    let statusCondition = '';

    if (status) {
      params.push(status);
      statusCondition = `AND o.status = $${params.length}`;
    }

    const result = await this.databaseService.query(
      `
        SELECT
          o.order_id,
          o.patient_id,
          pt.full_name AS patient_name,
          pt.phone_number AS patient_phone,
          o.pharmacy_id,
          o.status,
          o.payment_method,
          o.payment_status,
          o.mobile_money_provider,
          o.subtotal,
          o.total,
          o.rejection_reason,
          o.sale_id,
          o.created_at,
          o.updated_at,
          COUNT(oi.order_item_id)::INTEGER AS item_count,
          COALESCE(BOOL_OR(m.requires_prescription), FALSE) AS requires_prescription
        FROM public.marketplace_orders o
        LEFT JOIN public.patients pt
          ON pt.patient_id = o.patient_id
        LEFT JOIN public.marketplace_order_items oi
          ON oi.order_id = o.order_id
        LEFT JOIN public.medicines m
          ON m.medicine_id = oi.medicine_id
        WHERE o.pharmacy_id = $1
          ${statusCondition}
        GROUP BY o.order_id, pt.full_name, pt.phone_number
        ORDER BY
          CASE
            WHEN o.status = 'PENDING' THEN 0
            WHEN o.status = 'ACCEPTED' THEN 1
            WHEN o.status = 'READY_FOR_COLLECTION' THEN 2
            ELSE 3
          END,
          o.created_at DESC,
          o.order_id DESC
      `,
      params,
    );

    return {
      success: true,
      message: 'Pharmacy orders retrieved successfully.',
      data: result.rows,
      order_count: result.rows.length,
    };
  }

  /**
   * Get one order and its items.
   * The pharmacy can only access its own orders.
   */
  async getOrder(
    pharmacyIdInput: number,
    orderIdInput: number,
  ) {
    const pharmacyId = this.validatePositiveInteger(
      pharmacyIdInput,
      'Pharmacy ID',
    );

    const orderId = this.validatePositiveInteger(
      orderIdInput,
      'Order ID',
    );

    await this.verifyPharmacy(
      this.databaseService,
      pharmacyId,
    );

    const orderResult = await this.databaseService.query(
      `
        SELECT
          o.order_id,
          o.patient_id,
          pt.full_name AS patient_name,
          pt.phone_number AS patient_phone,
          o.pharmacy_id,
          o.status,
          o.payment_method,
          o.payment_status,
          o.mobile_money_provider,
          o.payment_phone_number,
          o.subtotal,
          o.total,
          o.rejection_reason,
          o.sale_id,
          o.created_at,
          o.updated_at
        FROM public.marketplace_orders o
        LEFT JOIN public.patients pt
          ON pt.patient_id = o.patient_id
        WHERE o.order_id = $1
          AND o.pharmacy_id = $2
        LIMIT 1
      `,
      [orderId, pharmacyId],
    );

    if (orderResult.rows.length === 0) {
      throw new NotFoundException(
        'Order not found for this pharmacy.',
      );
    }

    const itemsResult = await this.databaseService.query(
      `
        SELECT
          oi.order_item_id,
          oi.medicine_id,
          m.medicine_name,
          m.generic_name,
          m.brand_name,
          m.strength,
          m.dosage_form,
          m.requires_prescription,
          oi.quantity,
          oi.unit_price,
          oi.subtotal
        FROM public.marketplace_order_items oi
        INNER JOIN public.medicines m
          ON m.medicine_id = oi.medicine_id
        WHERE oi.order_id = $1
        ORDER BY oi.order_item_id ASC
      `,
      [orderId],
    );

    // Suggest which batches to sell from (first expiring first), so the
    // sales point can load the order straight into its cart.
    const items = [];
    for (const item of itemsResult.rows) {
      const batches = await this.databaseService.query(
        `
          SELECT
            ib.inventory_id,
            ib.batch_number,
            ib.quantity,
            COALESCE(ib.selling_price, ib.unit_price) AS unit_price,
            to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry_date
          FROM public.inventory_batches ib
          WHERE ib.pharmacy_id = $1
            AND ib.medicine_id = $2
            AND ib.quantity > 0
            AND (ib.expiry_date IS NULL OR ib.expiry_date >= CURRENT_DATE)
          ORDER BY ib.expiry_date ASC NULLS LAST, ib.inventory_id ASC
        `,
        [pharmacyId, item.medicine_id],
      );
      let remaining = Number(item.quantity);
      const allocations = [];
      for (const b of batches.rows) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, Number(b.quantity));
        allocations.push({
          inventory_id: Number(b.inventory_id),
          batch_number: b.batch_number,
          quantity: take,
          available_quantity: Number(b.quantity),
          unit_price: Number(b.unit_price),
          expiry_date: b.expiry_date,
        });
        remaining -= take;
      }
      items.push({
        ...item,
        allocations,
        short_by: Math.max(0, remaining),
      });
    }

    return {
      success: true,
      message: 'Order details retrieved successfully.',
      data: {
        order: orderResult.rows[0],
        items,
        item_count: items.length,
        all_items_in_stock: items.every((i: any) => i.short_by === 0),
      },
    };
  }

  /**
   * Accept a pending order.
   */
  async acceptOrder(
    pharmacyIdInput: number,
    orderIdInput: number,
  ) {
    const pharmacyId = this.validatePositiveInteger(
      pharmacyIdInput,
      'Pharmacy ID',
    );

    const orderId = this.validatePositiveInteger(
      orderIdInput,
      'Order ID',
    );

    return this.databaseService.transaction(async (client) => {
      await this.verifyPharmacy(client, pharmacyId);

      const order = await this.getOwnedOrder(
        client,
        pharmacyId,
        orderId,
        true,
      );

      if (order.status !== 'PENDING') {
        throw new ConflictException(
          'Only pending orders can be accepted.',
        );
      }

      const result = await client.query(
        `
          UPDATE public.marketplace_orders
          SET status = 'ACCEPTED',
              updated_at = NOW()
          WHERE order_id = $1
            AND pharmacy_id = $2
            AND status = 'PENDING'
          RETURNING
            order_id,
            pharmacy_id,
            status,
            payment_method,
            payment_status,
            total,
            updated_at
        `,
        [orderId, pharmacyId],
      );

      if (result.rows.length === 0) {
        throw new ConflictException(
          'The order could not be accepted because its status changed.',
        );
      }

      return {
        success: true,
        message: 'Order accepted successfully.',
        data: result.rows[0],
      };
    });
  }

  /**
   * Reject a pending order.
   *
   * The reason is validated and returned to the caller.
   * It is not persisted because the current order schema
   * contract does not include a rejection-reason column.
   */
  async rejectOrder(
    pharmacyIdInput: number,
    orderIdInput: number,
    input: { reason: string },
  ) {
    const pharmacyId = this.validatePositiveInteger(
      pharmacyIdInput,
      'Pharmacy ID',
    );

    const orderId = this.validatePositiveInteger(
      orderIdInput,
      'Order ID',
    );

    const reason = input?.reason?.trim();

    if (!reason || reason.length < 3 || reason.length > 500) {
      throw new BadRequestException(
        'Please provide a rejection reason between 3 and 500 characters.',
      );
    }

    return this.databaseService.transaction(async (client) => {
      await this.verifyPharmacy(client, pharmacyId);

      const order = await this.getOwnedOrder(
        client,
        pharmacyId,
        orderId,
        true,
      );

      if (order.status !== 'PENDING') {
        throw new ConflictException(
          'Only pending orders can be rejected.',
        );
      }

      const result = await client.query(
        `
          UPDATE public.marketplace_orders
          SET status = 'REJECTED',
              rejection_reason = $3,
              updated_at = NOW()
          WHERE order_id = $1
            AND pharmacy_id = $2
            AND status = 'PENDING'
          RETURNING
            order_id,
            pharmacy_id,
            status,
            payment_status,
            rejection_reason,
            updated_at
        `,
        [orderId, pharmacyId, reason],
      );

      if (result.rows.length === 0) {
        throw new ConflictException(
          'The order could not be rejected because its status changed.',
        );
      }

      return {
        success: true,
        message: 'Order rejected successfully.',
        rejection_reason: reason,
        data: result.rows[0],
      };
    });
  }

  /**
   * Move an accepted order to ready for collection,
   * or mark a ready order as completed.
   */
  async updateOrderStatus(
    pharmacyIdInput: number,
    orderIdInput: number,
    input: {
      status: 'READY_FOR_COLLECTION' | 'COMPLETED';
    },
  ) {
    const pharmacyId = this.validatePositiveInteger(
      pharmacyIdInput,
      'Pharmacy ID',
    );

    const orderId = this.validatePositiveInteger(
      orderIdInput,
      'Order ID',
    );

    const nextStatus = input?.status;

    if (
      nextStatus !== 'READY_FOR_COLLECTION' &&
      nextStatus !== 'COMPLETED'
    ) {
      throw new BadRequestException(
        'Status must be READY_FOR_COLLECTION or COMPLETED.',
      );
    }

    return this.databaseService.transaction(async (client) => {
      await this.verifyPharmacy(client, pharmacyId);

      const order = await this.getOwnedOrder(
        client,
        pharmacyId,
        orderId,
        true,
      );

      if (
        nextStatus === 'READY_FOR_COLLECTION' &&
        order.status !== 'ACCEPTED'
      ) {
        throw new ConflictException(
          'Only accepted orders can be marked ready for collection.',
        );
      }

      if (nextStatus === 'COMPLETED') {
        throw new ConflictException(
          'Complete the order from the sales point (Online Requests) so the stock is deducted and the payment recorded.',
        );
      }

      const result = await client.query(
        `
          UPDATE public.marketplace_orders
          SET status = $3,
              updated_at = NOW()
          WHERE order_id = $1
            AND pharmacy_id = $2
          RETURNING
            order_id,
            pharmacy_id,
            status,
            payment_method,
            payment_status,
            total,
            updated_at
        `,
        [orderId, pharmacyId, nextStatus],
      );

      return {
        success: true,
        message: `Order status updated to ${nextStatus}.`,
        data: result.rows[0],
      };
    });
  }

  /**
   * Recheck all medicines in an order against current pharmacy stock.
   * This confirms current availability but does not reserve stock.
   */
  async confirmOrderStock(
    pharmacyIdInput: number,
    orderIdInput: number,
  ) {
    const pharmacyId = this.validatePositiveInteger(
      pharmacyIdInput,
      'Pharmacy ID',
    );

    const orderId = this.validatePositiveInteger(
      orderIdInput,
      'Order ID',
    );

    return this.databaseService.transaction(async (client) => {
      await this.verifyPharmacy(client, pharmacyId);

      const order = await this.getOwnedOrder(
        client,
        pharmacyId,
        orderId,
        true,
      );

      if (
        order.status !== 'PENDING' &&
        order.status !== 'ACCEPTED'
      ) {
        throw new ConflictException(
          'Stock can only be confirmed for pending or accepted orders.',
        );
      }

      const itemsResult = await client.query(
        `
          SELECT
            oi.medicine_id,
            oi.quantity,
            m.medicine_name
          FROM public.marketplace_order_items oi
          INNER JOIN public.medicines m
            ON m.medicine_id = oi.medicine_id
          WHERE oi.order_id = $1
          ORDER BY oi.order_item_id ASC
        `,
        [orderId],
      );

      if (itemsResult.rows.length === 0) {
        throw new ConflictException(
          'This order has no items to confirm.',
        );
      }

      const availability = [];

      for (const item of itemsResult.rows) {
        const stockResult = await client.query(
          `
            SELECT
              COALESCE(SUM(ib.quantity), 0)::INTEGER
                AS available_quantity
            FROM public.inventory_batches ib
            WHERE ib.pharmacy_id = $1
              AND ib.medicine_id = $2
              AND ib.quantity > 0
              AND ib.status = 'ACTIVE'
              AND (
                ib.expiry_date IS NULL
                OR ib.expiry_date >= CURRENT_DATE
              )
          `,
          [pharmacyId, item.medicine_id],
        );

        const availableQuantity = Number(
          stockResult.rows[0]?.available_quantity ?? 0,
        );

        const requestedQuantity = Number(item.quantity);

        availability.push({
          medicine_id: Number(item.medicine_id),
          medicine_name: item.medicine_name,
          requested_quantity: requestedQuantity,
          available_quantity: availableQuantity,
          available: availableQuantity >= requestedQuantity,
        });
      }

      const allAvailable = availability.every(
        (item) => item.available,
      );

      return {
        success: true,
        message: allAvailable
          ? 'All ordered medicines are currently available.'
          : 'Some ordered medicines are not available in the requested quantities.',
        data: {
          order_id: orderId,
          pharmacy_id: pharmacyId,
          all_items_available: allAvailable,
          items: availability,
        },
      };
    });
  }

  // =========================================================
  // PHARMACY MARKETPLACE MEDICINES
  // =========================================================

  /**
   * Get medicines with active stock at this pharmacy.
   */
  async getMedicines(pharmacyIdInput: number) {
    const pharmacyId = this.validatePositiveInteger(
      pharmacyIdInput,
      'Pharmacy ID',
    );

    const pharmacy = await this.verifyPharmacy(
      this.databaseService,
      pharmacyId,
    );

    const result = await this.databaseService.query(
      `
        SELECT
          m.medicine_id,
          m.medicine_name,
          m.generic_name,
          m.brand_name,
          m.strength,
          m.dosage_form,
          m.description,
          m.requires_prescription,
          COALESCE(SUM(ib.quantity), 0)::INTEGER
            AS available_quantity,
          MIN(COALESCE(ib.selling_price, ib.unit_price))
            AS lowest_price,
          MAX(COALESCE(ib.selling_price, ib.unit_price))
            AS highest_price,
          BOOL_OR(ib.status = 'ACTIVE') AS available
        FROM public.inventory_batches ib
        INNER JOIN public.medicines m
          ON m.medicine_id = ib.medicine_id
        WHERE ib.pharmacy_id = $1
          AND ib.status IN ('ACTIVE', 'INACTIVE')
          AND ib.quantity > 0
          AND (
            ib.expiry_date IS NULL
            OR ib.expiry_date >= CURRENT_DATE
          )
        GROUP BY
          m.medicine_id,
          m.medicine_name,
          m.generic_name,
          m.brand_name,
          m.strength,
          m.dosage_form,
          m.description,
          m.requires_prescription
        ORDER BY m.medicine_name ASC
      `,
      [pharmacyId],
    );

    return {
      success: true,
      message: 'Pharmacy marketplace medicines retrieved successfully.',
      data: {
        pharmacy,
        medicines: result.rows,
        medicine_count: result.rows.length,
      },
    };
  }

  /**
   * Update availability for all inventory batches of a medicine.
   *
   * This uses the existing inventory_batches.status field.
   * It does not change quantities.
   */
  async updateAvailability(
    pharmacyIdInput: number,
    medicineIdInput: number,
    input: { available: boolean },
  ) {
    const pharmacyId = this.validatePositiveInteger(
      pharmacyIdInput,
      'Pharmacy ID',
    );

    const medicineId = this.validatePositiveInteger(
      medicineIdInput,
      'Medicine ID',
    );

    if (typeof input?.available !== 'boolean') {
      throw new BadRequestException(
        'The available field must be true or false.',
      );
    }

    return this.databaseService.transaction(async (client) => {
      await this.verifyPharmacy(client, pharmacyId);

      const medicineResult = await client.query(
        `
          SELECT medicine_id, medicine_name
          FROM public.medicines
          WHERE medicine_id = $1
          LIMIT 1
        `,
        [medicineId],
      );

      if (medicineResult.rows.length === 0) {
        throw new NotFoundException('Medicine not found.');
      }

      const batchesResult = await client.query(
        `
          SELECT inventory_id
          FROM public.inventory_batches
          WHERE pharmacy_id = $1
            AND medicine_id = $2
          FOR UPDATE
        `,
        [pharmacyId, medicineId],
      );

      if (batchesResult.rows.length === 0) {
        throw new NotFoundException(
          'This pharmacy has no inventory records for this medicine.',
        );
      }

      const nextStatus = input.available ? 'ACTIVE' : 'INACTIVE';

      const updateResult = await client.query(
        `
          UPDATE public.inventory_batches
          SET status = $3
          WHERE pharmacy_id = $1
            AND medicine_id = $2
            AND status = $4
          RETURNING inventory_id
        `,
        [pharmacyId, medicineId, nextStatus, input.available ? 'INACTIVE' : 'ACTIVE'],
      );

      return {
        success: true,
        message: input.available
          ? 'Medicine availability enabled.'
          : 'Medicine availability disabled.',
        data: {
          pharmacy_id: pharmacyId,
          medicine_id: medicineId,
          medicine_name: medicineResult.rows[0].medicine_name,
          available: input.available,
          updated_batch_count: updateResult.rows.length,
        },
      };
    });
  }

  /**
   * Get the current price range for a medicine at this pharmacy.
   */
  async getMedicinePrice(
    pharmacyIdInput: number,
    medicineIdInput: number,
  ) {
    const pharmacyId = this.validatePositiveInteger(
      pharmacyIdInput,
      'Pharmacy ID',
    );

    const medicineId = this.validatePositiveInteger(
      medicineIdInput,
      'Medicine ID',
    );

    await this.verifyPharmacy(
      this.databaseService,
      pharmacyId,
    );

    const result = await this.databaseService.query(
      `
        SELECT
          m.medicine_id,
          m.medicine_name,
          MIN(COALESCE(ib.selling_price, ib.unit_price))
            AS lowest_price,
          MAX(COALESCE(ib.selling_price, ib.unit_price))
            AS highest_price,
          COUNT(ib.inventory_id)::INTEGER AS batch_count
        FROM public.medicines m
        LEFT JOIN public.inventory_batches ib
          ON ib.medicine_id = m.medicine_id
          AND ib.pharmacy_id = $1
          AND ib.status = 'ACTIVE'
          AND ib.quantity > 0
          AND (
            ib.expiry_date IS NULL
            OR ib.expiry_date >= CURRENT_DATE
          )
        WHERE m.medicine_id = $2
        GROUP BY
          m.medicine_id,
          m.medicine_name
        LIMIT 1
      `,
      [pharmacyId, medicineId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Medicine not found.');
    }

    return {
      success: true,
      message: 'Medicine price retrieved successfully.',
      data: result.rows[0],
    };
  }

  /**
   * Update the selling price for active inventory batches
   * of a medicine at this pharmacy.
   */
  async updateMedicinePrice(
    pharmacyIdInput: number,
    medicineIdInput: number,
    input: { price: number },
  ) {
    const pharmacyId = this.validatePositiveInteger(
      pharmacyIdInput,
      'Pharmacy ID',
    );

    const medicineId = this.validatePositiveInteger(
      medicineIdInput,
      'Medicine ID',
    );

    const price = this.validatePrice(input?.price);

    return this.databaseService.transaction(async (client) => {
      await this.verifyPharmacy(client, pharmacyId);

      const medicineResult = await client.query(
        `
          SELECT medicine_id, medicine_name
          FROM public.medicines
          WHERE medicine_id = $1
          LIMIT 1
        `,
        [medicineId],
      );

      if (medicineResult.rows.length === 0) {
        throw new NotFoundException('Medicine not found.');
      }

      const updateResult = await client.query(
        `
          UPDATE public.inventory_batches
          SET selling_price = $3
          WHERE pharmacy_id = $1
            AND medicine_id = $2
            AND status = 'ACTIVE'
            AND quantity > 0
            AND (
              expiry_date IS NULL
              OR expiry_date >= CURRENT_DATE
            )
          RETURNING inventory_id
        `,
        [pharmacyId, medicineId, price],
      );

      if (updateResult.rows.length === 0) {
        throw new NotFoundException(
          'No active stock batches were found for this medicine at your pharmacy.',
        );
      }

      return {
        success: true,
        message: 'Medicine selling price updated successfully.',
        data: {
          pharmacy_id: pharmacyId,
          medicine_id: medicineId,
          medicine_name: medicineResult.rows[0].medicine_name,
          selling_price: price,
          updated_batch_count: updateResult.rows.length,
        },
      };
    });
  }
}
