import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { STAFF_ROLES, type StaffRole } from './create-staff.dto.js';

export class UpdateStaffDto {
  @ApiPropertyOptional({ example: 'Jean Damascene Updated', description: 'Updated full name' })
  @IsOptional()
  @IsString({ message: 'Full name must be a string.' })
  fullName?: string;

  @ApiPropertyOptional({ example: '+250788654321', description: 'Updated telephone number' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Telephone number must be in international format (e.g. +250788123456).',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'newemail@pharmacy.rw', description: 'Updated email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format.' })
  email?: string;

  @ApiPropertyOptional({
    example: 'PHARMACIST',
    enum: STAFF_ROLES,
    description: 'Updated role: PHARMACIST or SALES_OFFICER',
  })
  @IsOptional()
  @IsIn(STAFF_ROLES, {
    message: `Role must be one of: ${STAFF_ROLES.join(', ')}.`,
  })
  role?: StaffRole;
}
