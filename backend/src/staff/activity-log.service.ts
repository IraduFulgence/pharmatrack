import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private readonly db: DatabaseService) {}

  async log(
    pharmacyId: number,
    pharmacyUserId: number | null,
    action: string,
    targetType?: string,
    targetId?: number,
    details?: any,
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO public.pharmacy_user_activity_logs 
          (pharmacy_id, pharmacy_user_id, action, target_type, target_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [
          pharmacyId,
          pharmacyUserId || null,
          action,
          targetType || null,
          targetId || null,
          details ? JSON.stringify(details) : null,
        ],
      );
    } catch (err: any) {
      this.logger.error(`Failed to record staff activity log: ${err.message}`);
    }
  }

  async getLogs(
    pharmacyId: number,
    query: {
      staffId?: number;
      action?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['al.pharmacy_id = $1'];
    const params: any[] = [pharmacyId];
    let idx = 2;

    if (query.staffId) {
      conditions.push(`al.pharmacy_user_id = $${idx++}`);
      params.push(query.staffId);
    }
    if (query.action?.trim()) {
      conditions.push(`al.action = $${idx++}`);
      params.push(query.action.trim());
    }
    if (query.startDate?.trim()) {
      conditions.push(`al.created_at >= $${idx++}`);
      params.push(`${query.startDate.trim()} 00:00:00`);
    }
    if (query.endDate?.trim()) {
      conditions.push(`al.created_at <= $${idx++}`);
      params.push(`${query.endDate.trim()} 23:59:59`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await this.db.query(
      `SELECT COUNT(*) FROM public.pharmacy_user_activity_logs al ${where}`,
      params,
    );
    const total = Number(countRes.rows[0].count);

    const logsRes = await this.db.query(
      `SELECT 
        al.log_id,
        al.pharmacy_id,
        al.pharmacy_user_id,
        al.action,
        al.target_type,
        al.target_id,
        al.details,
        to_char(al.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
        pu.full_name AS employee_name,
        pu.email AS employee_email,
        pu.phone_number AS employee_phone,
        pu.role AS employee_role
       FROM public.pharmacy_user_activity_logs al
       LEFT JOIN public.pharmacy_users pu ON pu.pharmacy_user_id = al.pharmacy_user_id AND pu.pharmacy_id = al.pharmacy_id
       ${where}
       ORDER BY al.log_id DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    );

    return {
      success: true,
      message: 'Staff activity logs retrieved successfully.',
      data: {
        logs: logsRes.rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }
}
