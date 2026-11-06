import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service.js';
import type { CreateAdminDto } from './dto/create-admin.dto.js';
import type { UpdatePatientDto } from './dto/update-patient.dto.js';
import type { RejectPharmacyDto } from './dto/reject-pharmacy.dto.js';
import type { ApiResponse } from '../common/interfaces/api-response.interface.js';
import { calculateAge, formatDate } from '../auth/auth.service.js';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly db: DatabaseService) {}

  // ───────────── Activity Log ─────────────

  async logActivity(
    adminId: number,
    action: string,
    targetType?: string,
    targetId?: number,
    details?: object,
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO public.admin_activity_logs (admin_id, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [adminId, action, targetType || null, targetId || null, details ? JSON.stringify(details) : null],
      );
    } catch (err: any) {
      this.logger.error(`Failed to log admin activity: ${err.message}`);
    }
  }

  // ───────────── Dashboard ─────────────

  async getDashboardStats(): Promise<ApiResponse> {
    const patientsCount = await this.db.query('SELECT COUNT(*) AS count FROM public.patients');
    const pharmaciesCount = await this.db.query('SELECT COUNT(*) AS count FROM public.pharmacies');
    const pendingCount = await this.db.query(
      "SELECT COUNT(*) AS count FROM public.pharmacies WHERE verification_status = 'PENDING'",
    );
    const approvedCount = await this.db.query(
      "SELECT COUNT(*) AS count FROM public.pharmacies WHERE verification_status = 'APPROVED'",
    );
    const rejectedCount = await this.db.query(
      "SELECT COUNT(*) AS count FROM public.pharmacies WHERE verification_status = 'REJECTED'",
    );
    const adminsCount = await this.db.query('SELECT COUNT(*) AS count FROM public.admins');

    return {
      success: true,
      message: 'Dashboard statistics retrieved.',
      data: {
        totalPatients: Number(patientsCount.rows[0].count),
        totalPharmacies: Number(pharmaciesCount.rows[0].count),
        pendingPharmacies: Number(pendingCount.rows[0].count),
        approvedPharmacies: Number(approvedCount.rows[0].count),
        rejectedPharmacies: Number(rejectedCount.rows[0].count),
        totalAdmins: Number(adminsCount.rows[0].count),
      },
    };
  }

  // ───────────── Patients ─────────────

  async listPatients(search?: string, status?: string, page = 1, limit = 20): Promise<ApiResponse> {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(
        `(LOWER(full_name) LIKE $${paramIdx} OR phone_number LIKE $${paramIdx} OR LOWER(email) LIKE $${paramIdx})`,
      );
      params.push(`%${search.toLowerCase()}%`);
      paramIdx++;
    }
    if (status === 'active') {
      conditions.push(`is_active = true`);
    } else if (status === 'inactive') {
      conditions.push(`is_active = false`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.db.query(
      `SELECT COUNT(*) AS count FROM public.patients ${whereClause}`,
      params,
    );

    const result = await this.db.query(
      `SELECT patient_id, national_id, full_name, age, to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
              phone_number, email, gender, is_active, created_at
       FROM public.patients ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset],
    );

    const patients = result.rows.map((p: any) => ({
      id: Number(p.patient_id),
      nationalId: p.national_id || null,
      fullName: p.full_name,
      dateOfBirth: p.date_of_birth ? formatDate(p.date_of_birth) : null,
      age: p.date_of_birth ? calculateAge(p.date_of_birth) : Number(p.age),
      phoneNumber: p.phone_number,
      email: p.email || null,
      gender: p.gender,
      isActive: p.is_active,
      createdAt: p.created_at,
    }));

    return {
      success: true,
      message: 'Patients retrieved.',
      data: {
        patients,
        total: Number(countResult.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(Number(countResult.rows[0].count) / limit),
      },
    };
  }

  async getPatient(id: number): Promise<ApiResponse> {
    const result = await this.db.query(
      `SELECT patient_id, national_id, full_name, age, to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
              phone_number, email, gender, is_active, created_at
       FROM public.patients WHERE patient_id = $1`,
      [id],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Patient not found.');
    }
    const p = result.rows[0];
    return {
      success: true,
      message: 'Patient retrieved.',
      data: {
        id: Number(p.patient_id),
        nationalId: p.national_id || null,
        fullName: p.full_name,
        dateOfBirth: p.date_of_birth ? formatDate(p.date_of_birth) : null,
        age: p.date_of_birth ? calculateAge(p.date_of_birth) : Number(p.age),
        phoneNumber: p.phone_number,
        email: p.email || null,
        gender: p.gender,
        isActive: p.is_active,
        createdAt: p.created_at,
      },
    };
  }

  async updatePatient(id: number, dto: UpdatePatientDto): Promise<ApiResponse> {
    // Check patient exists
    const existing = await this.db.query('SELECT patient_id FROM public.patients WHERE patient_id = $1', [id]);
    if (existing.rows.length === 0) {
      throw new NotFoundException('Patient not found.');
    }

    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (dto.fullName !== undefined) {
      setClauses.push(`full_name = $${paramIdx++}`);
      params.push(dto.fullName.trim());
    }
    if (dto.phoneNumber !== undefined) {
      setClauses.push(`phone_number = $${paramIdx++}`);
      params.push(dto.phoneNumber.trim());
    }
    if (dto.email !== undefined) {
      setClauses.push(`email = $${paramIdx++}`);
      params.push(dto.email.trim().toLowerCase());
    }
    if (dto.gender !== undefined) {
      setClauses.push(`gender = $${paramIdx++}`);
      params.push(dto.gender);
    }

    if (setClauses.length === 0) {
      return { success: true, message: 'No fields to update.' };
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    await this.db.query(
      `UPDATE public.patients SET ${setClauses.join(', ')} WHERE patient_id = $${paramIdx}`,
      params,
    );

    return this.getPatient(id);
  }

  async togglePatientStatus(id: number): Promise<ApiResponse> {
    const result = await this.db.query(
      'UPDATE public.patients SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE patient_id = $1 RETURNING is_active',
      [id],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Patient not found.');
    }
    return {
      success: true,
      message: `Patient account ${result.rows[0].is_active ? 'activated' : 'deactivated'} successfully.`,
      data: { isActive: result.rows[0].is_active },
    };
  }

  // ───────────── Pharmacies ─────────────

  async listPharmacies(search?: string, status?: string, page = 1, limit = 20): Promise<ApiResponse> {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(
        `(LOWER(pharmacy_name) LIKE $${paramIdx} OR phone_number LIKE $${paramIdx} OR LOWER(email) LIKE $${paramIdx})`,
      );
      params.push(`%${search.toLowerCase()}%`);
      paramIdx++;
    }
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
      conditions.push(`verification_status = $${paramIdx++}`);
      params.push(status.toUpperCase());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.db.query(
      `SELECT COUNT(*) AS count FROM public.pharmacies ${whereClause}`,
      params,
    );

    const result = await this.db.query(
      `SELECT pharmacy_id, pharmacy_name, phone_number, email, tin, verification_status,
              rejection_reason, is_active, pharmacy_certificate_path, rdb_certificate_path, created_at
       FROM public.pharmacies ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset],
    );

    const pharmacies = result.rows.map((ph: any) => ({
      id: Number(ph.pharmacy_id),
      pharmacyName: ph.pharmacy_name,
      phoneNumber: ph.phone_number,
      email: ph.email,
      tin: ph.tin || null,
      verificationStatus: ph.verification_status || 'PENDING',
      rejectionReason: ph.rejection_reason || null,
      isActive: ph.is_active,
      hasPharmacyCertificate: !!ph.pharmacy_certificate_path,
      hasRdbCertificate: !!ph.rdb_certificate_path,
      createdAt: ph.created_at,
    }));

    return {
      success: true,
      message: 'Pharmacies retrieved.',
      data: {
        pharmacies,
        total: Number(countResult.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(Number(countResult.rows[0].count) / limit),
      },
    };
  }

  async getPharmacy(id: number): Promise<ApiResponse> {
    const result = await this.db.query(
      `SELECT pharmacy_id, pharmacy_name, phone_number, email, tin, location_address, latitude, longitude,
              verification_status, rejection_reason, verified_by, verified_at,
              is_active, pharmacy_certificate_path, rdb_certificate_path, created_at
       FROM public.pharmacies WHERE pharmacy_id = $1`,
      [id],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Pharmacy not found.');
    }
    const ph = result.rows[0];
    return {
      success: true,
      message: 'Pharmacy retrieved.',
      data: {
        id: Number(ph.pharmacy_id),
        pharmacyName: ph.pharmacy_name,
        phoneNumber: ph.phone_number,
        email: ph.email,
        tin: ph.tin || null,
        locationAddress: ph.location_address || null,
        latitude: ph.latitude || null,
        longitude: ph.longitude || null,
        verificationStatus: ph.verification_status || 'PENDING',
        rejectionReason: ph.rejection_reason || null,
        verifiedBy: ph.verified_by ? Number(ph.verified_by) : null,
        verifiedAt: ph.verified_at || null,
        isActive: ph.is_active,
        hasPharmacyCertificate: !!ph.pharmacy_certificate_path,
        hasRdbCertificate: !!ph.rdb_certificate_path,
        createdAt: ph.created_at,
      },
    };
  }

  async approvePharmacy(pharmacyId: number, adminId: number): Promise<ApiResponse> {
    const result = await this.db.query(
      `UPDATE public.pharmacies 
       SET verification_status = 'APPROVED', is_active = true, verified_by = $1, verified_at = NOW(), 
           rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE pharmacy_id = $2
       RETURNING pharmacy_id, pharmacy_name, verification_status`,
      [adminId, pharmacyId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Pharmacy not found.');
    }
    await this.logActivity(adminId, 'APPROVE_PHARMACY', 'PHARMACY', pharmacyId);

    return {
      success: true,
      message: `Pharmacy "${result.rows[0].pharmacy_name}" has been approved.`,
      data: {
        id: Number(result.rows[0].pharmacy_id),
        verificationStatus: result.rows[0].verification_status,
      },
    };
  }

  async rejectPharmacy(pharmacyId: number, adminId: number, dto: RejectPharmacyDto): Promise<ApiResponse> {
    const result = await this.db.query(
      `UPDATE public.pharmacies 
       SET verification_status = 'REJECTED', is_active = false, rejection_reason = $1, 
           verified_by = $2, verified_at = NOW(), updated_at = CURRENT_TIMESTAMP
       WHERE pharmacy_id = $3
       RETURNING pharmacy_id, pharmacy_name, verification_status`,
      [dto.rejectionReason, adminId, pharmacyId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Pharmacy not found.');
    }
    await this.logActivity(adminId, 'REJECT_PHARMACY', 'PHARMACY', pharmacyId, {
      reason: dto.rejectionReason,
    });

    return {
      success: true,
      message: `Pharmacy "${result.rows[0].pharmacy_name}" has been rejected.`,
      data: {
        id: Number(result.rows[0].pharmacy_id),
        verificationStatus: result.rows[0].verification_status,
      },
    };
  }

  async getPharmacyCertificatePath(pharmacyId: number, type: string): Promise<string | null> {
    const column = type === 'pharmacy' ? 'pharmacy_certificate_path' : 'rdb_certificate_path';
    const result = await this.db.query(
      `SELECT ${column} FROM public.pharmacies WHERE pharmacy_id = $1`,
      [pharmacyId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Pharmacy not found.');
    }
    return result.rows[0][column] || null;
  }

  // ───────────── Administrators ─────────────

  async listAdmins(): Promise<ApiResponse> {
    const result = await this.db.query(
      `SELECT admin_id, full_name, phone_number, email, is_active, must_change_password, role, created_at
       FROM public.admins ORDER BY created_at DESC`,
    );

    const admins = result.rows.map((a: any) => ({
      id: Number(a.admin_id),
      fullName: a.full_name,
      phoneNumber: a.phone_number,
      email: a.email,
      isActive: a.is_active,
      mustChangePassword: a.must_change_password,
      role: a.role,
      createdAt: a.created_at,
    }));

    return {
      success: true,
      message: 'Administrators retrieved.',
      data: { admins },
    };
  }

  async createAdmin(dto: CreateAdminDto, createdBy: number): Promise<ApiResponse> {
    const cleanEmail = dto.email.trim().toLowerCase();
    const cleanPhone = dto.phoneNumber.trim();

    // Check duplicate email across admins, patients, pharmacies
    const existingEmail = await this.db.query(
      `SELECT 1 FROM public.admins WHERE LOWER(email) = $1
       UNION ALL
       SELECT 1 FROM public.patients WHERE LOWER(email) = $1
       UNION ALL
       SELECT 1 FROM public.pharmacies WHERE LOWER(email) = $1
       LIMIT 1`,
      [cleanEmail],
    );
    if (existingEmail.rows.length > 0) {
      throw new ConflictException('An account with this email already exists.');
    }

    // Check duplicate phone
    const existingPhone = await this.db.query(
      `SELECT 1 FROM public.admins WHERE phone_number = $1 LIMIT 1`,
      [cleanPhone],
    );
    if (existingPhone.rows.length > 0) {
      throw new ConflictException('An admin with this phone number already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.db.query(
      `INSERT INTO public.admins (full_name, phone_number, email, password_hash, is_active, must_change_password, role, created_by)
       VALUES ($1, $2, $3, $4, true, true, 'ADMIN', $5)
       RETURNING admin_id, full_name, phone_number, email, is_active, must_change_password, created_at`,
      [dto.fullName.trim(), cleanPhone, cleanEmail, passwordHash, createdBy],
    );

    const admin = result.rows[0];
    await this.logActivity(createdBy, 'CREATE_ADMIN', 'ADMIN', Number(admin.admin_id));

    return {
      success: true,
      message: 'Administrator account created successfully.',
      data: {
        id: Number(admin.admin_id),
        fullName: admin.full_name,
        phoneNumber: admin.phone_number,
        email: admin.email,
        isActive: admin.is_active,
        mustChangePassword: admin.must_change_password,
        role: 'ADMIN',
        createdAt: admin.created_at,
      },
    };
  }

  async toggleAdminStatus(id: number, currentAdminId: number): Promise<ApiResponse> {
    if (id === currentAdminId) {
      return {
        success: false,
        message: 'You cannot deactivate your own account.',
      };
    }

    const result = await this.db.query(
      'UPDATE public.admins SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE admin_id = $1 RETURNING is_active, full_name',
      [id],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Administrator not found.');
    }
    await this.logActivity(currentAdminId, 'TOGGLE_ADMIN_STATUS', 'ADMIN', id);

    return {
      success: true,
      message: `Admin "${result.rows[0].full_name}" ${result.rows[0].is_active ? 'activated' : 'deactivated'} successfully.`,
      data: { isActive: result.rows[0].is_active },
    };
  }
}

