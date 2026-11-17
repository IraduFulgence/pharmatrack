import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service.js';
import type { CreateAdminDto } from './dto/create-admin.dto.js';
import type { UpdatePatientDto } from './dto/update-patient.dto.js';
import type { RejectPharmacyDto } from './dto/reject-pharmacy.dto.js';
import type { CreatePharmacyDto } from './dto/create-pharmacy.dto.js';
import type { UpdatePharmacyDto } from './dto/update-pharmacy.dto.js';
import type { CreatePatientDto } from './dto/create-patient.dto.js';
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

  async createPatient(dto: CreatePatientDto, adminId: number): Promise<ApiResponse> {
    const { fullName, phoneNumber, dateOfBirth, gender, password, email, nationalId } = dto;
    const cleanPhone = phoneNumber.trim();
    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanNationalId = nationalId ? nationalId.trim() : null;

    // 1. Calculate and validate age
    const calculatedAge = calculateAge(dateOfBirth);
    if (calculatedAge < 0 || calculatedAge > 130) {
      throw new BadRequestException({
        success: false,
        message: 'Validation failed.',
        errors: {
          dateOfBirth: 'Date of birth must correspond to a valid human age (between 0 and 130 years).',
        },
      });
    }

    // 2. Check duplicate National ID if provided
    if (cleanNationalId) {
      const existingNid = await this.db.query(
        'SELECT patient_id FROM public.patients WHERE national_id = $1 LIMIT 1',
        [cleanNationalId],
      );
      if (existingNid.rows.length > 0) {
        throw new ConflictException('A patient with this National ID already exists.');
      }
    }

    // 3. Check duplicate Email if provided across patients, pharmacies, and admins
    if (cleanEmail) {
      const existingEmail = await this.db.query(
        `SELECT 1 FROM public.patients WHERE LOWER(email) = $1
         UNION ALL
         SELECT 1 FROM public.pharmacies WHERE LOWER(email) = $1
         UNION ALL
         SELECT 1 FROM public.admins WHERE LOWER(email) = $1
         LIMIT 1`,
        [cleanEmail],
      );
      if (existingEmail.rows.length > 0) {
        throw new ConflictException('An account with this email already exists.');
      }
    }

    // 4. Check duplicate phone across patients, pharmacies, and admins
    const existingPhone = await this.db.query(
      `SELECT 1 FROM public.patients WHERE phone_number = $1
       UNION ALL
       SELECT 1 FROM public.pharmacies WHERE phone_number = $1
       UNION ALL
       SELECT 1 FROM public.admins WHERE phone_number = $1
       LIMIT 1`,
      [cleanPhone],
    );
    if (existingPhone.rows.length > 0) {
      throw new ConflictException('An account with this phone number already exists.');
    }

    // 5. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await this.db.query(
      `INSERT INTO public.patients 
        (national_id, full_name, age, date_of_birth, phone_number, email, gender, password_hash, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       RETURNING patient_id, national_id, full_name, age, to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth, phone_number, email, gender, is_active, created_at`,
      [cleanNationalId, fullName.trim(), calculatedAge, dateOfBirth, cleanPhone, cleanEmail, gender, passwordHash],
    );

    const patient = result.rows[0];
    await this.logActivity(adminId, 'CREATE_PATIENT', 'PATIENT', Number(patient.patient_id), {
      fullName: patient.full_name,
      phoneNumber: patient.phone_number,
    });

    return {
      success: true,
      message: 'Patient account created successfully.',
      data: {
        id: Number(patient.patient_id),
        nationalId: patient.national_id || null,
        fullName: patient.full_name,
        dateOfBirth: patient.date_of_birth ? formatDate(patient.date_of_birth) : dateOfBirth,
        age: calculatedAge,
        phoneNumber: patient.phone_number,
        email: patient.email || null,
        gender: patient.gender,
        isActive: patient.is_active,
        createdAt: patient.created_at,
      },
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

    const usersResult = await this.db.query(
      `SELECT pharmacy_user_id, full_name, email, phone_number, role, is_active, last_login_at, created_at
       FROM public.pharmacy_users
       WHERE pharmacy_id = $1
       ORDER BY role = 'PHARMACY_ADMIN' DESC, created_at ASC`,
      [id],
    );

    const pharmacyAdministrators = usersResult.rows
      .filter((u: any) => u.role === 'PHARMACY_ADMIN' || u.role === 'OWNER')
      .map((u: any) => ({
        id: Number(u.pharmacy_user_id),
        fullName: u.full_name,
        email: u.email,
        phoneNumber: u.phone_number,
        role: u.role,
        isActive: u.is_active,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
      }));

    const staffMembers = usersResult.rows.map((u: any) => ({
      id: Number(u.pharmacy_user_id),
      fullName: u.full_name,
      email: u.email,
      phoneNumber: u.phone_number,
      role: u.role,
      isActive: u.is_active,
      lastLoginAt: u.last_login_at,
      createdAt: u.created_at,
    }));

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
        latitude: ph.latitude ? Number(ph.latitude) : null,
        longitude: ph.longitude ? Number(ph.longitude) : null,
        verificationStatus: ph.verification_status || 'PENDING',
        rejectionReason: ph.rejection_reason || null,
        verifiedBy: ph.verified_by ? Number(ph.verified_by) : null,
        verifiedAt: ph.verified_at || null,
        isActive: ph.is_active,
        hasPharmacyCertificate: !!ph.pharmacy_certificate_path,
        hasRdbCertificate: !!ph.rdb_certificate_path,
        createdAt: ph.created_at,
        pharmacyAdministrators,
        staff: staffMembers,
      },
    };
  }

  async updatePharmacy(
    pharmacyId: number,
    dto: UpdatePharmacyDto,
    adminId: number,
  ): Promise<ApiResponse> {
    const existing = await this.db.query(
      'SELECT pharmacy_id, pharmacy_name, email, phone_number, tin FROM public.pharmacies WHERE pharmacy_id = $1',
      [pharmacyId],
    );
    if (existing.rows.length === 0) {
      throw new NotFoundException('Pharmacy not found.');
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (dto.pharmacyName !== undefined) {
      updates.push(`pharmacy_name = $${paramIdx++}`);
      params.push(dto.pharmacyName.trim());
    }

    if (dto.phoneNumber !== undefined) {
      const cleanPhone = dto.phoneNumber.trim();
      const phoneConflict = await this.db.query(
        `SELECT 1 FROM public.pharmacies WHERE phone_number = $1 AND pharmacy_id != $2
         UNION ALL
         SELECT 1 FROM public.admins WHERE phone_number = $1
         LIMIT 1`,
        [cleanPhone, pharmacyId],
      );
      if (phoneConflict.rows.length > 0) {
        throw new ConflictException('A pharmacy or admin with this phone number already exists.');
      }
      updates.push(`phone_number = $${paramIdx++}`);
      params.push(cleanPhone);
    }

    if (dto.email !== undefined) {
      const cleanEmail = dto.email.trim().toLowerCase();
      const emailConflict = await this.db.query(
        `SELECT 1 FROM public.pharmacies WHERE LOWER(email) = $1 AND pharmacy_id != $2
         UNION ALL
         SELECT 1 FROM public.admins WHERE LOWER(email) = $1
         LIMIT 1`,
        [cleanEmail, pharmacyId],
      );
      if (emailConflict.rows.length > 0) {
        throw new ConflictException('An account with this email already exists.');
      }
      updates.push(`email = $${paramIdx++}`);
      params.push(cleanEmail);
    }

    if (dto.tin !== undefined) {
      const cleanTin = dto.tin.trim();
      const tinConflict = await this.db.query(
        'SELECT 1 FROM public.pharmacies WHERE tin = $1 AND pharmacy_id != $2 LIMIT 1',
        [cleanTin, pharmacyId],
      );
      if (tinConflict.rows.length > 0) {
        throw new ConflictException('A pharmacy with this TIN already exists.');
      }
      updates.push(`tin = $${paramIdx++}`);
      params.push(cleanTin);
    }

    if (dto.locationAddress !== undefined) {
      updates.push(`location_address = $${paramIdx++}`);
      params.push(dto.locationAddress.trim());
    }

    if (dto.latitude !== undefined) {
      updates.push(`latitude = $${paramIdx++}`);
      params.push(dto.latitude);
    }

    if (dto.longitude !== undefined) {
      updates.push(`longitude = $${paramIdx++}`);
      params.push(dto.longitude);
    }

    if (dto.verificationStatus !== undefined) {
      updates.push(`verification_status = $${paramIdx++}`);
      params.push(dto.verificationStatus);
      if (dto.verificationStatus === 'APPROVED') {
        updates.push(`verified_by = $${paramIdx++}`);
        params.push(adminId);
        updates.push(`verified_at = CURRENT_TIMESTAMP`);
      }
    }

    if (dto.isActive !== undefined) {
      updates.push(`is_active = $${paramIdx++}`);
      params.push(dto.isActive);
    }

    if (updates.length === 0) {
      return this.getPharmacy(pharmacyId);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(pharmacyId);

    await this.db.query(
      `UPDATE public.pharmacies SET ${updates.join(', ')} WHERE pharmacy_id = $${paramIdx}`,
      params,
    );

    await this.logActivity(adminId, 'UPDATE_PHARMACY', 'PHARMACY', pharmacyId, dto);

    return this.getPharmacy(pharmacyId);
  }

  async togglePharmacyStatus(pharmacyId: number, adminId: number): Promise<ApiResponse> {
    const result = await this.db.query(
      'UPDATE public.pharmacies SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE pharmacy_id = $1 RETURNING is_active, pharmacy_name',
      [pharmacyId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Pharmacy not found.');
    }
    const { is_active: isActive, pharmacy_name: pharmacyName } = result.rows[0];

    await this.logActivity(adminId, isActive ? 'ACTIVATE_PHARMACY' : 'SUSPEND_PHARMACY', 'PHARMACY', pharmacyId);

    return {
      success: true,
      message: `Pharmacy "${pharmacyName}" ${isActive ? 'activated' : 'suspended'} successfully.`,
      data: { isActive },
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

  async createPharmacy(dto: CreatePharmacyDto, adminId: number): Promise<ApiResponse> {
    const { pharmacyName, phoneNumber, email, tin, password, locationAddress, verificationStatus } = dto;
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phoneNumber.trim();
    const cleanTin = tin.trim();
    const status = verificationStatus === 'PENDING' ? 'PENDING' : 'APPROVED';

    // 1. Check duplicate email across pharmacies, patients, and admins
    const existingEmail = await this.db.query(
      `SELECT 1 FROM public.pharmacies WHERE LOWER(email) = $1
       UNION ALL
       SELECT 1 FROM public.patients WHERE LOWER(email) = $1
       UNION ALL
       SELECT 1 FROM public.admins WHERE LOWER(email) = $1
       LIMIT 1`,
      [cleanEmail],
    );
    if (existingEmail.rows.length > 0) {
      throw new ConflictException('An account with this email already exists.');
    }

    // 2. Check duplicate phone across pharmacies, patients, and admins
    const existingPhone = await this.db.query(
      `SELECT 1 FROM public.pharmacies WHERE phone_number = $1
       UNION ALL
       SELECT 1 FROM public.patients WHERE phone_number = $1
       UNION ALL
       SELECT 1 FROM public.admins WHERE phone_number = $1
       LIMIT 1`,
      [cleanPhone],
    );
    if (existingPhone.rows.length > 0) {
      throw new ConflictException('An account with this phone number already exists.');
    }

    // 3. Check duplicate TIN
    const existingTin = await this.db.query(
      'SELECT pharmacy_id FROM public.pharmacies WHERE tin = $1 LIMIT 1',
      [cleanTin],
    );
    if (existingTin.rows.length > 0) {
      throw new ConflictException('A pharmacy with this TIN already exists.');
    }

    // 4. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. In transaction: insert into pharmacies and pharmacy_users
    const result = await this.db.transaction(async (client) => {
      const isApproved = status === 'APPROVED';
      const pharmRes = await client.query(
        `INSERT INTO public.pharmacies 
          (pharmacy_name, phone_number, email, tin, location_address, verification_status, verified_by, verified_at, password_hash, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
         RETURNING pharmacy_id, pharmacy_name, phone_number, email, tin, location_address, verification_status, is_active, created_at`,
        [
          pharmacyName.trim(),
          cleanPhone,
          cleanEmail,
          cleanTin,
          locationAddress ? locationAddress.trim() : null,
          status,
          isApproved ? adminId : null,
          isApproved ? new Date() : null,
          passwordHash,
        ],
      );

      const newPharmacy = pharmRes.rows[0];

      // Insert primary owner into pharmacy_users as PHARMACY_ADMIN
      await client.query(
        `INSERT INTO public.pharmacy_users 
          (pharmacy_id, full_name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, 'PHARMACY_ADMIN', true)`,
        [newPharmacy.pharmacy_id, pharmacyName.trim(), cleanEmail, passwordHash],
      );

      return newPharmacy;
    });

    await this.logActivity(adminId, 'CREATE_PHARMACY', 'PHARMACY', Number(result.pharmacy_id), {
      pharmacyName: result.pharmacy_name,
      tin: result.tin,
      status,
    });

    return {
      success: true,
      message: `Pharmacy "${result.pharmacy_name}" created successfully.`,
      data: {
        id: Number(result.pharmacy_id),
        pharmacyName: result.pharmacy_name,
        phoneNumber: result.phone_number,
        email: result.email,
        tin: result.tin,
        locationAddress: result.location_address,
        verificationStatus: result.verification_status,
        isActive: result.is_active,
        createdAt: result.created_at,
      },
    };
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

  // ───────────── System-Wide Reports & Activity Monitoring ─────────────

  async getSystemOverviewReport(): Promise<ApiResponse> {
    const pharmaciesStats = await this.db.query(`
      SELECT 
        COUNT(*) AS total_pharmacies,
        COUNT(*) FILTER (WHERE is_active = true) AS active_pharmacies,
        COUNT(*) FILTER (WHERE is_active = false) AS suspended_pharmacies,
        COUNT(*) FILTER (WHERE verification_status = 'APPROVED') AS approved_pharmacies,
        COUNT(*) FILTER (WHERE verification_status = 'PENDING') AS pending_pharmacies,
        COUNT(*) FILTER (WHERE verification_status = 'REJECTED') AS rejected_pharmacies
      FROM public.pharmacies
    `);

    const usersStats = await this.db.query(`
      SELECT 
        COUNT(*) AS total_pharmacy_users,
        COUNT(*) FILTER (WHERE role IN ('PHARMACY_ADMIN', 'OWNER')) AS total_pharmacy_admins,
        COUNT(*) FILTER (WHERE role = 'PHARMACIST') AS total_pharmacists,
        COUNT(*) FILTER (WHERE role = 'SALES_OFFICER') AS total_sales_officers,
        COUNT(*) FILTER (WHERE is_active = true) AS active_users,
        COUNT(*) FILTER (WHERE is_active = false) AS inactive_users
      FROM public.pharmacy_users
    `);

    const salesStats = await this.db.query(`
      SELECT 
        COUNT(*) AS total_sales,
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COALESCE(SUM(paid_amount), 0) AS total_paid,
        COUNT(DISTINCT pharmacy_id) AS pharmacies_with_sales
      FROM public.sales
      WHERE status != 'CANCELLED'
    `);

    const inventoryStats = await this.db.query(`
      SELECT 
        COUNT(*) AS total_batches,
        COALESCE(SUM(quantity), 0) AS total_units_in_stock,
        COUNT(*) FILTER (WHERE quantity <= 10) AS low_stock_batches,
        COUNT(*) FILTER (WHERE expiry_date <= CURRENT_DATE) AS expired_batches
      FROM public.batches
    `);

    const recentActivities = await this.db.query(`
      SELECT log_id, admin_id, action, target_type, target_id, details, created_at
      FROM public.admin_activity_logs
      ORDER BY created_at DESC
      LIMIT 20
    `);

    return {
      success: true,
      message: 'System overview report generated successfully.',
      data: {
        pharmacies: {
          total: Number(pharmaciesStats.rows[0].total_pharmacies),
          active: Number(pharmaciesStats.rows[0].active_pharmacies),
          suspended: Number(pharmaciesStats.rows[0].suspended_pharmacies),
          approved: Number(pharmaciesStats.rows[0].approved_pharmacies),
          pending: Number(pharmaciesStats.rows[0].pending_pharmacies),
          rejected: Number(pharmaciesStats.rows[0].rejected_pharmacies),
        },
        users: {
          total: Number(usersStats.rows[0].total_pharmacy_users),
          admins: Number(usersStats.rows[0].total_pharmacy_admins),
          pharmacists: Number(usersStats.rows[0].total_pharmacists),
          salesOfficers: Number(usersStats.rows[0].total_sales_officers),
          active: Number(usersStats.rows[0].active_users),
          inactive: Number(usersStats.rows[0].inactive_users),
        },
        sales: {
          totalSales: Number(salesStats.rows[0].total_sales),
          totalRevenue: Number(salesStats.rows[0].total_revenue),
          totalPaid: Number(salesStats.rows[0].total_paid),
          pharmaciesWithSales: Number(salesStats.rows[0].pharmacies_with_sales),
        },
        inventory: {
          totalBatches: Number(inventoryStats.rows[0].total_batches),
          totalUnitsInStock: Number(inventoryStats.rows[0].total_units_in_stock),
          lowStockBatches: Number(inventoryStats.rows[0].low_stock_batches),
          expiredBatches: Number(inventoryStats.rows[0].expired_batches),
        },
        recentActivities: recentActivities.rows.map((a: any) => ({
          logId: Number(a.log_id),
          adminId: Number(a.admin_id),
          action: a.action,
          targetType: a.target_type,
          targetId: a.target_id ? Number(a.target_id) : null,
          details: a.details,
          createdAt: a.created_at,
        })),
      },
    };
  }

  async getPharmacyActivities(
    pharmacyId: number,
    query?: { action?: string; employeeId?: number; startDate?: string; endDate?: string; page?: number; limit?: number },
  ): Promise<ApiResponse> {
    const phCheck = await this.db.query('SELECT pharmacy_name FROM public.pharmacies WHERE pharmacy_id = $1', [pharmacyId]);
    if (phCheck.rows.length === 0) {
      throw new NotFoundException('Pharmacy not found.');
    }

    const conditions: string[] = ['l.pharmacy_id = $1'];
    const params: any[] = [pharmacyId];
    let paramIdx = 2;

    if (query?.action) {
      conditions.push(`l.action = $${paramIdx++}`);
      params.push(query.action);
    }
    if (query?.employeeId) {
      conditions.push(`l.pharmacy_user_id = $${paramIdx++}`);
      params.push(query.employeeId);
    }
    if (query?.startDate) {
      conditions.push(`l.created_at >= $${paramIdx++}`);
      params.push(query.startDate);
    }
    if (query?.endDate) {
      conditions.push(`l.created_at <= $${paramIdx++}`);
      params.push(query.endDate);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const page = query?.page ? Number(query.page) : 1;
    const limit = query?.limit ? Number(query.limit) : 20;
    const offset = (page - 1) * limit;

    const countRes = await this.db.query(
      `SELECT COUNT(*) AS count FROM public.pharmacy_user_activity_logs l ${whereClause}`,
      params,
    );

    const logsRes = await this.db.query(
      `SELECT l.log_id, l.pharmacy_id, l.pharmacy_user_id, l.action, l.target_type, l.target_id, l.details, l.created_at,
              u.full_name AS employee_name, u.role AS employee_role
       FROM public.pharmacy_user_activity_logs l
       LEFT JOIN public.pharmacy_users u ON l.pharmacy_user_id = u.pharmacy_user_id
       ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset],
    );

    return {
      success: true,
      message: 'Pharmacy activity logs retrieved.',
      data: {
        pharmacyName: phCheck.rows[0].pharmacy_name,
        logs: logsRes.rows.map((row: any) => ({
          id: Number(row.log_id),
          employeeId: row.pharmacy_user_id ? Number(row.pharmacy_user_id) : null,
          employeeName: row.employee_name || 'System / Unassigned',
          role: row.employee_role || null,
          action: row.action,
          targetType: row.target_type,
          targetId: row.target_id ? Number(row.target_id) : null,
          details: row.details,
          createdAt: row.created_at,
        })),
        total: Number(countRes.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(Number(countRes.rows[0].count) / limit),
      },
    };
  }
}

