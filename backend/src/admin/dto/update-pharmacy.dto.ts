import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class UpdatePharmacyDto {
  @ApiPropertyOptional({
    example: 'Kigali Central Pharmacy',
    description: 'Registered business name of the pharmacy',
  })
  @IsOptional()
  @IsString({ message: 'Pharmacy name must be a string.' })
  pharmacyName?: string;

  @ApiPropertyOptional({
    example: '+250788123456',
    description: 'International E.164 phone number with country code',
  })
  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must follow international format (e.g., +250788123456).',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: 'kigalipharmacy@example.com',
    description: 'Valid pharmacy business email address',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  email?: string;

  @ApiPropertyOptional({
    example: '123456789',
    description: 'Tax Identification Number (TIN) — exactly 9 digits',
  })
  @IsOptional()
  @Matches(/^\d{9}$/, {
    message: 'TIN must contain exactly 9 digits.',
  })
  tin?: string;

  @ApiPropertyOptional({
    example: 'KN 4 Ave, Kigali, Rwanda',
    description: 'Physical location address of the pharmacy',
  })
  @IsOptional()
  @IsString({ message: 'Location address must be a string.' })
  locationAddress?: string;

  @ApiPropertyOptional({
    example: -1.9441,
    description: 'Latitude coordinates',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Latitude must be a number.' })
  latitude?: number;

  @ApiPropertyOptional({
    example: 30.0619,
    description: 'Longitude coordinates',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Longitude must be a number.' })
  longitude?: number;

  @ApiPropertyOptional({
    example: 'APPROVED',
    enum: ['APPROVED', 'PENDING', 'REJECTED'],
    description: 'Verification status',
  })
  @IsOptional()
  @IsIn(['APPROVED', 'PENDING', 'REJECTED'], {
    message: 'Verification status must be APPROVED, PENDING, or REJECTED.',
  })
  verificationStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';

  @ApiPropertyOptional({
    example: true,
    description: 'Activation status of the pharmacy',
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean.' })
  isActive?: boolean;
}
