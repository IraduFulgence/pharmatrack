import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';

@Injectable()
export class PharmacyMessagingService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Resolve the authenticated staff member and their pharmacy.
   * Staff tokens carry pharmacyUserId (staff may have no email, only a phone),
   * pharmacy-admin tokens only carry the pharmacy email. Either way the lookup is
   * scoped to the pharmacy in the token.
   */
  private async getStaff(user: JwtPayload) {
    const pharmacyId = Number(user.pharmacyId || 0);
    if (!pharmacyId) {
      throw new ForbiddenException('Your session has no pharmacy attached. Please sign in again.');
    }

    const result = user.pharmacyUserId
      ? await this.db.query(
          `SELECT pharmacy_user_id, pharmacy_id, full_name, email
           FROM public.pharmacy_users
           WHERE pharmacy_user_id = $1
             AND pharmacy_id = $2
             AND is_active = TRUE
           LIMIT 1`,
          [user.pharmacyUserId, pharmacyId],
        )
      : await this.db.query(
          `SELECT pharmacy_user_id, pharmacy_id, full_name, email
           FROM public.pharmacy_users
           WHERE LOWER(email) = LOWER($1)
             AND pharmacy_id = $2
             AND is_active = TRUE
           LIMIT 1`,
          [user.email || '', pharmacyId],
        );

    if (result.rows.length === 0) {
      throw new ForbiddenException(
        'You are not an active member of a registered pharmacy.',
      );
    }

    return result.rows[0];
  }

  /**
   * List conversations belonging to the staff member's pharmacy.
   */
  async getConversations(user: JwtPayload) {
    const staff = await this.getStaff(user);

    const result = await this.db.query(
      `SELECT
         c.chat_id,
         c.patient_user_id,
         c.pharmacy_id,
         c.status,
         c.created_at,
         c.updated_at,
         p.full_name AS patient_name,
         p.phone_number AS patient_phone,
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
         ) AS last_message_sender,
         (
           SELECT m.created_at
           FROM public.patient_chat_messages m
           WHERE m.chat_id = c.chat_id
           ORDER BY m.created_at DESC, m.message_id DESC
           LIMIT 1
         ) AS last_message_at
       FROM public.patient_chats c
       LEFT JOIN public.patients p ON p.patient_id = c.patient_user_id
       WHERE c.pharmacy_id = $1
       ORDER BY COALESCE(c.updated_at, c.created_at) DESC`,
      [staff.pharmacy_id],
    );

    return {
      success: true,
      message: 'Pharmacy conversations retrieved successfully.',
      data: {
        pharmacyId: Number(staff.pharmacy_id),
        staff: {
          pharmacyUserId: Number(staff.pharmacy_user_id),
          name: staff.full_name,
          email: staff.email,
        },
        conversations: result.rows,
      },
    };
  }

  /**
   * Read messages in a conversation belonging to this pharmacy.
   */
  async getConversationMessages(
    user: JwtPayload,
    chatId: number,
  ) {
    const staff = await this.getStaff(user);

    const chat = await this.db.query(
      `SELECT c.chat_id, c.status, c.patient_user_id,
              p.full_name AS patient_name, p.phone_number AS patient_phone
       FROM public.patient_chats c
       LEFT JOIN public.patients p ON p.patient_id = c.patient_user_id
       WHERE c.chat_id = $1
         AND c.pharmacy_id = $2
       LIMIT 1`,
      [chatId, staff.pharmacy_id],
    );

    if (chat.rows.length === 0) {
      throw new NotFoundException('Conversation not found.');
    }

    const messages = await this.db.query(
      `SELECT
         m.message_id,
         m.chat_id,
         m.sender_user_id,
         m.sender_role,
         m.sender_email,
         m.message,
         m.created_at,
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
      message: 'Conversation messages retrieved successfully.',
      data: {
        chatId,
        conversation: chat.rows[0],
        messages: messages.rows,
      },
    };
  }

  /**
   * Send a reply as the authenticated pharmacy staff member.
   */
  async sendMessage(
    user: JwtPayload,
    chatId: number,
    message: string,
  ) {
    const cleanMessage = message?.trim();

    if (!cleanMessage) {
      throw new BadRequestException('Message cannot be empty.');
    }

    const staff = await this.getStaff(user);

    return this.db.transaction(async (client) => {
      const chat = await client.query(
        `SELECT chat_id, status
         FROM public.patient_chats
         WHERE chat_id = $1
           AND pharmacy_id = $2
         FOR UPDATE`,
        [chatId, staff.pharmacy_id],
      );

      if (chat.rows.length === 0) {
        throw new NotFoundException('Conversation not found.');
      }

      if (
        chat.rows[0].status &&
        String(chat.rows[0].status).toUpperCase() === 'CLOSED'
      ) {
        throw new BadRequestException(
          'This conversation is closed and cannot receive new messages.',
        );
      }

      const inserted = await client.query(
        `INSERT INTO public.patient_chat_messages
          (
            chat_id,
            sender_user_id,
            sender_role,
            sender_email,
            message
          )
         VALUES ($1, $2, 'PHARMACY', $3, $4)
         RETURNING
           message_id,
           chat_id,
           sender_user_id,
           sender_role,
           sender_email,
           message,
           created_at`,
        [
          chatId,
          staff.pharmacy_user_id,
          staff.email,
          cleanMessage,
        ],
      );

      await client.query(
        `UPDATE public.patient_chats
         SET updated_at = CURRENT_TIMESTAMP
         WHERE chat_id = $1
           AND pharmacy_id = $2`,
        [chatId, staff.pharmacy_id],
      );

      return {
        success: true,
        message: 'Message sent successfully.',
        data: { ...inserted.rows[0], sender_name: staff.full_name },
      };
    });
  }
}