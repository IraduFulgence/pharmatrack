
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service.js';
import { rankByFuzzy } from '../common/utils/fuzzy-match.js';

@Injectable()
export class PatientsService {
  constructor(private readonly db: DatabaseService) {}

  // ─────────────────────────────────────────
  // MEDICINE SEARCH
  // ─────────────────────────────────────────

  /**
   * Search the medicine catalogue and find pharmacies
   * that currently have the medicine in stock.
   */
  async searchMedicines(name: string) {
    if (!name || !name.trim()) {
      throw new BadRequestException('Medicine name is required');
    }

    if (name.trim().length > 150) {
      throw new BadRequestException('Search term cannot exceed 150 characters.');
    }

    // Typo tolerant: "paractmol" still finds Paracetamol. Also matches a tag ("headache")
    // or a category ("painkillers"), so patients can search by what they need it for.
    const allMedicines = await this.db.query(
      `SELECT
         m.medicine_id,
         m.medicine_name,
         m.generic_name,
         m.brand_name,
         m.strength,
         m.dosage_form,
         m.requires_prescription,
         m.category_id,
         mc.category_name,
         m.indications,
         m.min_age_years,
         m.max_age_years,
         m.dosage_notes
       FROM public.medicines m
       LEFT JOIN public.medicine_categories mc ON mc.category_id = m.category_id
       ORDER BY m.medicine_name ASC`,
    );
    const medicineResult = {
      rows: rankByFuzzy(allMedicines.rows, name, (m: any) => [
        m.medicine_name,
        m.generic_name,
        m.brand_name,
        m.category_name,
        ...(m.indications || []),
      ]).slice(0, 10),
    };

    if (medicineResult.rows.length === 0) {
      return {
        success: true,
        message: 'No medicines found with that name.',
        data: [],
      };
    }

    const medicinesWithPharmacies = await Promise.all(
      medicineResult.rows.map(async (medicine) => {
        const pharmacyResult = await this.db.query(
          `SELECT
             p.pharmacy_id,
             p.pharmacy_name,
             p.phone_number,
             p.location_address,
             p.latitude,
             p.longitude,
             -- Minus units already held by open online orders.
             (COALESCE(SUM(ib.quantity), 0) - COALESCE((
               SELECT SUM(oi.quantity)
               FROM public.marketplace_order_items oi
               JOIN public.marketplace_orders o ON o.order_id = oi.order_id
               WHERE o.pharmacy_id = p.pharmacy_id
                 AND oi.medicine_id = $1
                 AND o.status IN ('PENDING', 'ACCEPTED', 'READY_FOR_COLLECTION')
             ), 0))::INTEGER AS quantity_available,
             MIN(COALESCE(ib.selling_price, ib.unit_price)) AS unit_price
           FROM public.inventory_batches ib
           JOIN public.pharmacies p
             ON p.pharmacy_id = ib.pharmacy_id
           WHERE ib.medicine_id = $1
             AND ib.quantity > 0
             AND ib.status = 'ACTIVE'
             AND p.is_active = TRUE
             AND p.verification_status = 'APPROVED'
             AND (
               ib.expiry_date IS NULL
               OR ib.expiry_date >= CURRENT_DATE
             )
           GROUP BY
             p.pharmacy_id,
             p.pharmacy_name,
             p.phone_number,
             p.location_address,
             p.latitude,
             p.longitude
           HAVING COALESCE(SUM(ib.quantity), 0) - COALESCE((
               SELECT SUM(oi.quantity)
               FROM public.marketplace_order_items oi
               JOIN public.marketplace_orders o ON o.order_id = oi.order_id
               WHERE o.pharmacy_id = p.pharmacy_id
                 AND oi.medicine_id = $1
                 AND o.status IN ('PENDING', 'ACCEPTED', 'READY_FOR_COLLECTION')
             ), 0) > 0
           ORDER BY p.pharmacy_name ASC`,
          [medicine.medicine_id],
        );

        return {
          medicine,
          pharmacies: pharmacyResult.rows,
        };
      }),
    );

    return {
      success: true,
      message: 'Medicines retrieved successfully',
      data: medicinesWithPharmacies,
    };
  }

  // ─────────────────────────────────────────
  // NEARBY PHARMACIES
  // ─────────────────────────────────────────

  /**
   * Find pharmacies near the patient's location.
   */
  async getNearbyPharmacies(
    latitude: string,
    longitude: string,
    medicineId?: string,
  ) {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      throw new BadRequestException(
        'Valid latitude and longitude are required',
      );
    }

