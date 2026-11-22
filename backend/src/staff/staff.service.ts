import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service.js';
import { MailService } from '../mail/mail.service.js';
import { ActivityLogService } from './activity-log.service.js';
import type { CreateStaffDto } from './dto/create-staff.dto.js';
import type { UpdateStaffDto } from './dto/update-staff.dto.js';
import type { ActivateStaffDto } from './dto/activate-staff.dto.js';
import type { QueryStaffDto } from './dto/query-staff.dto.js';
import type { QueryActivityDto } from './dto/query-activity.dto.js';
import type { UpdatePharmacyProfileDto } from './dto/update-pharmacy-profile.dto.js';
import type { ApiResponse } from '../common/interfaces/api-response.interface.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly mailService: MailService,
    private readonly activityLogger: ActivityLogService,
  ) {}

  /**
   * Helper: strictly resolves pharmacyId from authenticated user
   */
  async resolvePharmacyId(user: JwtPayload, requestedPharmacyId?: number): Promise<number> {
    if (
      user.role === 'PHARMACY' ||
      user.role === 'PHARMACY_ADMIN' ||
      user.role === 'PHARMACIST' ||
      user.role === 'SALES_OFFICER'
    ) {
      return Number(user.pharmacyId || user.sub);
    }
    if (user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN') {
      if (requestedPharmacyId) {
        return Number(requestedPharmacyId);
      }
      const res = await this.db.query('SELECT pharmacy_id FROM public.pharmacies ORDER BY pharmacy_id ASC LIMIT 1');
      if (res.rows.length === 0) {
        throw new NotFoundException('No pharmacies exist in the system.');
      }
      return Number(res.rows[0].pharmacy_id);
    }
    throw new ForbiddenException('Access denied.');
  }

  // =========================================================================
  // 1. STAFF REGISTRATION & INVITATION (Section 3.2)
  // =========================================================================

  async registerStaff(
    pharmacyId: number,
    dto: CreateStaffDto,
    creatorUserId?: number,
  ): Promise<ApiResponse> {
    const { fullName, phoneNumber, email, role } = dto;
    const cleanPhone = phoneNumber.trim();
    const cleanEmail = email?.trim().toLowerCase() || null;

    // 1. Check if phone already in use in this pharmacy
    const phoneCheck = await this.db.query(
      'SELECT pharmacy_user_id FROM public.pharmacy_users WHERE pharmacy_id = $1 AND phone_number = $2 LIMIT 1',
      [pharmacyId, cleanPhone],
    );
    if (phoneCheck.rows.length > 0) {
      throw new ConflictException('A staff member with this telephone number already exists in your pharmacy.');
    }

    // 2. Check if email already in use in this pharmacy
    if (cleanEmail) {
      const emailCheck = await this.db.query(
        'SELECT pharmacy_user_id FROM public.pharmacy_users WHERE pharmacy_id = $1 AND LOWER(email) = $2 LIMIT 1',
        [pharmacyId, cleanEmail],
      );
      if (emailCheck.rows.length > 0) {
        throw new ConflictException('A staff member with this email already exists in your pharmacy.');
      }
    }

    // Retrieve pharmacy name for notifications and emails; ensure pharmacy exists
    const pharmRes = await this.db.query(
      'SELECT pharmacy_name FROM public.pharmacies WHERE pharmacy_id = $1',
      [pharmacyId],
    );
    if (pharmRes.rows.length === 0) {
      throw new NotFoundException('Pharmacy not found.');
    }
    const pharmacyName = pharmRes.rows[0]?.pharmacy_name || 'Your Pharmacy';

    // Verify if creatorUserId corresponds to an existing pharmacy_users row
    let validCreatorId: number | null = null;
    if (creatorUserId) {
      let creatorRows: any[] = [];
      try {
        const creatorCheckResult = await this.db.query(
          'SELECT pharmacy_user_id FROM public.pharmacy_users WHERE pharmacy_user_id = $1 LIMIT 1',
          [creatorUserId],
        );
        creatorRows = creatorCheckResult?.rows ?? [];
      } catch (err) {
        creatorRows = [];
      }
      if (creatorRows.length > 0) {
        validCreatorId = Number(creatorRows[0].pharmacy_user_id);
      }
    }

    // 4. Generate secure 6-digit activation code and random URL token
    const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const activationToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = await bcrypt.hash(activationCode, 10);

    // 5. Atomic transaction: create staff user, create activation record, notify
    const result = await this.db.transaction(async (client) => {
      // Create user with is_active = false
      const userRes = await client.query(
        `INSERT INTO public.pharmacy_users 
          (pharmacy_id, full_name, phone_number, email, role, is_active, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, false, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING pharmacy_user_id, pharmacy_id, full_name, phone_number, email, role, is_active, created_at`,
        [pharmacyId, fullName.trim(), cleanPhone, cleanEmail, role, validCreatorId],
      );
      const newStaff = userRes.rows[0];
      const newStaffId = Number(newStaff.pharmacy_user_id);

      // Create activation record in password_resets (48-hour expiration)
      await client.query(
        `INSERT INTO public.password_resets 
          (email, user_type, user_id, token_hash, purpose, code, expires_at, used, created_at)
         VALUES ($1, 'PHARMACY', $2, $3, 'ACCOUNT_ACTIVATION', $4, CURRENT_TIMESTAMP + INTERVAL '48 hours', false, CURRENT_TIMESTAMP)`,
        [cleanEmail || cleanPhone, newStaffId, tokenHash, activationCode],
      );

      // Add notification for staff invitation
      await client.query(
        `INSERT INTO public.notifications (pharmacy_id, pharmacy_user_id, notification_type, title, message)
         VALUES ($1, $2, 'GENERAL', $3, $4)`,
        [
          pharmacyId,
          validCreatorId,
          `New Staff Member Registered: ${fullName.trim()}`,
          `${fullName.trim()} was registered as ${role}. Temporary activation code generated: ${activationCode}.`,
        ],
      );

      return newStaff;
    });

    // 6. Log activity
    await this.activityLogger.log(
      pharmacyId,
      validCreatorId,
      'STAFF_REGISTERED',
      'STAFF',
      Number(result.pharmacy_user_id),
      { fullName: result.full_name, role: result.role, phoneNumber: result.phone_number },
    );

    // 7. If email provided, dispatch invitation email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const activationLink = `${frontendUrl}/activate-account?code=${activationCode}&token=${activationToken}&identifier=${encodeURIComponent(cleanEmail || cleanPhone)}`;

    if (cleanEmail) {
      await this.mailService.sendStaffInvitationEmail(
        cleanEmail,
        fullName.trim(),
        pharmacyName,
        role,
        activationCode,
        activationToken,
      );
    }

    return {
      success: true,
      message: cleanEmail
        ? 'Staff registered successfully. Invitation email sent with activation link and code.'
        : 'Staff registered successfully. Use the generated activation credentials for account setup.',
      data: {
        staff: {
          id: Number(result.pharmacy_user_id),
          pharmacyId: Number(result.pharmacy_id),
          fullName: result.full_name,
          phoneNumber: result.phone_number,
          email: result.email,
          role: result.role,
          isActive: result.is_active,
          createdAt: result.created_at,
        },
        activation: {
          activationCode,
          activationLink,
          expiresIn: '48 hours',
        },
      },
    };
  }

  // =========================================================================
  // 2. ACCOUNT ACTIVATION (Section 3.2 & 9)
  // =========================================================================

  async activateAccount(dto: ActivateStaffDto): Promise<ApiResponse> {
    const { identifier, activationCode, password, confirmPassword } = dto;

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // 1. Locate staff account
    const userRes = await this.db.query(
      `SELECT pharmacy_user_id, pharmacy_id, full_name, email, phone_number, is_active, role
       FROM public.pharmacy_users
       WHERE LOWER(email) = $1 OR phone_number = $2
       LIMIT 1`,
      [cleanIdentifier, identifier.trim()],
    );

    if (userRes.rows.length === 0) {
      throw new NotFoundException('No staff account found matching the provided identifier.');
    }

    const staff = userRes.rows[0];
    const staffId = Number(staff.pharmacy_user_id);
    const pharmacyId = Number(staff.pharmacy_id);

    // 2. Locate active activation record
    const resetRes = await this.db.query(
      `SELECT reset_id, token_hash, code, expires_at, used
       FROM public.password_resets
       WHERE user_id = $1 
         AND user_type = 'PHARMACY' 
         AND purpose = 'ACCOUNT_ACTIVATION'
         AND used = false
       ORDER BY reset_id DESC
       LIMIT 1`,
      [staffId],
    );

    if (resetRes.rows.length === 0) {
      throw new BadRequestException('No pending activation code found for this account or it has already been used.');
    }

    const resetRecord = resetRes.rows[0];

    // Check expiration
    if (new Date(resetRecord.expires_at) < new Date()) {
      throw new BadRequestException('The activation code has expired. Please request a new one from your Pharmacy Administrator.');
    }

    // Verify code
    const isCodeValid =
      resetRecord.code === activationCode.trim() ||
      (await bcrypt.compare(activationCode.trim(), resetRecord.token_hash));

    if (!isCodeValid) {
      throw new BadRequestException('Invalid activation code.');
    }

    // 3. Hash password and activate account
    const passwordHash = await bcrypt.hash(password, 10);

    await this.db.transaction(async (client) => {
      // Update staff user
      await client.query(
        `UPDATE public.pharmacy_users 
         SET password_hash = $1, is_active = true, updated_at = CURRENT_TIMESTAMP
         WHERE pharmacy_user_id = $2`,
        [passwordHash, staffId],
      );

      // Mark reset record as used
      await client.query(
        'UPDATE public.password_resets SET used = true WHERE reset_id = $1',
        [resetRecord.reset_id],
      );

      // Notification
      await client.query(
        `INSERT INTO public.notifications (pharmacy_id, pharmacy_user_id, notification_type, title, message)
         VALUES ($1, $2, 'GENERAL', $3, $4)`,
        [
          pharmacyId,
          staffId,
          'Account Successfully Activated',
          `Welcome ${staff.full_name}! Your staff account as ${staff.role} has been activated.`,
        ],
      );
    });

    // 4. Log activity
    await this.activityLogger.log(
      pharmacyId,
      staffId,
      'STAFF_ACTIVATED',
      'STAFF',
      staffId,
      { fullName: staff.full_name, role: staff.role },
    );

    return {
      success: true,
      message: 'Account successfully activated! You can now log in with your credentials.',
      data: {
        staffId,
        fullName: staff.full_name,
        role: staff.role,
      },
    };
  }

  // =========================================================================
  // 3. STAFF LISTING & MANAGEMENT (Section 3.3)
  // =========================================================================

  async listStaff(pharmacyId: number, query: QueryStaffDto): Promise<ApiResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['pu.pharmacy_id = $1'];
    const params: any[] = [pharmacyId];
    let idx = 2;

    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      conditions.push(`(pu.full_name ILIKE $${idx} OR pu.email ILIKE $${idx} OR pu.phone_number ILIKE $${idx})`);
      params.push(term);
      idx++;
    }

    if (query.role?.trim() && query.role !== 'ALL') {
      conditions.push(`pu.role = $${idx++}`);
      params.push(query.role.trim());
    }

    if (query.status === 'ACTIVE') {
      conditions.push('pu.is_active = true');
    } else if (query.status === 'INACTIVE') {
      conditions.push('pu.is_active = false');
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await this.db.query(
      `SELECT COUNT(*) FROM public.pharmacy_users pu ${where}`,
      params,
    );
    const total = Number(countRes.rows[0].count);

    const listRes = await this.db.query(
      `SELECT 
        pu.pharmacy_user_id AS id,
        pu.pharmacy_id,
        pu.full_name,
        pu.email,
        pu.phone_number,
        pu.role,
        pu.is_active,
        to_char(pu.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
        to_char(pu.updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at,
        to_char(pu.last_login_at, 'YYYY-MM-DD HH24:MI:SS') AS last_login_at,
        creator.full_name AS created_by_name
       FROM public.pharmacy_users pu
       LEFT JOIN public.pharmacy_users creator ON creator.pharmacy_user_id = pu.created_by
       ${where}
       ORDER BY pu.pharmacy_user_id DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    );

    return {
      success: true,
      message: 'Staff list retrieved successfully.',
      data: {
        staff: listRes.rows.map((s) => ({
          ...s,
          status: s.is_active ? 'ACTIVE' : 'INACTIVE',
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getStaffById(pharmacyId: number, staffId: number): Promise<ApiResponse> {
    const res = await this.db.query(
      `SELECT 
        pu.pharmacy_user_id AS id,
        pu.pharmacy_id,
        pu.full_name,
        pu.email,
        pu.phone_number,
        pu.role,
        pu.is_active,
        to_char(pu.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
        to_char(pu.updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at,
        to_char(pu.last_login_at, 'YYYY-MM-DD HH24:MI:SS') AS last_login_at,
        creator.full_name AS created_by_name,
        (SELECT COUNT(*) FROM public.pharmacy_user_activity_logs al WHERE al.pharmacy_user_id = pu.pharmacy_user_id) AS total_activities,
        (SELECT COUNT(*) FROM public.sales s WHERE s.pharmacy_user_id = pu.pharmacy_user_id) AS total_sales_count,
        (SELECT COALESCE(SUM(s.net_total_amount), 0) FROM public.sales s WHERE s.pharmacy_user_id = pu.pharmacy_user_id) AS total_sales_revenue
       FROM public.pharmacy_users pu
       LEFT JOIN public.pharmacy_users creator ON creator.pharmacy_user_id = pu.created_by
       WHERE pu.pharmacy_user_id = $1 AND pu.pharmacy_id = $2`,
      [staffId, pharmacyId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Staff member with ID ${staffId} not found in this pharmacy.`);
    }

    return {
      success: true,
      message: 'Staff details retrieved successfully.',
      data: res.rows[0],
    };
  }

  async updateStaff(
    pharmacyId: number,
    staffId: number,
    dto: UpdateStaffDto,
    actorUserId?: number,
  ): Promise<ApiResponse> {
    const existingRes = await this.db.query(
      'SELECT pharmacy_user_id, full_name, email, phone_number, role, is_active FROM public.pharmacy_users WHERE pharmacy_user_id = $1 AND pharmacy_id = $2',
      [staffId, pharmacyId],
    );

    if (existingRes.rows.length === 0) {
      throw new NotFoundException(`Staff member with ID ${staffId} not found in this pharmacy.`);
    }

    const current = existingRes.rows[0];

    // Check unique phone if modified
    if (dto.phoneNumber && dto.phoneNumber.trim() !== current.phone_number) {
      const phoneCheck = await this.db.query(
        'SELECT pharmacy_user_id FROM public.pharmacy_users WHERE pharmacy_id = $1 AND phone_number = $2 AND pharmacy_user_id != $3',
        [pharmacyId, dto.phoneNumber.trim(), staffId],
      );
      if (phoneCheck.rows.length > 0) {
        throw new ConflictException('Telephone number is already in use by another staff member.');
      }
    }

    // Check unique email if modified
    if (dto.email && dto.email.trim().toLowerCase() !== (current.email || '').toLowerCase()) {
      const emailCheck = await this.db.query(
        'SELECT pharmacy_user_id FROM public.pharmacy_users WHERE pharmacy_id = $1 AND LOWER(email) = $2 AND pharmacy_user_id != $3',
        [pharmacyId, dto.email.trim().toLowerCase(), staffId],
      );
      if (emailCheck.rows.length > 0) {
        throw new ConflictException('Email address is already in use by another staff member.');
      }
    }

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [staffId, pharmacyId];
    let pIdx = 3;

    if (dto.fullName?.trim()) {
      updates.push(`full_name = $${pIdx++}`);
      params.push(dto.fullName.trim());
    }
    if (dto.phoneNumber?.trim()) {
      updates.push(`phone_number = $${pIdx++}`);
      params.push(dto.phoneNumber.trim());
    }
    if (dto.email !== undefined) {
      updates.push(`email = $${pIdx++}`);
      params.push(dto.email?.trim().toLowerCase() || null);
    }
    if (dto.role) {
      updates.push(`role = $${pIdx++}`);
      params.push(dto.role);
    }

    const updateRes = await this.db.query(
      `UPDATE public.pharmacy_users 
       SET ${updates.join(', ')} 
       WHERE pharmacy_user_id = $1 AND pharmacy_id = $2
       RETURNING pharmacy_user_id AS id, pharmacy_id, full_name, email, phone_number, role, is_active, updated_at`,
      params,
    );

    // Log activity
    await this.activityLogger.log(
      pharmacyId,
      actorUserId || null,
      'STAFF_UPDATED',
      'STAFF',
      staffId,
      { changes: dto },
    );

    return {
      success: true,
      message: 'Staff information updated successfully.',
      data: updateRes.rows[0],
    };
  }

  async toggleStaffStatus(
    pharmacyId: number,
    staffId: number,
    actorUserId?: number,
  ): Promise<ApiResponse> {
    if (actorUserId && actorUserId === staffId) {
      throw new BadRequestException('You cannot suspend or deactivate your own account.');
    }

    const staffRes = await this.db.query(
      'SELECT pharmacy_user_id, full_name, role, is_active FROM public.pharmacy_users WHERE pharmacy_user_id = $1 AND pharmacy_id = $2',
      [staffId, pharmacyId],
    );

    if (staffRes.rows.length === 0) {
      throw new NotFoundException(`Staff member with ID ${staffId} not found in this pharmacy.`);
    }

    const staff = staffRes.rows[0];
    const newStatus = !staff.is_active;

    await this.db.query(
      'UPDATE public.pharmacy_users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE pharmacy_user_id = $2 AND pharmacy_id = $3',
      [newStatus, staffId, pharmacyId],
    );

    const action = newStatus ? 'STAFF_REACTIVATED' : 'STAFF_SUSPENDED';

    await this.activityLogger.log(
      pharmacyId,
      actorUserId || null,
      action,
      'STAFF',
      staffId,
      { staffName: staff.full_name, role: staff.role, newStatus },
    );

    return {
      success: true,
      message: newStatus ? 'Staff account reactivated successfully.' : 'Staff account suspended successfully.',
      data: {
        id: staffId,
        fullName: staff.full_name,
        role: staff.role,
        isActive: newStatus,
      },
    };
  }

  async reissueActivationCode(
    pharmacyId: number,
    staffId: number,
    actorUserId?: number,
  ): Promise<ApiResponse> {
    const staffRes = await this.db.query(
      'SELECT pharmacy_user_id, full_name, email, phone_number, role, is_active FROM public.pharmacy_users WHERE pharmacy_user_id = $1 AND pharmacy_id = $2',
      [staffId, pharmacyId],
    );

    if (staffRes.rows.length === 0) {
      throw new NotFoundException(`Staff member with ID ${staffId} not found in this pharmacy.`);
    }

    const staff = staffRes.rows[0];

    const pharmRes = await this.db.query(
      'SELECT pharmacy_name FROM public.pharmacies WHERE pharmacy_id = $1',
      [pharmacyId],
    );
    const pharmacyName = pharmRes.rows[0]?.pharmacy_name || 'Your Pharmacy';

    const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const activationToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = await bcrypt.hash(activationCode, 10);

    // Invalidate previous codes and insert new
    await this.db.query(
      `UPDATE public.password_resets SET used = true WHERE user_id = $1 AND user_type = 'PHARMACY' AND purpose = 'ACCOUNT_ACTIVATION'`,
      [staffId],
    );

    await this.db.query(
      `INSERT INTO public.password_resets 
        (email, user_type, user_id, token_hash, purpose, code, expires_at, used, created_at)
       VALUES ($1, 'PHARMACY', $2, $3, 'ACCOUNT_ACTIVATION', $4, CURRENT_TIMESTAMP + INTERVAL '48 hours', false, CURRENT_TIMESTAMP)`,
      [staff.email || staff.phone_number, staffId, tokenHash, activationCode],
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const activationLink = `${frontendUrl}/activate-account?code=${activationCode}&token=${activationToken}&identifier=${encodeURIComponent(staff.email || staff.phone_number)}`;

    if (staff.email) {
      await this.mailService.sendStaffInvitationEmail(
        staff.email,
        staff.full_name,
        pharmacyName,
        staff.role,
        activationCode,
        activationToken,
      );
    }

    await this.activityLogger.log(
      pharmacyId,
      actorUserId || null,
      'STAFF_CODE_REISSUED',
      'STAFF',
      staffId,
      { fullName: staff.full_name },
    );

    return {
      success: true,
      message: 'New activation credentials generated successfully.',
      data: {
        staffId,
        activationCode,
        activationLink,
        expiresIn: '48 hours',
      },
    };
  }

  // =========================================================================
  // 4. PHARMACY REPORTS & STAFF PERFORMANCE (Section 3.5 & 4.3)
  // =========================================================================

  async getStaffSalesReport(
    pharmacyId: number,
    query: { period?: string; staffId?: number; startDate?: string; endDate?: string },
  ): Promise<ApiResponse> {
    const conditions: string[] = ['s.pharmacy_id = $1', "s.sale_status != 'CANCELLED'"];
    const params: any[] = [pharmacyId];
    let idx = 2;

    if (query.staffId) {
      conditions.push(`s.pharmacy_user_id = $${idx++}`);
      params.push(query.staffId);
    }

    if (query.startDate?.trim()) {
      conditions.push(`s.created_at >= $${idx++}`);
      params.push(`${query.startDate.trim()} 00:00:00`);
    }

    if (query.endDate?.trim()) {
      conditions.push(`s.created_at <= $${idx++}`);
      params.push(`${query.endDate.trim()} 23:59:59`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const res = await this.db.query(
      `SELECT 
        pu.pharmacy_user_id,
        pu.full_name AS staff_name,
        pu.role AS staff_role,
        COUNT(s.sale_id) AS total_sales_count,
        COALESCE(SUM(s.net_total_amount), 0) AS total_revenue,
        COALESCE(SUM(s.patient_contribution), 0) AS patient_revenue,
        COALESCE(SUM(s.insurance_contribution), 0) AS insurance_revenue,
        COUNT(s.sale_id) FILTER (WHERE s.payment_category = 'PRIVATE') AS private_sales_count,
        COUNT(s.sale_id) FILTER (WHERE s.payment_category = 'INSURANCE') AS insurance_sales_count,
        COALESCE((
          SELECT SUM(si.quantity) 
          FROM public.sale_items si 
          JOIN public.sales s2 ON s2.sale_id = si.sale_id 
          WHERE s2.pharmacy_user_id = pu.pharmacy_user_id AND s2.pharmacy_id = $1
        ), 0) AS total_medicines_sold
       FROM public.pharmacy_users pu
       LEFT JOIN public.sales s ON s.pharmacy_user_id = pu.pharmacy_user_id AND s.pharmacy_id = $1
       ${where}
       GROUP BY pu.pharmacy_user_id, pu.full_name, pu.role
       ORDER BY total_revenue DESC`,
      params,
    );

    return {
      success: true,
      message: 'Staff sales report retrieved successfully.',
      data: res.rows.map((r: any) => ({
        staffId: Number(r.pharmacy_user_id),
        staffName: r.staff_name,
        staffRole: r.staff_role,
        totalSalesCount: Number(r.total_sales_count),
        totalRevenue: Number(Number(r.total_revenue).toFixed(2)),
        patientRevenue: Number(Number(r.patient_revenue).toFixed(2)),
        insuranceRevenue: Number(Number(r.insurance_revenue).toFixed(2)),
        privateSalesCount: Number(r.private_sales_count),
        insuranceSalesCount: Number(r.insurance_sales_count),
        totalMedicinesSold: Number(r.total_medicines_sold),
      })),
    };
  }

  async getStaffInventoryOperationsReport(
    pharmacyId: number,
    query: { staffId?: number; type?: string; startDate?: string; endDate?: string },
  ): Promise<ApiResponse> {
    const conditions: string[] = ['it.pharmacy_id = $1'];
    const params: any[] = [pharmacyId];
    let idx = 2;

    if (query.staffId) {
      conditions.push(`it.pharmacy_user_id = $${idx++}`);
      params.push(query.staffId);
    }
    if (query.type?.trim()) {
      conditions.push(`it.transaction_type = $${idx++}`);
      params.push(query.type.trim());
    }
    if (query.startDate?.trim()) {
      conditions.push(`it.created_at >= $${idx++}`);
      params.push(`${query.startDate.trim()} 00:00:00`);
    }
    if (query.endDate?.trim()) {
      conditions.push(`it.created_at <= $${idx++}`);
      params.push(`${query.endDate.trim()} 23:59:59`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const res = await this.db.query(
      `SELECT 
        it.transaction_type,
        COUNT(it.transaction_id) AS operation_count,
        COALESCE(SUM(it.quantity), 0) AS total_quantity,
        pu.pharmacy_user_id,
        pu.full_name AS staff_name,
        pu.role AS staff_role
       FROM public.inventory_transactions it
       LEFT JOIN public.pharmacy_users pu ON pu.pharmacy_user_id = it.pharmacy_user_id
       ${where}
       GROUP BY it.transaction_type, pu.pharmacy_user_id, pu.full_name, pu.role
       ORDER BY it.transaction_type ASC, operation_count DESC`,
      params,
    );

    return {
      success: true,
      message: 'Staff inventory operations report retrieved successfully.',
      data: res.rows,
    };
  }

  // =========================================================================
  // 5. SALES OFFICER / PHARMACIST PERSONAL VIEW (Section 4)
  // =========================================================================

  async getMyPersonalReport(
    pharmacyId: number,
    pharmacyUserId: number,
    period: string = 'today',
  ): Promise<ApiResponse> {
    let dateFilter = '';
    if (period === 'today') {
      dateFilter = 'AND s.created_at >= CURRENT_DATE';
    } else if (period === 'week') {
      dateFilter = "AND s.created_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateFilter = "AND s.created_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    const salesRes = await this.db.query(
      `SELECT 
        COUNT(s.sale_id) AS total_sales,
        COALESCE(SUM(s.net_total_amount), 0) AS total_revenue,
        COALESCE(SUM(s.patient_contribution), 0) AS patient_contribution,
        COALESCE(SUM(s.insurance_contribution), 0) AS insurance_contribution,
        COUNT(s.sale_id) FILTER (WHERE s.payment_category = 'PRIVATE') AS private_sales,
        COUNT(s.sale_id) FILTER (WHERE s.payment_category = 'INSURANCE') AS insurance_sales
       FROM public.sales s
       WHERE s.pharmacy_id = $1 AND s.pharmacy_user_id = $2 AND s.sale_status != 'CANCELLED' ${dateFilter}`,
      [pharmacyId, pharmacyUserId],
    );

    const sRow = salesRes.rows[0];

    const medRes = await this.db.query(
      `SELECT COALESCE(SUM(si.quantity), 0) AS medicines_sold
       FROM public.sale_items si
       JOIN public.sales s ON s.sale_id = si.sale_id
       WHERE s.pharmacy_id = $1 AND s.pharmacy_user_id = $2 AND s.sale_status != 'CANCELLED' ${dateFilter}`,
      [pharmacyId, pharmacyUserId],
    );

    const recentSales = await this.db.query(
      `SELECT s.sale_id, s.receipt_number, s.customer_name, s.payment_category, s.net_total_amount, s.payment_status,
              to_char(s.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
       FROM public.sales s
       WHERE s.pharmacy_id = $1 AND s.pharmacy_user_id = $2
       ORDER BY s.sale_id DESC
       LIMIT 10`,
      [pharmacyId, pharmacyUserId],
    );

    return {
      success: true,
      message: 'Personal performance report retrieved successfully.',
      data: {
        period,
        summary: {
          totalSales: Number(sRow.total_sales || 0),
          totalRevenue: Number(Number(sRow.total_revenue || 0).toFixed(2)),
          patientContribution: Number(Number(sRow.patient_contribution || 0).toFixed(2)),
          insuranceContribution: Number(Number(sRow.insurance_contribution || 0).toFixed(2)),
          privateSalesCount: Number(sRow.private_sales || 0),
          insuranceSalesCount: Number(sRow.insurance_sales || 0),
          totalMedicinesSold: Number(medRes.rows[0]?.medicines_sold || 0),
        },
        recentSales: recentSales.rows,
      },
    };
  }

  async getInventoryMonitor(pharmacyId: number): Promise<ApiResponse> {
    // A. NEW STOCK: Recently received batches (STOCK_IN in last 30 days)
    const newStockRes = await this.db.query(
      `SELECT 
        ib.inventory_id,
        ib.batch_number,
        m.medicine_name,
        m.strength,
        m.dosage_form,
        it.quantity AS quantity_received,
        to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        to_char(it.created_at, 'YYYY-MM-DD HH24:MI:SS') AS received_at,
        pu.full_name AS received_by_staff
       FROM public.inventory_transactions it
       JOIN public.inventory_batches ib ON ib.inventory_id = it.inventory_id
       JOIN public.medicines m ON m.medicine_id = ib.medicine_id
       LEFT JOIN public.pharmacy_users pu ON pu.pharmacy_user_id = it.pharmacy_user_id
       WHERE it.pharmacy_id = $1 AND it.transaction_type = 'STOCK_IN'
       ORDER BY it.transaction_id DESC
       LIMIT 15`,
      [pharmacyId],
    );

    // B. STOCK OUT: Medicines dispensed / sold recently
    const stockOutRes = await this.db.query(
      `SELECT 
        it.transaction_id,
        m.medicine_name,
        m.strength,
        ib.batch_number,
        it.quantity AS quantity_deducted,
        it.new_quantity AS remaining_quantity,
        to_char(it.created_at, 'YYYY-MM-DD HH24:MI:SS') AS transaction_date,
        pu.full_name AS staff_name
       FROM public.inventory_transactions it
       JOIN public.inventory_batches ib ON ib.inventory_id = it.inventory_id
       JOIN public.medicines m ON m.medicine_id = ib.medicine_id
       LEFT JOIN public.pharmacy_users pu ON pu.pharmacy_user_id = it.pharmacy_user_id
       WHERE it.pharmacy_id = $1 AND it.transaction_type = 'STOCK_OUT'
       ORDER BY it.transaction_id DESC
       LIMIT 15`,
      [pharmacyId],
    );

    // C. LOW STOCK: Batches where quantity <= reorder_level or = 0
    const lowStockRes = await this.db.query(
      `SELECT 
        ib.inventory_id,
        ib.batch_number,
        m.medicine_name,
        m.strength,
        m.dosage_form,
        ib.quantity AS current_stock,
        ib.reorder_level,
        CASE WHEN ib.quantity = 0 THEN 'OUT_OF_STOCK' ELSE 'LOW_STOCK' END AS stock_status,
        to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry_date
       FROM public.inventory_batches ib
       JOIN public.medicines m ON m.medicine_id = ib.medicine_id
       WHERE ib.pharmacy_id = $1 AND ib.quantity <= ib.reorder_level
       ORDER BY ib.quantity ASC, ib.inventory_id ASC
       LIMIT 25`,
      [pharmacyId],
    );

    // D. DAMAGED STOCK: Damaged stock records
    const damagedStockRes = await this.db.query(
      `SELECT 
        it.transaction_id,
        m.medicine_name,
        ib.batch_number,
        it.quantity AS damaged_quantity,
        it.reason AS damage_reason,
        it.notes,
        to_char(it.created_at, 'YYYY-MM-DD HH24:MI:SS') AS reported_at,
        pu.full_name AS reported_by_staff
       FROM public.inventory_transactions it
       JOIN public.inventory_batches ib ON ib.inventory_id = it.inventory_id
       JOIN public.medicines m ON m.medicine_id = ib.medicine_id
       LEFT JOIN public.pharmacy_users pu ON pu.pharmacy_user_id = it.pharmacy_user_id
       WHERE it.pharmacy_id = $1 AND (it.transaction_type = 'DAMAGED' OR it.reason ILIKE '%damag%')
       ORDER BY it.transaction_id DESC
       LIMIT 15`,
      [pharmacyId],
    );

    return {
      success: true,
      message: 'Inventory monitoring data retrieved successfully.',
      data: {
        newStock: newStockRes.rows,
        stockOut: stockOutRes.rows,
        lowStock: lowStockRes.rows,
        damagedStock: damagedStockRes.rows,
      },
    };
  }

  // =========================================================================
  // 6. PHARMACY PROFILE (Section 3.1)
  // =========================================================================

  async updatePharmacyProfile(
    pharmacyId: number,
    dto: UpdatePharmacyProfileDto,
    actorUserId?: number,
  ): Promise<ApiResponse> {
    const updates: string[] = [];
    const params: any[] = [pharmacyId];
    let idx = 2;

    if (dto.pharmacyName?.trim()) {
      updates.push(`pharmacy_name = $${idx++}`);
      params.push(dto.pharmacyName.trim());
    }
    if (dto.locationAddress?.trim()) {
      updates.push(`location_address = $${idx++}`);
      params.push(dto.locationAddress.trim());
    }
    if (dto.latitude !== undefined) {
      updates.push(`latitude = $${idx++}`);
      params.push(dto.latitude);
    }
    if (dto.longitude !== undefined) {
      updates.push(`longitude = $${idx++}`);
      params.push(dto.longitude);
    }
    if (dto.phoneNumber?.trim()) {
      updates.push(`phone_number = $${idx++}`);
      params.push(dto.phoneNumber.trim());
    }
    if (dto.email?.trim()) {
      updates.push(`email = $${idx++}`);
      params.push(dto.email.trim().toLowerCase());
    }

    if (updates.length === 0) {
      throw new BadRequestException('No valid fields provided to update.');
    }

    const res = await this.db.query(
      `UPDATE public.pharmacies 
       SET ${updates.join(', ')} 
       WHERE pharmacy_id = $1 
       RETURNING pharmacy_id, pharmacy_name, location_address, latitude, longitude, phone_number, email, tin, verification_status`,
      params,
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Pharmacy with ID ${pharmacyId} not found.`);
    }

    await this.activityLogger.log(
      pharmacyId,
      actorUserId || null,
      'PHARMACY_PROFILE_UPDATED',
      'PHARMACY',
      pharmacyId,
      { changes: dto },
    );

    return {
      success: true,
      message: 'Pharmacy profile updated successfully.',
      data: res.rows[0],
    };
  }
}
