import crypto from 'node:crypto';
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service.js';
import { MailService } from '../mail/mail.service.js';
import type { RegisterPatientDto } from './dto/register-patient.dto.js';
import type { RegisterPharmacyDto } from './dto/register-pharmacy.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import type { ResetPasswordDto } from './dto/reset-password.dto.js';
import type { ApiResponse } from '../common/interfaces/api-response.interface.js';

export function calculateAge(dob: string | Date): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function formatDate(date: string | Date): string {
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  return String(date);
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Register a new patient account with dateOfBirth and calculated updated age.
   * Email and National ID are optional.
   */
  async registerPatient(dto: RegisterPatientDto): Promise<ApiResponse> {
    const { fullName, dateOfBirth, phoneNumber, gender, password } = dto;

    // Normalize optional fields — empty strings become null
    const cleanEmail = dto.email?.trim().toLowerCase() || null;
    const cleanNationalId = dto.nationalId?.trim() || null;
    const cleanPhone = phoneNumber.trim();

    // 1. Validate dateOfBirth logic (must be in the past, reasonable age between 0 and 130)
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const birthDateStart = new Date(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());

    if (birthDateStart > todayStart) {
      throw new BadRequestException({
        success: false,
        message: 'Validation failed.',
        errors: {
          dateOfBirth: 'Date of birth cannot be in the future.',
        },
      });
    }

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

    // 2. Check for duplicate National ID (only if provided)
    if (cleanNationalId) {
      const existingNid = await this.db.query(
        'SELECT patient_id FROM public.patients WHERE national_id = $1 LIMIT 1',
        [cleanNationalId],
      );
      if (existingNid.rows.length > 0) {
        throw new ConflictException('A patient with this National ID already exists.');
      }
    }

    // 3. Check for duplicate Email (only if provided — across patients and pharmacies)
    if (cleanEmail) {
      const existingEmailPatient = await this.db.query(
        'SELECT patient_id FROM public.patients WHERE LOWER(email) = $1 LIMIT 1',
        [cleanEmail],
      );
      const existingEmailPharmacy = await this.db.query(
        'SELECT pharmacy_id FROM public.pharmacies WHERE LOWER(email) = $1 LIMIT 1',
        [cleanEmail],
      );
      if (existingEmailPatient.rows.length > 0 || existingEmailPharmacy.rows.length > 0) {
        throw new ConflictException('An account with this email already exists.');
      }
    }

    // 4. Check for duplicate Phone Number (across patients and pharmacies)
    const existingPhonePatient = await this.db.query(
      'SELECT patient_id FROM public.patients WHERE phone_number = $1 LIMIT 1',
      [cleanPhone],
    );
    const existingPhonePharmacy = await this.db.query(
      'SELECT pharmacy_id FROM public.pharmacies WHERE phone_number = $1 LIMIT 1',
      [cleanPhone],
    );
    if (existingPhonePatient.rows.length > 0 || existingPhonePharmacy.rows.length > 0) {
      throw new ConflictException('An account with this phone number already exists.');
    }

    // 5. Secure password hashing using bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const result = await this.db.query(
        `INSERT INTO public.patients 
          (national_id, full_name, age, date_of_birth, phone_number, email, gender, password_hash, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         RETURNING patient_id, national_id, full_name, age, to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth, phone_number, email, gender`,
        [cleanNationalId, fullName.trim(), calculatedAge, dateOfBirth, cleanPhone, cleanEmail, gender, passwordHash],
      );

      const patient = result.rows[0];

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
          role: 'PATIENT',
        },
      };
    } catch (error: any) {
      if (error.code === '23505') {
        if (error.constraint?.includes('national_id')) {
          throw new ConflictException('A patient with this National ID already exists.');
        }
        if (error.constraint?.includes('email')) {
          throw new ConflictException('An account with this email already exists.');
        }
        if (error.constraint?.includes('phone_number')) {
          throw new ConflictException('An account with this phone number already exists.');
        }
        throw new ConflictException('An account with these details already exists.');
      }
      this.logger.error(`Error registering patient: ${error.message}`);
      throw error;
    }
  }

  /**
   * Register a new pharmacy account with TIN and optional document uploads
   */
  async registerPharmacy(
    dto: RegisterPharmacyDto,
    pharmacyCertificatePath?: string | null,
    rdbCertificatePath?: string | null,
  ): Promise<ApiResponse> {
    const { pharmacyName, phoneNumber, email, tin, password } = dto;
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phoneNumber.trim();
    const cleanTin = tin.trim();

    // 1. Check for duplicate Email (across pharmacies and patients)
    const existingEmailPharmacy = await this.db.query(
      'SELECT pharmacy_id FROM public.pharmacies WHERE LOWER(email) = $1 LIMIT 1',
      [cleanEmail],
    );
    const existingEmailPatient = await this.db.query(
      'SELECT patient_id FROM public.patients WHERE LOWER(email) = $1 LIMIT 1',
      [cleanEmail],
    );
    if (existingEmailPharmacy.rows.length > 0 || existingEmailPatient.rows.length > 0) {
      throw new ConflictException('An account with this email already exists.');
    }

    // 2. Check for duplicate Phone Number (across pharmacies and patients)
    const existingPhonePharmacy = await this.db.query(
      'SELECT pharmacy_id FROM public.pharmacies WHERE phone_number = $1 LIMIT 1',
      [cleanPhone],
    );
    const existingPhonePatient = await this.db.query(
      'SELECT patient_id FROM public.patients WHERE phone_number = $1 LIMIT 1',
      [cleanPhone],
    );
    if (existingPhonePharmacy.rows.length > 0 || existingPhonePatient.rows.length > 0) {
      throw new ConflictException('An account with this phone number already exists.');
    }

    // 3. Check for duplicate TIN
    const existingTin = await this.db.query(
      'SELECT pharmacy_id FROM public.pharmacies WHERE tin = $1 LIMIT 1',
      [cleanTin],
    );
    if (existingTin.rows.length > 0) {
      throw new ConflictException('A pharmacy with this TIN already exists.');
    }

    // 4. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      // 5. Use transaction to insert into both pharmacies and pharmacy_users
      const pharmacy = await this.db.transaction(async (client) => {
        const pharmResult = await client.query(
          `INSERT INTO public.pharmacies 
            (pharmacy_name, phone_number, email, tin, pharmacy_certificate_path, rdb_certificate_path, verification_status, password_hash, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, true)
           RETURNING pharmacy_id, pharmacy_name, phone_number, email, tin, verification_status`,
          [pharmacyName.trim(), cleanPhone, cleanEmail, cleanTin, pharmacyCertificatePath || null, rdbCertificatePath || null, passwordHash],
        );

        const newPharmacy = pharmResult.rows[0];

        // Also associate an owner in pharmacy_users for existing system consistency
        await client.query(
          `INSERT INTO public.pharmacy_users 
            (pharmacy_id, full_name, email, password_hash, role, is_active)
           VALUES ($1, $2, $3, $4, 'OWNER', true)`,
          [newPharmacy.pharmacy_id, pharmacyName.trim(), cleanEmail, passwordHash],
        );

        return newPharmacy;
      });

      return {
        success: true,
        message: 'Pharmacy account created successfully. Your account is pending verification.',
        data: {
          id: Number(pharmacy.pharmacy_id),
          pharmacyName: pharmacy.pharmacy_name,
          phoneNumber: pharmacy.phone_number,
          email: pharmacy.email,
          tin: pharmacy.tin,
          verificationStatus: pharmacy.verification_status,
          role: 'PHARMACY',
        },
      };
    } catch (error: any) {
      if (error.code === '23505') {
        if (error.constraint?.includes('email')) {
          throw new ConflictException('An account with this email already exists.');
        }
        if (error.constraint?.includes('phone_number')) {
          throw new ConflictException('An account with this phone number already exists.');
        }
        if (error.constraint?.includes('tin')) {
          throw new ConflictException('A pharmacy with this TIN already exists.');
        }
        throw new ConflictException('An account with these details already exists.');
      }
      this.logger.error(`Error registering pharmacy: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unified Login for Patients, Pharmacies, and Admins (Email or Phone Number)
   */
  async login(dto: LoginDto): Promise<ApiResponse> {
    const identifier = dto.identifier.trim();
    const cleanEmail = identifier.toLowerCase();

    // 1. Check patient account
    const patientResult = await this.db.query(
      `SELECT patient_id, full_name, email, phone_number, password_hash, is_active 
       FROM public.patients 
       WHERE LOWER(email) = $1 OR phone_number = $2 
       LIMIT 1`,
      [cleanEmail, identifier],
    );

    if (patientResult.rows.length > 0) {
      const patient = patientResult.rows[0];

      if (patient.password_hash) {
        const isMatch = await bcrypt.compare(dto.password, patient.password_hash);
        if (isMatch) {
          if (!patient.is_active) {
            throw new ForbiddenException('Account not authorized, suspended, or awaiting approval.');
          }

          const token = this.jwtService.sign({
            sub: Number(patient.patient_id),
            email: patient.email,
            phoneNumber: patient.phone_number,
            role: 'PATIENT',
          });

          return {
            success: true,
            message: 'Login successful.',
            data: {
              token,
              user: {
                id: Number(patient.patient_id),
                fullName: patient.full_name,
                email: patient.email,
                phoneNumber: patient.phone_number,
                role: 'PATIENT',
              },
              redirectTo: '/patient/dashboard',
            },
          };
        }
      }
    }

    // 2. Check pharmacy account
    const pharmacyResult = await this.db.query(
      `SELECT pharmacy_id, pharmacy_name, email, phone_number, password_hash, is_active, verification_status 
       FROM public.pharmacies 
       WHERE LOWER(email) = $1 OR phone_number = $2 
       LIMIT 1`,
      [cleanEmail, identifier],
    );

    if (pharmacyResult.rows.length > 0) {
      const pharmacy = pharmacyResult.rows[0];

      if (pharmacy.password_hash) {
        const isMatch = await bcrypt.compare(dto.password, pharmacy.password_hash);
        if (isMatch) {
          if (!pharmacy.is_active) {
            throw new ForbiddenException('Account not authorized, suspended, or awaiting approval.');
          }

          const token = this.jwtService.sign({
            sub: Number(pharmacy.pharmacy_id),
            email: pharmacy.email,
            phoneNumber: pharmacy.phone_number,
            role: 'PHARMACY',
          });

          return {
            success: true,
            message: 'Login successful.',
            data: {
              token,
              user: {
                id: Number(pharmacy.pharmacy_id),
                pharmacyName: pharmacy.pharmacy_name,
                email: pharmacy.email,
                phoneNumber: pharmacy.phone_number,
                role: 'PHARMACY',
                verificationStatus: pharmacy.verification_status || 'PENDING',
              },
              redirectTo: '/pharmacy/dashboard',
            },
          };
        }
      }
    }

    // 3. Check admin account
    const adminResult = await this.db.query(
      `SELECT admin_id, full_name, email, phone_number, password_hash, is_active, must_change_password 
       FROM public.admins 
       WHERE LOWER(email) = $1 OR phone_number = $2 
       LIMIT 1`,
      [cleanEmail, identifier],
    );

    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];

      if (admin.password_hash) {
        const isMatch = await bcrypt.compare(dto.password, admin.password_hash);
        if (isMatch) {
          if (!admin.is_active) {
            throw new ForbiddenException('Account not authorized, suspended, or awaiting approval.');
          }

          const token = this.jwtService.sign({
            sub: Number(admin.admin_id),
            email: admin.email,
            phoneNumber: admin.phone_number,
            role: 'ADMIN',
            mustChangePassword: admin.must_change_password,
          });

          return {
            success: true,
            message: 'Login successful.',
            data: {
              token,
              user: {
                id: Number(admin.admin_id),
                fullName: admin.full_name,
                email: admin.email,
                phoneNumber: admin.phone_number,
                role: 'ADMIN',
                mustChangePassword: admin.must_change_password,
              },
              redirectTo: '/admin/dashboard',
            },
          };
        }
      }
    }

    // 4. Fallback: Generic error message to prevent account enumeration
    throw new UnauthorizedException('Invalid credentials.');
  }

  /**
   * Request password reset link (sends email with secret reset token)
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<ApiResponse> {
    const cleanEmail = dto.email.trim().toLowerCase();

    // 1. Search in patients
    const patientResult = await this.db.query(
      'SELECT patient_id, full_name, email FROM public.patients WHERE LOWER(email) = $1 LIMIT 1',
      [cleanEmail],
    );

    // 2. Search in pharmacies
    const pharmacyResult = await this.db.query(
      'SELECT pharmacy_id, pharmacy_name, email FROM public.pharmacies WHERE LOWER(email) = $1 LIMIT 1',
      [cleanEmail],
    );

    let userType: 'PATIENT' | 'PHARMACY' | 'ADMIN' | null = null;
    let userId: number | null = null;
    let recipientName = '';

    if (patientResult.rows.length > 0) {
      userType = 'PATIENT';
      userId = Number(patientResult.rows[0].patient_id);
      recipientName = patientResult.rows[0].full_name;
    } else if (pharmacyResult.rows.length > 0) {
      userType = 'PHARMACY';
      userId = Number(pharmacyResult.rows[0].pharmacy_id);
      recipientName = pharmacyResult.rows[0].pharmacy_name;
    } else {
      // 3. Search in admins
      const adminResult = await this.db.query(
        'SELECT admin_id, full_name, email FROM public.admins WHERE LOWER(email) = $1 LIMIT 1',
        [cleanEmail],
      );
      if (adminResult.rows.length > 0) {
        userType = 'ADMIN';
        userId = Number(adminResult.rows[0].admin_id);
        recipientName = adminResult.rows[0].full_name;
      }
    }

    if (userType && userId) {
      // Generate a cryptographically secure random token (64 hex characters)
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

      // Invalidate existing unused tokens for this email
      await this.db.query(
        'UPDATE public.password_resets SET used = true WHERE LOWER(email) = $1 AND used = false',
        [cleanEmail],
      );

      // Store hashed token
      await this.db.query(
        `INSERT INTO public.password_resets 
          (email, user_type, user_id, token_hash, expires_at, used)
         VALUES ($1, $2, $3, $4, $5, false)`,
        [cleanEmail, userType, userId, tokenHash, expiresAt],
      );

      // Send email via MailService (non-blocking)
      this.mailService
        .sendPasswordResetEmail(cleanEmail, recipientName, rawToken)
        .catch((err) => {
          this.logger.error(`Error sending password reset email to ${cleanEmail}: ${err.message}`);
        });
    }

    // Always return generic message to prevent account enumeration
    return {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  }

  /**
   * Reset password using the verified reset token
   */
  async resetPassword(dto: ResetPasswordDto): Promise<ApiResponse> {
    const rawToken = dto.token.trim();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Query valid, unused, unexpired reset token
    const result = await this.db.query(
      `SELECT reset_id, email, user_type, user_id, expires_at 
       FROM public.password_resets 
       WHERE token_hash = $1 AND used = false AND expires_at > NOW() 
       LIMIT 1`,
      [tokenHash],
    );

    if (result.rows.length === 0) {
      throw new BadRequestException({
        success: false,
        message: 'Invalid or expired password reset token.',
      });
    }

    const resetRecord = result.rows[0];
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    if (resetRecord.user_type === 'PATIENT') {
      await this.db.query(
        'UPDATE public.patients SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE patient_id = $2',
        [newPasswordHash, resetRecord.user_id],
      );
    } else if (resetRecord.user_type === 'PHARMACY') {
      await this.db.transaction(async (client) => {
        await client.query(
          'UPDATE public.pharmacies SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE pharmacy_id = $2',
          [newPasswordHash, resetRecord.user_id],
        );
        await client.query(
          'UPDATE public.pharmacy_users SET password_hash = $1 WHERE pharmacy_id = $2',
          [newPasswordHash, resetRecord.user_id],
        );
      });
    } else if (resetRecord.user_type === 'ADMIN') {
      await this.db.query(
        'UPDATE public.admins SET password_hash = $1, must_change_password = false, updated_at = CURRENT_TIMESTAMP WHERE admin_id = $2',
        [newPasswordHash, resetRecord.user_id],
      );
    }

    // Mark the reset token as used
    await this.db.query(
      'UPDATE public.password_resets SET used = true WHERE reset_id = $1',
      [resetRecord.reset_id],
    );

    return {
      success: true,
      message: 'Password has been reset successfully.',
    };
  }

  /**
   * Helper to retrieve user profile for token verification with updated age
   */
  async getProfile(userId: number, role: 'PATIENT' | 'PHARMACY' | 'ADMIN'): Promise<ApiResponse> {
    if (role === 'PATIENT') {
      const result = await this.db.query(
        `SELECT patient_id, national_id, full_name, age, to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth, phone_number, email, gender, is_active, created_at 
         FROM public.patients 
         WHERE patient_id = $1`,
        [userId],
      );
      if (result.rows.length === 0) {
        throw new UnauthorizedException('User account no longer exists.');
      }
      const p = result.rows[0];
      const dynamicAge = p.date_of_birth ? calculateAge(p.date_of_birth) : Number(p.age);
      const dobFormatted = p.date_of_birth ? formatDate(p.date_of_birth) : null;

      return {
        success: true,
        message: 'Profile retrieved successfully.',
        data: {
          id: Number(p.patient_id),
          nationalId: p.national_id || null,
          fullName: p.full_name,
          dateOfBirth: dobFormatted,
          age: dynamicAge,
          phoneNumber: p.phone_number,
          email: p.email || null,
          gender: p.gender,
          role: 'PATIENT',
        },
      };
    } else if (role === 'ADMIN') {
      const result = await this.db.query(
        `SELECT admin_id, full_name, phone_number, email, is_active, must_change_password, role, created_at 
         FROM public.admins 
         WHERE admin_id = $1`,
        [userId],
      );
      if (result.rows.length === 0) {
        throw new UnauthorizedException('Admin account no longer exists.');
      }
      const a = result.rows[0];
      return {
        success: true,
        message: 'Profile retrieved successfully.',
        data: {
          id: Number(a.admin_id),
          fullName: a.full_name,
          phoneNumber: a.phone_number,
          email: a.email,
          mustChangePassword: a.must_change_password,
          role: 'ADMIN',
        },
      };
    } else {
      const result = await this.db.query(
        `SELECT pharmacy_id, pharmacy_name, phone_number, email, location_address, tin, verification_status, is_active, created_at 
         FROM public.pharmacies 
         WHERE pharmacy_id = $1`,
        [userId],
      );
      if (result.rows.length === 0) {
        throw new UnauthorizedException('Pharmacy account no longer exists.');
      }
      const ph = result.rows[0];
      return {
        success: true,
        message: 'Profile retrieved successfully.',
        data: {
          id: Number(ph.pharmacy_id),
          pharmacyName: ph.pharmacy_name,
          phoneNumber: ph.phone_number,
          email: ph.email,
          tin: ph.tin || null,
          verificationStatus: ph.verification_status || 'PENDING',
          role: 'PHARMACY',
        },
      };
    }
  }
}
