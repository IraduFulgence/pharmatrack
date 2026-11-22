import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import bcrypt from 'bcryptjs';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';

@Injectable()
export class ProfileService {
  constructor(private readonly db: DatabaseService) {}

  async getOwnProfile(user: JwtPayload) {
    if (user.role === 'SYSTEM_ADMIN') {
      const res = await this.db.query('SELECT admin_id, full_name, email, phone_number FROM public.admins WHERE admin_id = $1', [user.sub]);
      if (res.rows.length === 0) {
        throw new NotFoundException('Admin not found');
      }
      return res.rows[0];
    }
    // PHARMACY_ADMIN (also other staff, but this service is for own profile)
    const res = await this.db.query('SELECT pharmacy_user_id, full_name, email, phone_number FROM public.pharmacy_users WHERE pharmacy_user_id = $1', [user.sub]);
    if (res.rows.length === 0) {
      throw new NotFoundException('User not found');
    }
    return res.rows[0];
  }

  async updateOwnProfile(user: JwtPayload, dto: UpdateProfileDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (dto.fullName !== undefined) {
      fields.push(`full_name = $${idx++}`);
      values.push(dto.fullName);
    }
    if (dto.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(dto.email);
    }
    if (dto.phoneNumber !== undefined) {
      fields.push(`phone_number = $${idx++}`);
      values.push(dto.phoneNumber);
    }
    if (dto.password !== undefined) {
      const hash = await bcrypt.hash(dto.password, 10);
      fields.push(`password_hash = $${idx++}`);
      values.push(hash);
    }
    if (dto.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${idx++}`);
      values.push(dto.avatarUrl);
    }
    if (fields.length === 0) {
      throw new BadRequestException('No fields to update');
    }
    values.push(user.sub);
    const table = user.role === 'SYSTEM_ADMIN' ? 'public.admins' : 'public.pharmacy_users';
    const idColumn = user.role === 'SYSTEM_ADMIN' ? 'admin_id' : 'pharmacy_user_id';
    const query = `UPDATE ${table} SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE ${idColumn} = $${idx} RETURNING *`;
    const result = await this.db.query(query, values);
    if (result.rows.length === 0) {
      throw new NotFoundException('Profile not found after update');
    }
    return result.rows[0];
  }
}