    let query = `
      SELECT
        pharmacy_id,
        pharmacy_name,
        phone_number,
        email,
        location_address,
        latitude,
        longitude,
        (
          6371 * ACOS(
            LEAST(
              1,
              GREATEST(
                -1,
                COS(RADIANS($1))
                * COS(RADIANS(latitude))
                * COS(RADIANS(longitude) - RADIANS($2))
                + SIN(RADIANS($1))
                * SIN(RADIANS(latitude))
              )
            )
          )
        ) AS distance_km
      FROM public.pharmacies
      WHERE
        is_active = TRUE
        AND verification_status = 'APPROVED'
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
    `;

    const params: any[] = [lat, lng];

    if (medicineId) {
      query += `
        AND pharmacy_id IN (
          SELECT ib.pharmacy_id
          FROM public.inventory_batches ib
          WHERE ib.medicine_id = $3
            AND ib.quantity > 0
        )
      `;

      params.push(Number(medicineId));
    }

    query += ` ORDER BY distance_km ASC LIMIT 20`;

    const result = await this.db.query(query, params);

    return {
      success: true,
      message: 'Nearby pharmacies retrieved successfully',
      count: result.rows.length,
      pharmacies: result.rows,
    };
  }

  // ─────────────────────────────────────────
  // PATIENT CHAT
  // ─────────────────────────────────────────

  /**
   * 1. Start a conversation with a pharmacy.
   *
   * One patient has one shared conversation per pharmacy.
   */
  async startChat(
    patientUserId: number,
    pharmacyId: number,
  ) {
    if (
      !Number.isInteger(pharmacyId) ||
      pharmacyId <= 0
    ) {
      throw new BadRequestException(
        'A valid pharmacy ID is required.',
      );
    }

    const pharmacyResult = await this.db.query(
      `SELECT pharmacy_id, pharmacy_name
       FROM public.pharmacies
       WHERE pharmacy_id = $1
         AND is_active = TRUE
         AND verification_status = 'APPROVED'`,
      [pharmacyId],
    );

    if (pharmacyResult.rows.length === 0) {
      throw new NotFoundException(
        'Active approved pharmacy not found.',
      );
    }

    const result = await this.db.query(
      `INSERT INTO public.patient_chats
         (
           patient_user_id,
           pharmacy_id,
           created_at,
           updated_at
         )
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (patient_user_id, pharmacy_id)
       DO UPDATE SET
         updated_at = public.patient_chats.updated_at
       RETURNING
         chat_id,
         patient_user_id,
         pharmacy_id,
         created_at,
         updated_at`,
      [patientUserId, pharmacyId],
    );

    return {
      success: true,
      message: 'Chat conversation opened successfully.',
      data: {
        ...result.rows[0],
        pharmacy_name: pharmacyResult.rows[0].pharmacy_name,
      },
    };
  }

  /**
   * 2. Retrieve all conversations belonging to a patient.
   */
  async getPatientChats(patientUserId: number) {
    const result = await this.db.query(
      `SELECT
         c.chat_id,
         c.patient_user_id,
         c.pharmacy_id,
         c.status,
         p.pharmacy_name,
         p.phone_number,
         c.created_at,
         c.updated_at,
         (
           SELECT m.message
           FROM public.patient_chat_messages m
           WHERE m.chat_id = c.chat_id
           ORDER BY m.created_at DESC, m.message_id DESC
           LIMIT 1
         ) AS last_message,
         (
           SELECT m.sender_role
           FROM public.patient_chat_messages m
           WHERE m.chat_id = c.chat_id
           ORDER BY m.created_at DESC, m.message_id DESC
           LIMIT 1
         ) AS last_sender_role,
         (
           SELECT m.created_at
           FROM public.patient_chat_messages m
           WHERE m.chat_id = c.chat_id
           ORDER BY m.created_at DESC, m.message_id DESC
           LIMIT 1
         ) AS last_message_at
       FROM public.patient_chats c
       JOIN public.pharmacies p
         ON p.pharmacy_id = c.pharmacy_id
       WHERE c.patient_user_id = $1
       ORDER BY c.updated_at DESC`,
      [patientUserId],
    );

    return {
      success: true,
      message: 'Your conversations were retrieved successfully.',
      count: result.rows.length,
      data: result.rows,
    };
  }

  /**
   * 3. Retrieve messages from a patient's conversation.
   *
   * Patients can only access their own conversations.
   */
  async getPatientChatMessages(
    patientUserId: number,
    chatId: number,
  ) {
    const chat = await this.db.query(
      `SELECT c.chat_id, c.status, c.pharmacy_id, p.pharmacy_name, p.phone_number
       FROM public.patient_chats c
       JOIN public.pharmacies p ON p.pharmacy_id = c.pharmacy_id
       WHERE c.chat_id = $1
         AND c.patient_user_id = $2`,
      [chatId, patientUserId],
    );

    if (chat.rows.length === 0) {
      throw new NotFoundException(
        'Chat conversation not found.',
      );
    }

    const result = await this.db.query(
      `SELECT
         m.message_id,
         m.chat_id,
         m.sender_user_id,
         m.sender_role,
         m.sender_email,
         m.message,
         m.created_at,
         m.edited_at,
         CASE WHEN m.sender_role = 'PHARMACY' THEN pu.full_name END AS sender_name
       FROM public.patient_chat_messages m
       LEFT JOIN public.pharmacy_users pu
         ON m.sender_role = 'PHARMACY' AND pu.pharmacy_user_id = m.sender_user_id
       WHERE m.chat_id = $1
       ORDER BY m.created_at ASC, m.message_id ASC`,
      [chatId],
    );

    return {
      success: true,
      message: 'Chat messages retrieved successfully.',
      count: result.rows.length,
      conversation: chat.rows[0],
      data: result.rows,
    };
  }

  /**
   * 4. Send a message to a pharmacy.
   */
  async sendPatientChatMessage(
    patientUserId: number,
    patientEmail: string,
    chatId: number,
    message: string,
  ) {
    const cleanMessage = message?.trim();

    if (!cleanMessage) {
      throw new BadRequestException(
        'Message cannot be empty.',
      );
    }

    if (cleanMessage.length > 5000) {
      throw new BadRequestException(
        'Message cannot exceed 5000 characters.',
      );
    }

    const chat = await this.db.query(
      `SELECT chat_id, status
       FROM public.patient_chats
       WHERE chat_id = $1
         AND patient_user_id = $2`,
      [chatId, patientUserId],
    );

    if (chat.rows.length === 0) {
      throw new NotFoundException(
        'Chat conversation not found.',
      );
    }

    if (String(chat.rows[0].status || '').toUpperCase() === 'CLOSED') {
      throw new BadRequestException(
        'This conversation is closed.',
      );
    }

    const result = await this.db.query(
      `INSERT INTO public.patient_chat_messages
         (
           chat_id,
           sender_user_id,
           sender_role,
           sender_email,
           message,
           created_at
         )
       VALUES ($1, $2, 'PATIENT', $3, $4, NOW())
       RETURNING
         message_id,
         chat_id,
         sender_user_id,
         sender_role,
         sender_email,
         message,
         created_at,
         edited_at`,
      [
        chatId,
        patientUserId,
        patientEmail,
        cleanMessage,
      ],
    );

    await this.db.query(
      `UPDATE public.patient_chats
       SET updated_at = NOW()
       WHERE chat_id = $1`,
      [chatId],
    );

    return {
      success: true,
      message: 'Message sent successfully.',
      data: result.rows[0],
    };
  }

  /**
   * 5. Edit a patient's own message.
   *
   * Editing is allowed only within 10 minutes
   * after the original message was created.
   */
  async editPatientChatMessage(
    patientUserId: number,
    chatId: number,
    messageId: number,
    message: string,
  ) {
    const cleanMessage = message?.trim();

    if (!cleanMessage) {
      throw new BadRequestException(
        'Message cannot be empty.',
      );
    }

    if (cleanMessage.length > 5000) {
      throw new BadRequestException(
        'Message cannot exceed 5000 characters.',
      );
    }

    const result = await this.db.query(
      `UPDATE public.patient_chat_messages AS m
       SET
         message = $1,
         edited_at = NOW()
       FROM public.patient_chats AS c
       WHERE m.chat_id = c.chat_id
         AND m.message_id = $2
         AND m.chat_id = $3
         AND c.patient_user_id = $4
         AND m.sender_user_id = $4
         AND m.sender_role = 'PATIENT'
         AND m.created_at >= NOW() - INTERVAL '10 minutes'
       RETURNING
         m.message_id,
         m.chat_id,
         m.sender_user_id,
         m.sender_role,
         m.message,
         m.created_at,
         m.edited_at`,
      [
        cleanMessage,
        messageId,
        chatId,
        patientUserId,
      ],
    );

    if (result.rows.length === 0) {
      throw new BadRequestException(
        'Message could not be edited. Make sure it belongs to you and was sent within the last 10 minutes.',
      );
    }

    return {
      success: true,
      message: 'Message edited successfully.',
      data: result.rows[0],
    };
  }
}
