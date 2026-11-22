import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export const STAFF_ROLES = ['PHARMACIST', 'SALES_OFFICER'] as const;
export type StaffRole = typeof STAFF_ROLES[number];

export class CreateStaffDto {
  @ApiProperty({ example: 'Jean Damascene', description: 'Full name of the staff member' })
  @IsNotEmpty({ message: 'Full name is required.' })
  @IsString({ message: 'Full name must be a string.' })
  fullName: string;

  @ApiProperty({ example: '+250788123456', description: 'Telephone number in international format' })
  @IsNotEmpty({ message: 'Telephone number is required.' })
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Telephone number must be in international format (e.g. +250788123456).',
  })
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'staff@pharmacy.rw', description: 'Email address (optional)' })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format.' })
  email?: string;

  @ApiProperty({
    example: 'PHARMACIST',
    enum: STAFF_ROLES,
    description: 'Assigned staff role: PHARMACIST or SALES_OFFICER',
  })
  @IsNotEmpty({ message: 'Role is required.' })
  @IsIn(STAFF_ROLES, {
    message: `Role must be one of: ${STAFF_ROLES.join(', ')}.`,
  })
  role: StaffRole;
}
