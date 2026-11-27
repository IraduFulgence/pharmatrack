import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class RegisterSalePatientDto {
  @ApiProperty({ example: 'Marie Claire Mukamana', description: 'Patient full name' })
  @IsNotEmpty({ message: 'Full name is required.' })
  @IsString({ message: 'Full name must be a string.' })
  fullName: string;

  @ApiPropertyOptional({ example: '+250788112233' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must follow international format (e.g., +250788112233).',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '1199080012345678' })
  @IsOptional()
  @Matches(/^\d{16}$/, { message: 'National ID must contain exactly 16 digits.' })
  nationalId?: string;

  @ApiPropertyOptional({ example: 'marie@example.rw' })
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  email?: string;

  @ApiPropertyOptional({ example: '1990-08-15', description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be a valid date string (YYYY-MM-DD).' })
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'Female', enum: ['Male', 'Female', 'Other'] })
  @IsOptional()
  @IsIn(['Male', 'Female', 'Other'])
  gender?: 'Male' | 'Female' | 'Other';

  @ApiPropertyOptional({ example: 'Kigali, Nyarugenge, KN 45 St' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 1, description: 'Insurance provider ID if adding insurance immediately' })
  @IsOptional()
  providerId?: number;

  @ApiPropertyOptional({ example: 'RAMA-00123456' })
  @IsOptional()
  @IsString()
  insuranceCardNumber?: string;
}

