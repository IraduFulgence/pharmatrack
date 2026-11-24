
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service.js';
import { PatientsService } from '../patients/patients.service.js';
import { UploadService } from '../upload/upload.service.js';
import { rankByFuzzy } from '../common/utils/fuzzy-match.js';

type PaymentMethod = 'CASH_ON_COLLECTION' | 'MOBILE_MONEY';
type MobileMoneyProvider = 'MTN_MOMO' | 'AIRTEL_MONEY';

// A batch a patient can order: in stock, switched on online, not expired,
// at an active approved pharmacy. Used inside correlated subqueries on medicines.
const STOCK_FILTER = `
  ib.medicine_id = medicines.medicine_id
  AND ib.quantity > 0
  AND ib.status = 'ACTIVE'
  AND (ib.expiry_date IS NULL OR ib.expiry_date >= CURRENT_DATE)
  AND p.is_active = TRUE
  AND p.verification_status = 'APPROVED'
`;
const IN_STOCK_SOMEWHERE = `EXISTS (
  SELECT 1 FROM public.inventory_batches ib
  JOIN public.pharmacies p ON p.pharmacy_id = ib.pharmacy_id
  WHERE ${STOCK_FILTER}
)`;

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly patientsService: PatientsService,
    private readonly uploadService: UploadService,
  ) {}

  private validatePositiveInteger(value: unknown, field: string): number {
    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(
        `${field} must be a positive integer.`,
      );
    }

    return parsed;
  }

  private async lockPatientCart(client: any, patientId: number) {
    await client.query(
      `
        INSERT INTO public.marketplace_carts (patient_id)
        VALUES ($1)
        ON CONFLICT (patient_id) DO NOTHING
      `,
      [patientId],
    );

    const result = await client.query(
      `
        SELECT cart_id, patient_id, pharmacy_id
        FROM public.marketplace_carts
        WHERE patient_id = $1
        FOR UPDATE
      `,
      [patientId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Patient cart could not be created.');
    }

    return result.rows[0];
  }

  private async getAvailableStock(
    client: any,
    pharmacyId: number,
    medicineId: number,
  ) {
    const result = await client.query(
      `
        SELECT
          COALESCE(SUM(ib.quantity), 0)::INTEGER AS available_quantity,
          MIN(COALESCE(ib.selling_price, ib.unit_price)) AS unit_price
        FROM public.inventory_batches ib
        INNER JOIN public.pharmacies p
          ON p.pharmacy_id = ib.pharmacy_id
        WHERE ib.pharmacy_id = $1
          AND ib.medicine_id = $2
          AND ib.quantity > 0
          AND ib.status = 'ACTIVE'
          AND (
            ib.expiry_date IS NULL
            OR ib.expiry_date >= CURRENT_DATE
          )
          AND p.is_active = TRUE
          AND p.verification_status = 'APPROVED'
      `,
      [pharmacyId, medicineId],
    );

    return result.rows[0];
  }

  /**
   * Browse the central medicine catalogue.
   */
  async getMedicines(
    search?: string,
    limitInput?: string,
    offsetInput?: string,
  ) {
    const limit = limitInput === undefined ? 20 : Number(limitInput);
    const offset = offsetInput === undefined ? 0 : Number(offsetInput);

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException(
        'Limit must be an integer between 1 and 100.',
      );
    }

    if (!Number.isInteger(offset) || offset < 0) {
      throw new BadRequestException(
        'Offset must be a non-negative integer.',
      );
    }

    const searchTerm = search?.trim();

    if (searchTerm !== undefined && searchTerm.length > 150) {
      throw new BadRequestException(
        'Search term cannot exceed 150 characters.',
      );
    }

    let pageIds: number[] | null = null; // null = no search, list everything
    let total: number;

    if (searchTerm) {
      // Typo tolerant: "paractmol" still finds Paracetamol. The in-stock catalogue is small,
      // so rank the names here and load only the requested page.
      const candidates = await this.databaseService.query(
        `SELECT medicine_id, medicine_name, generic_name, brand_name
         FROM public.medicines
         WHERE ${IN_STOCK_SOMEWHERE}
         ORDER BY medicine_name ASC, medicine_id ASC`,
      );
      const ranked = rankByFuzzy(candidates.rows, searchTerm, (m: any) => [
        m.medicine_name,
        m.generic_name,
        m.brand_name,
      ]);
      total = ranked.length;
      pageIds = ranked.slice(offset, offset + limit).map((m: any) => Number(m.medicine_id));
    } else {
      const countResult = await this.databaseService.query(
        `SELECT COUNT(*)::INTEGER AS total FROM public.medicines WHERE ${IN_STOCK_SOMEWHERE}`,
      );
      total = Number(countResult.rows[0]?.total ?? 0);
    }

    if (pageIds !== null && pageIds.length === 0) {
      return {
        success: true,
        message: 'No medicines match your search.',
        data: [],
        pagination: { total, limit, offset, hasMore: false },
      };
    }

    const dataParams: unknown[] = pageIds === null ? [limit, offset] : [pageIds];
    const medicinesResult = await this.databaseService.query(
      `
        SELECT
          medicine_id,
          medicine_name,
          generic_name,
          brand_name,
          strength,
          dosage_form,
          description,
          requires_prescription,
          CASE WHEN medicine_image_path IS NOT NULL THEN '/medicines/' || medicine_id || '/image?v=' || LEFT(MD5(medicine_image_path), 8) END AS image_url,
          (
            SELECT MIN(COALESCE(ib.selling_price, ib.unit_price))
            FROM public.inventory_batches ib
            JOIN public.pharmacies p ON p.pharmacy_id = ib.pharmacy_id
            WHERE ${STOCK_FILTER}
          ) AS lowest_price,
          (
            SELECT COUNT(DISTINCT ib.pharmacy_id)::INTEGER
            FROM public.inventory_batches ib
            JOIN public.pharmacies p ON p.pharmacy_id = ib.pharmacy_id
            WHERE ${STOCK_FILTER}
          ) AS pharmacy_count
        FROM public.medicines
        WHERE ${IN_STOCK_SOMEWHERE}
        ${pageIds === null
          ? 'ORDER BY medicine_name ASC, medicine_id ASC LIMIT $1 OFFSET $2'
          : 'AND medicine_id = ANY($1::bigint[])'}
      `,
      dataParams,
    );

    // Keep the best matches first when searching.
    if (pageIds !== null) {
      const order = new Map(pageIds.map((id, i) => [id, i]));
      medicinesResult.rows.sort(
        (a: any, b: any) => (order.get(Number(a.medicine_id)) ?? 0) - (order.get(Number(b.medicine_id)) ?? 0),
      );
    }

    return {
      success: true,
      message: 'Medicine catalogue retrieved successfully.',
      data: medicinesResult.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + medicinesResult.rows.length < total,
      },
    };
  }

  /**
   * Retrieve one medicine from the central catalogue.
   */
  async getMedicineDetails(medicineId: number) {
    if (!Number.isSafeInteger(medicineId) || medicineId <= 0) {
      throw new BadRequestException('Invalid medicine ID.');
    }

    const result = await this.databaseService.query(
      `
        SELECT
          medicine_id,
          medicine_name,
          generic_name,
          brand_name,
          strength,
          dosage_form,
          description,
          requires_prescription,
          CASE WHEN medicine_image_path IS NOT NULL THEN '/medicines/' || medicine_id || '/image?v=' || LEFT(MD5(medicine_image_path), 8) END AS image_url
        FROM public.medicines
        WHERE medicine_id = $1
        LIMIT 1
      `,
      [medicineId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Medicine not found.');
    }

    return {
      success: true,
      message: 'Medicine details retrieved successfully.',
      data: result.rows[0],
    };
  }

  /**
   * Compare pharmacies offering a particular medicine.
   */
  async getMedicinePharmacies(medicineId: number) {
    if (!Number.isSafeInteger(medicineId) || medicineId <= 0) {
      throw new BadRequestException('Invalid medicine ID.');
    }

    const medicineResult = await this.databaseService.query(
      `
        SELECT
          medicine_id,
          medicine_name,
          generic_name,
          brand_name,
          strength,
          dosage_form,
          description,
          requires_prescription,
          CASE WHEN medicine_image_path IS NOT NULL THEN '/medicines/' || medicine_id || '/image?v=' || LEFT(MD5(medicine_image_path), 8) END AS image_url
        FROM public.medicines
        WHERE medicine_id = $1
        LIMIT 1
      `,
      [medicineId],
    );

    if (medicineResult.rows.length === 0) {
      throw new NotFoundException('Medicine not found.');
    }

    const pharmacyResult = await this.databaseService.query(
      `
        SELECT
          p.pharmacy_id,
          p.pharmacy_name,
          p.phone_number,
          p.location_address,
          p.latitude,
          p.longitude,
          SUM(ib.quantity)::INTEGER AS available_quantity,
          MIN(COALESCE(ib.selling_price, ib.unit_price)) AS lowest_price,
          MAX(COALESCE(ib.selling_price, ib.unit_price)) AS highest_price
        FROM public.inventory_batches ib
        INNER JOIN public.pharmacies p
          ON p.pharmacy_id = ib.pharmacy_id
        WHERE ib.medicine_id = $1
          AND ib.quantity > 0
          AND ib.status = 'ACTIVE'
          AND (ib.expiry_date IS NULL OR ib.expiry_date >= CURRENT_DATE)
          AND p.is_active = TRUE
          AND p.verification_status = 'APPROVED'
        GROUP BY
          p.pharmacy_id,
          p.pharmacy_name,
          p.phone_number,
          p.location_address,
          p.latitude,
          p.longitude
        ORDER BY lowest_price ASC NULLS LAST, p.pharmacy_id ASC
      `,
      [medicineId],
    );

    return {
      success: true,
      message: 'Pharmacy comparison retrieved successfully.',
      data: {
        medicine: medicineResult.rows[0],
        pharmacies: pharmacyResult.rows,
        pharmacy_count: pharmacyResult.rows.length,
      },
    };
  }

  /**
   * Browse medicines with available stock at one approved pharmacy.
   */
  async getPharmacyMedicines(pharmacyId: number) {
    if (!Number.isSafeInteger(pharmacyId) || pharmacyId <= 0) {
      throw new BadRequestException('Invalid pharmacy ID.');
    }

    const pharmacyResult = await this.databaseService.query(
      `
        SELECT
          pharmacy_id,
          phone_number,
          location_address,
          latitude,
          longitude
        FROM public.pharmacies
        WHERE pharmacy_id = $1
          AND is_active = TRUE
          AND verification_status = 'APPROVED'
        LIMIT 1
      `,
      [pharmacyId],
    );

    if (pharmacyResult.rows.length === 0) {
      throw new NotFoundException('Approved pharmacy not found.');
    }

    const medicinesResult = await this.databaseService.query(
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
          SUM(ib.quantity)::INTEGER AS available_quantity,
          MIN(COALESCE(ib.selling_price, ib.unit_price)) AS lowest_price,
          MAX(COALESCE(ib.selling_price, ib.unit_price)) AS highest_price
        FROM public.inventory_batches ib
        INNER JOIN public.medicines m
          ON m.medicine_id = ib.medicine_id
        WHERE ib.pharmacy_id = $1
          AND ib.quantity > 0
          AND ib.status = 'ACTIVE'
          AND (ib.expiry_date IS NULL OR ib.expiry_date >= CURRENT_DATE)
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
      message: 'Pharmacy medicines retrieved successfully.',
      data: {
        pharmacy: pharmacyResult.rows[0],
        medicines: medicinesResult.rows,
        medicine_count: medicinesResult.rows.length,
      },
    };
  }

  /**
   * Search medicines and retrieve pharmacies reporting available stock.
   */
  async searchMedicines(name: string) {
    return this.patientsService.searchMedicines(name);
  }

  /**
   * Find nearby approved pharmacies.
   */
  async getNearbyPharmacies(
    latitude: string,
    longitude: string,
    medicineId?: string,
  ) {
    return this.patientsService.getNearbyPharmacies(
      latitude,
      longitude,
      medicineId,
    );
  }

  // =========================================================
  // CART OPERATIONS
  // =========================================================

  /**
   * Add a medicine to the patient's single-pharmacy cart.
   */
  async addCartItem(
    patientIdInput: number,
    input: {
      pharmacyId: number;
      medicineId: number;
      quantity: number;
    },
  ) {
    const patientId = this.validatePositiveInteger(
      patientIdInput,
      'Patient ID',
    );
    const pharmacyId = this.validatePositiveInteger(
      input?.pharmacyId,
      'Pharmacy ID',
    );
    const medicineId = this.validatePositiveInteger(
      input?.medicineId,
      'Medicine ID',
    );
    const quantity = this.validatePositiveInteger(
      input?.quantity,
      'Quantity',
    );

    return this.databaseService.transaction(async (client) => {
      const cart = await this.lockPatientCart(client, patientId);

      if (
        cart.pharmacy_id !== null &&
        Number(cart.pharmacy_id) !== pharmacyId
      ) {
        throw new ConflictException(
          'Your cart already contains medicines from another pharmacy. Remove all current items before choosing a different pharmacy.',
        );
      }

      const stock = await this.getAvailableStock(
        client,
        pharmacyId,
        medicineId,
      );

      if (
        Number(stock.available_quantity) <= 0 ||
        stock.unit_price === null
      ) {
        throw new ConflictException(
          'This medicine is currently unavailable at the selected pharmacy.',
        );
      }

      const existingResult = await client.query(
        `
          SELECT item_id, quantity
          FROM public.marketplace_cart_items
          WHERE cart_id = $1 AND medicine_id = $2
          FOR UPDATE
        `,
        [cart.cart_id, medicineId],
      );

      const existingQuantity = Number(
        existingResult.rows[0]?.quantity ?? 0,
      );
      const newQuantity = existingQuantity + quantity;
      const availableQuantity = Number(stock.available_quantity);

      if (newQuantity > availableQuantity) {
        throw new ConflictException(
          `Only ${availableQuantity} unit(s) are currently available at this pharmacy.`,
        );
      }

      await client.query(
        `
          UPDATE public.marketplace_carts
          SET pharmacy_id = $2, updated_at = NOW()
          WHERE cart_id = $1
        `,
        [cart.cart_id, pharmacyId],
      );

      if (existingResult.rows.length > 0) {
        await client.query(
          `
            UPDATE public.marketplace_cart_items
            SET quantity = $3,
                unit_price = $4,
                updated_at = NOW()
            WHERE cart_id = $1 AND medicine_id = $2
          `,
          [cart.cart_id, medicineId, newQuantity, stock.unit_price],
        );
      } else {
        await client.query(
          `
            INSERT INTO public.marketplace_cart_items
              (cart_id, medicine_id, quantity, unit_price)
            VALUES ($1, $2, $3, $4)
          `,
          [cart.cart_id, medicineId, quantity, stock.unit_price],
        );
      }

      return {
        success: true,
        message: 'Medicine added to cart successfully.',
        data: {
          cart_id: Number(cart.cart_id),
          pharmacy_id: pharmacyId,
          medicine_id: medicineId,
          quantity: newQuantity,
          available_quantity: availableQuantity,
          unit_price: stock.unit_price,
        },
      };
    });
  }

  /**
   * Get the authenticated patient's cart.
   */
  async getCart(patientIdInput: number) {
    const patientId = this.validatePositiveInteger(
      patientIdInput,
      'Patient ID',
    );

    const cartResult = await this.databaseService.query(
      `
        SELECT
          c.cart_id,
          c.patient_id,
          c.pharmacy_id,
          c.created_at,
          c.updated_at,
          p.phone_number AS pharmacy_phone,
          p.location_address AS pharmacy_address
        FROM public.marketplace_carts c
        LEFT JOIN public.pharmacies p
          ON p.pharmacy_id = c.pharmacy_id
        WHERE c.patient_id = $1
        LIMIT 1
      `,
      [patientId],
    );

    if (cartResult.rows.length === 0) {
      return {
        success: true,
        message: 'Your cart is empty.',
        data: {
          cart: null,
          items: [],
          item_count: 0,
          total: 0,
        },
      };
    }

    const cart = cartResult.rows[0];

    const itemsResult = await this.databaseService.query(
      `
        SELECT
          ci.item_id,
          ci.medicine_id,
          ci.quantity,
          ci.unit_price,
          (ci.quantity * ci.unit_price)::NUMERIC(12,2) AS subtotal,
          m.medicine_name,
          m.generic_name,
          m.brand_name,
          m.strength,
          m.dosage_form,
          m.requires_prescription,
          CASE WHEN m.medicine_image_path IS NOT NULL THEN '/medicines/' || m.medicine_id || '/image?v=' || LEFT(MD5(m.medicine_image_path), 8) END AS image_url
        FROM public.marketplace_cart_items ci
        INNER JOIN public.medicines m
          ON m.medicine_id = ci.medicine_id
        WHERE ci.cart_id = $1
        ORDER BY ci.created_at ASC, ci.item_id ASC
      `,
      [cart.cart_id],
    );

    const total = itemsResult.rows.reduce(
      (sum: number, item: any) => sum + Number(item.subtotal),
      0,
    );

    return {
      success: true,
      message: 'Cart retrieved successfully.',
      data: {
        cart,
        items: itemsResult.rows,
        item_count: itemsResult.rows.length,
        total: Number(total.toFixed(2)),
      },
    };
  }

  /**
   * Change the quantity of an item already in the patient's cart.
   */
  async updateCartItem(
    patientIdInput: number,
    itemIdInput: number,
    quantityInput: number,
  ) {
    const patientId = this.validatePositiveInteger(
      patientIdInput,
      'Patient ID',
    );
    const itemId = this.validatePositiveInteger(itemIdInput, 'Item ID');
    const quantity = this.validatePositiveInteger(
      quantityInput,
      'Quantity',
    );

    return this.databaseService.transaction(async (client) => {
      const cart = await this.lockPatientCart(client, patientId);

      if (cart.pharmacy_id === null) {
        throw new NotFoundException('Your cart is empty.');
      }

      const itemResult = await client.query(
        `
          SELECT item_id, medicine_id
          FROM public.marketplace_cart_items
          WHERE item_id = $1 AND cart_id = $2
          FOR UPDATE
        `,
        [itemId, cart.cart_id],
      );

      if (itemResult.rows.length === 0) {
        throw new NotFoundException('Cart item not found.');
      }

      const medicineId = Number(itemResult.rows[0].medicine_id);
      const stock = await this.getAvailableStock(
        client,
        Number(cart.pharmacy_id),
        medicineId,
      );

      const availableQuantity = Number(stock.available_quantity);

      if (
        availableQuantity < quantity ||
        stock.unit_price === null
      ) {
        throw new ConflictException(
          `The requested quantity is not available. Current available quantity: ${availableQuantity}.`,
        );
      }

      await client.query(
        `
          UPDATE public.marketplace_cart_items
          SET quantity = $2,
              unit_price = $3,
              updated_at = NOW()
          WHERE item_id = $1
        `,
        [itemId, quantity, stock.unit_price],
      );

      return {
        success: true,
        message: 'Cart quantity updated successfully.',
        data: {
          item_id: itemId,
          medicine_id: medicineId,
          quantity,
          unit_price: stock.unit_price,
          available_quantity: availableQuantity,
        },
      };
    });
  }

  /**
   * Remove an item from the patient's cart.
   * When the last item is removed, release the pharmacy selection.
   */
  async removeCartItem(
    patientIdInput: number,
    itemIdInput: number,
  ) {
    const patientId = this.validatePositiveInteger(
      patientIdInput,
      'Patient ID',
    );
    const itemId = this.validatePositiveInteger(itemIdInput, 'Item ID');

    return this.databaseService.transaction(async (client) => {
      const cart = await this.lockPatientCart(client, patientId);

      const deleteResult = await client.query(
        `
          DELETE FROM public.marketplace_cart_items
          WHERE item_id = $1 AND cart_id = $2
          RETURNING item_id, medicine_id
        `,
        [itemId, cart.cart_id],
      );

      if (deleteResult.rows.length === 0) {
        throw new NotFoundException('Cart item not found.');
      }

      const remainingResult = await client.query(
        `
          SELECT COUNT(*)::INTEGER AS item_count
          FROM public.marketplace_cart_items
          WHERE cart_id = $1
        `,
        [cart.cart_id],
      );

      const remainingItems = Number(
        remainingResult.rows[0].item_count,
      );

      if (remainingItems === 0) {
        await client.query(
          `
            UPDATE public.marketplace_carts
            SET pharmacy_id = NULL, updated_at = NOW()
            WHERE cart_id = $1
          `,
          [cart.cart_id],
        );
      } else {
        await client.query(
          `
            UPDATE public.marketplace_carts
            SET updated_at = NOW()
            WHERE cart_id = $1
          `,
          [cart.cart_id],
        );
      }

      return {
        success: true,
        message: 'Medicine removed from cart successfully.',
        data: {
          removed_item: deleteResult.rows[0],
          remaining_item_count: remainingItems,
          pharmacy_selection_cleared: remainingItems === 0,
        },
      };
    });
  }

  // =========================================================
  // PATIENT MARKETPLACE ORDERS
  // =========================================================

  /**
   * Place an order from the patient's single-pharmacy cart.
   *
   * Prices and stock are checked again during checkout.
   * This method does not deduct inventory quantities.
   */
  async createOrder(
    patientIdInput: number,
    input: {
      paymentMethod: PaymentMethod;
      mobileMoneyProvider?: MobileMoneyProvider;
      paymentPhoneNumber?: string;
      prescriptionReference?: string;
    },
    prescriptionFile?: Express.Multer.File,
  ) {
    const patientId = this.validatePositiveInteger(
      patientIdInput,
      'Patient ID',
    );

    if (!input || !input.paymentMethod) {
      throw new BadRequestException('Payment method is required.');
    }

    const paymentMethod = input.paymentMethod;

    if (
      paymentMethod !== 'CASH_ON_COLLECTION' &&
      paymentMethod !== 'MOBILE_MONEY'
    ) {
      throw new BadRequestException('Invalid payment method.');
    }

    let mobileMoneyProvider: MobileMoneyProvider | null = null;
    let paymentPhoneNumber: string | null = null;

    if (paymentMethod === 'MOBILE_MONEY') {
      if (
        input.mobileMoneyProvider !== 'MTN_MOMO' &&
        input.mobileMoneyProvider !== 'AIRTEL_MONEY'
      ) {
        throw new BadRequestException(
          'Select MTN MoMo or Airtel Money for Mobile Money payment.',
        );
      }

      const phone = input.paymentPhoneNumber?.trim();

      if (!phone || phone.length < 9 || phone.length > 20) {
        throw new BadRequestException(
          'A valid Mobile Money phone number is required.',
        );
      }

      mobileMoneyProvider = input.mobileMoneyProvider;
      paymentPhoneNumber = phone;
    } else if (
      input.mobileMoneyProvider ||
      input.paymentPhoneNumber
    ) {
      throw new BadRequestException(
        'Mobile Money provider and phone number should only be supplied for Mobile Money payments.',
      );
    }

    const prescriptionReference = input.prescriptionReference?.trim() || null;
    if (prescriptionReference && prescriptionReference.length > 100) {
      throw new BadRequestException('The prescription number cannot exceed 100 characters.');
    }

    // Save the photo first; it is removed again if the order fails.
    const prescriptionImagePath = prescriptionFile
      ? await this.uploadService.savePrescriptionImage(patientId, prescriptionFile)
      : null;

    try {
    return await this.databaseService.transaction(async (client) => {
      const cart = await this.lockPatientCart(client, patientId);

      if (cart.pharmacy_id === null) {
        throw new ConflictException(
          'Your cart is empty. Add medicines before placing an order.',
        );
      }

      const pharmacyId = this.validatePositiveInteger(
        cart.pharmacy_id,
        'Pharmacy ID',
      );

      const pharmacyResult = await client.query(
        `
          SELECT pharmacy_id
          FROM public.pharmacies
          WHERE pharmacy_id = $1
            AND is_active = TRUE
            AND verification_status = 'APPROVED'
          FOR SHARE
        `,
        [pharmacyId],
      );

      if (pharmacyResult.rows.length === 0) {
        throw new ConflictException(
          'The selected pharmacy is no longer active or approved.',
        );
      }

      const cartItemsResult = await client.query(
        `
          SELECT
            ci.item_id,
            ci.medicine_id,
            ci.quantity,
            ci.unit_price,
            m.medicine_name,
            m.requires_prescription
          FROM public.marketplace_cart_items ci
          INNER JOIN public.medicines m
            ON m.medicine_id = ci.medicine_id
          WHERE ci.cart_id = $1
          ORDER BY ci.item_id ASC
          FOR UPDATE OF ci
        `,
        [cart.cart_id],
      );

      if (cartItemsResult.rows.length === 0) {
        throw new ConflictException(
          'Your cart is empty. Add medicines before placing an order.',
        );
      }

      const rxNames = cartItemsResult.rows
        .filter((item: any) => item.requires_prescription)
        .map((item: any) => item.medicine_name);
      if (rxNames.length > 0 && !prescriptionReference && !prescriptionImagePath) {
        throw new BadRequestException(
          `A prescription is needed for: ${rxNames.join(', ')}. Add the prescription number or a photo of it.`,
        );
      }

      const orderItems: Array<{
        medicineId: number;
        medicineName: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }> = [];

      let total = 0;

      for (const item of cartItemsResult.rows) {
        const medicineId = this.validatePositiveInteger(
          item.medicine_id,
          'Medicine ID',
        );
        const quantity = this.validatePositiveInteger(
          item.quantity,
          'Quantity',
        );

        const stock = await this.getAvailableStock(
          client,
          pharmacyId,
          medicineId,
        );

        const availableQuantity = Number(stock.available_quantity);

        if (
          stock.unit_price === null ||
          availableQuantity < quantity
        ) {
          throw new ConflictException(
            `${item.medicine_name} is no longer available in the requested quantity. Available quantity: ${availableQuantity}.`,
          );
        }

        const unitPrice = Number(stock.unit_price);

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new ConflictException(
            `A valid price is not available for ${item.medicine_name}.`,
          );
        }

        const subtotal = Number(
          (unitPrice * quantity).toFixed(2),
        );

        total += subtotal;

        orderItems.push({
          medicineId,
          medicineName: item.medicine_name,
          quantity,
          unitPrice,
          subtotal,
        });
      }

      total = Number(total.toFixed(2));

      const orderResult = await client.query(
        `
          INSERT INTO public.marketplace_orders (
            patient_id,
            pharmacy_id,
            status,
            payment_method,
            payment_status,
            mobile_money_provider,
            payment_phone_number,
            subtotal,
            total,
            prescription_reference,
            prescription_image_path
          )
          VALUES (
            $1,
            $2,
            'PENDING',
            $3,
            'PENDING',
            $4,
            $5,
            $6,
            $6,
            $7,
            $8
          )
          RETURNING
            order_id,
            patient_id,
            pharmacy_id,
            status,
            payment_method,
            payment_status,
            mobile_money_provider,
            payment_phone_number,
            subtotal,
            total,
            created_at
        `,
        [
          patientId,
          pharmacyId,
          paymentMethod,
          mobileMoneyProvider,
          paymentPhoneNumber,
          total,
          prescriptionReference,
          prescriptionImagePath,
        ],
      );

      const order = orderResult.rows[0];

      for (const item of orderItems) {
        await client.query(
          `
            INSERT INTO public.marketplace_order_items (
              order_id,
              medicine_id,
              quantity,
              unit_price,
              subtotal
            )
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            order.order_id,
            item.medicineId,
            item.quantity,
            item.unitPrice,
            item.subtotal,
          ],
        );
      }

      await client.query(
        `
          DELETE FROM public.marketplace_cart_items
          WHERE cart_id = $1
        `,
        [cart.cart_id],
      );

      await client.query(
        `
          UPDATE public.marketplace_carts
          SET pharmacy_id = NULL,
              updated_at = NOW()
          WHERE cart_id = $1
        `,
        [cart.cart_id],
      );

      return {
        success: true,
        message: 'Your order has been placed successfully.',
        data: {
          order,
          items: orderItems,
          item_count: orderItems.length,
          total,
          payment_message:
            paymentMethod === 'CASH_ON_COLLECTION'
              ? 'Payment is due when you collect your order.'
              : 'Mobile Money payment is pending provider confirmation.',
        },
      };
    });
    } catch (error) {
      if (prescriptionImagePath) {
        await this.uploadService.removeStoredFile(prescriptionImagePath, 'prescriptions');
      }
      throw error;
    }
  }

  /**
   * A patient looks up one of their own prescriptions by its number or SMS code
   * and sees the medicines on it, with where they can be ordered.
   * Another patient's prescription is reported as not found.
   */
  async lookupPrescription(patientIdInput: number, referenceInput: string) {
    const patientId = this.validatePositiveInteger(patientIdInput, 'Patient ID');
    const reference = (referenceInput ?? '').trim();
    if (!reference) {
      throw new BadRequestException('Enter your prescription number or SMS code.');
    }
    if (reference.length > 100) {
      throw new BadRequestException('Prescription number cannot exceed 100 characters.');
    }

    const prescriptionResult = await this.databaseService.query(
      `SELECT prescription_id, prescription_reference, status,
              to_char(issued_date, 'YYYY-MM-DD') AS issued_date
       FROM public.prescriptions
       WHERE LOWER(prescription_reference) = LOWER($1) AND patient_id = $2`,
      [reference, patientId],
    );
    const prescription = prescriptionResult.rows[0];
    if (!prescription) {
      throw new NotFoundException(
        'No prescription with that number was found on your account. Check the number, or attach a photo of the prescription when you order.',
      );
    }

    const itemsResult = await this.databaseService.query(
      `SELECT
         medicines.medicine_id,
         medicines.medicine_name,
         medicines.generic_name,
         medicines.brand_name,
         medicines.strength,
         medicines.dosage_form,
         medicines.requires_prescription,
         CASE WHEN medicines.medicine_image_path IS NOT NULL
           THEN '/medicines/' || medicines.medicine_id || '/image?v=' || LEFT(MD5(medicines.medicine_image_path), 8)
         END AS image_url,
         pi.quantity,
         pi.dosage_instructions,
         (
           SELECT MIN(COALESCE(ib.selling_price, ib.unit_price))
           FROM public.inventory_batches ib
           JOIN public.pharmacies p ON p.pharmacy_id = ib.pharmacy_id
           WHERE ${STOCK_FILTER}
         ) AS lowest_price,
         (
           SELECT COUNT(DISTINCT ib.pharmacy_id)::INTEGER
           FROM public.inventory_batches ib
           JOIN public.pharmacies p ON p.pharmacy_id = ib.pharmacy_id
           WHERE ${STOCK_FILTER}
         ) AS pharmacy_count
       FROM public.prescription_items pi
       JOIN public.medicines ON medicines.medicine_id = pi.medicine_id
       WHERE pi.prescription_id = $1
       ORDER BY pi.prescription_item_id ASC`,
      [prescription.prescription_id],
    );

    const status = String(prescription.status || 'ACTIVE').toUpperCase();
    const problem =
      status === 'FULFILLED'
        ? 'This prescription has already been dispensed.'
        : status === 'CANCELLED'
          ? 'This prescription was cancelled.'
          : status === 'EXPIRED'
            ? 'This prescription has expired.'
            : null;

    return {
      success: true,
      message: 'Prescription found.',
      data: {
        prescription: {
          prescription_id: Number(prescription.prescription_id),
          prescription_reference: prescription.prescription_reference,
          status,
          issued_date: prescription.issued_date,
          usable: problem === null,
          problem,
        },
        items: itemsResult.rows.map((row: any) => ({
          ...row,
          medicine_id: Number(row.medicine_id),
          quantity: Number(row.quantity),
          pharmacy_count: Number(row.pharmacy_count || 0),
          in_stock: Number(row.pharmacy_count || 0) > 0,
        })),
      },
    };
  }

  /**
   * Retrieve all orders belonging to the authenticated patient.
   */
  async getPatientOrders(patientIdInput: number) {
    const patientId = this.validatePositiveInteger(
      patientIdInput,
      'Patient ID',
    );

    const result = await this.databaseService.query(
      `
        SELECT
          o.order_id,
          o.pharmacy_id,
          p.pharmacy_name,
          p.phone_number AS pharmacy_phone,
          p.location_address AS pharmacy_address,
          o.status,
          o.payment_method,
          o.payment_status,
          o.mobile_money_provider,
          o.subtotal,
          o.total,
          o.rejection_reason,
          o.created_at,
          o.updated_at,
          COUNT(oi.order_item_id)::INTEGER AS item_count
        FROM public.marketplace_orders o
        LEFT JOIN public.pharmacies p
          ON p.pharmacy_id = o.pharmacy_id
        LEFT JOIN public.marketplace_order_items oi
          ON oi.order_id = o.order_id
        WHERE o.patient_id = $1
        GROUP BY
          o.order_id,
          o.pharmacy_id,
          p.pharmacy_name,
          p.phone_number,
          p.location_address
        ORDER BY o.created_at DESC, o.order_id DESC
      `,
      [patientId],
    );

    return {
      success: true,
      message: 'Your orders were retrieved successfully.',
      data: result.rows,
      order_count: result.rows.length,
    };
  }

  /**
   * Retrieve one order, ensuring it belongs to the patient.
   */
  async getPatientOrder(
    patientIdInput: number,
    orderIdInput: number,
  ) {
    const patientId = this.validatePositiveInteger(
      patientIdInput,
      'Patient ID',
    );
    const orderId = this.validatePositiveInteger(
      orderIdInput,
      'Order ID',
    );

    const orderResult = await this.databaseService.query(
      `
        SELECT
          o.order_id,
          o.patient_id,
          o.pharmacy_id,
          p.pharmacy_name,
          p.phone_number AS pharmacy_phone,
          p.location_address AS pharmacy_address,
          o.status,
          o.payment_method,
          o.payment_status,
          o.mobile_money_provider,
          o.payment_phone_number,
          o.subtotal,
          o.total,
          o.rejection_reason,
          o.prescription_reference,
          (o.prescription_image_path IS NOT NULL) AS has_prescription_image,
          o.created_at,
          o.updated_at
        FROM public.marketplace_orders o
        LEFT JOIN public.pharmacies p
          ON p.pharmacy_id = o.pharmacy_id
        WHERE o.order_id = $1
          AND o.patient_id = $2
        LIMIT 1
      `,
      [orderId, patientId],
    );

    if (orderResult.rows.length === 0) {
      throw new NotFoundException('Order not found.');
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

    return {
      success: true,
      message: 'Order details retrieved successfully.',
      data: {
        order: orderResult.rows[0],
        items: itemsResult.rows,
        item_count: itemsResult.rows.length,
      },
    };
  }

  /**
   * A patient may cancel an order while it is still pending.
   * Accepted or fulfilled orders cannot be cancelled through this route.
   */
  async cancelPatientOrder(
    patientIdInput: number,
    orderIdInput: number,
  ) {
    const patientId = this.validatePositiveInteger(
      patientIdInput,
      'Patient ID',
    );
    const orderId = this.validatePositiveInteger(
      orderIdInput,
      'Order ID',
    );

    return this.databaseService.transaction(async (client) => {
      const orderResult = await client.query(
        `
          SELECT
            order_id,
            status,
            payment_status
          FROM public.marketplace_orders
          WHERE order_id = $1
            AND patient_id = $2
          FOR UPDATE
        `,
        [orderId, patientId],
      );

      if (orderResult.rows.length === 0) {
        throw new NotFoundException('Order not found.');
      }

      const order = orderResult.rows[0];

      if (order.status !== 'PENDING') {
        throw new ConflictException(
          'Only pending orders can be cancelled by the patient.',
        );
      }

      if (order.payment_status === 'PAID') {
        throw new ConflictException(
          'This order has already been paid. Contact the pharmacy to request cancellation or a refund.',
        );
      }

      const updateResult = await client.query(
        `
          UPDATE public.marketplace_orders
          SET status = 'CANCELLED',
              updated_at = NOW()
          WHERE order_id = $1
            AND patient_id = $2
            AND status = 'PENDING'
          RETURNING
            order_id,
            status,
            payment_method,
            payment_status,
            updated_at
        `,
        [orderId, patientId],
      );

      if (updateResult.rows.length === 0) {
        throw new ConflictException(
          'The order could not be cancelled because its status has changed.',
        );
      }

      return {
        success: true,
        message: 'Your order has been cancelled successfully.',
        data: updateResult.rows[0],
      };
    });
  }
}
