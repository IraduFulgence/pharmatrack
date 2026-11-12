import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterPharmacyDto {
  @ApiProperty({
    example: 'Kigali Central Pharmacy',
    description: 'Registered business name of the pharmacy',
  })
  @IsNotEmpty({ message: 'Pharmacy name is required.' })
  @IsString({ message: 'Pharmacy name must be a string.' })
  pharmacyName: string;

  @ApiProperty({
    example: 'KN 4 Ave, Kigali, Rwanda',
    description: 'Physical location address of the pharmacy (mandatory)',
  })
  @IsNotEmpty({ message: 'Location address is required.' })
  @IsString({ message: 'Location address must be a string.' })
  locationAddress: string;

  @ApiPropertyOptional({
    example: -1.9441,
    description: 'Detected or manual GPS latitude',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Latitude must be a valid number.' })
  latitude?: number;

  @ApiPropertyOptional({
    example: 30.0619,
    description: 'Detected or manual GPS longitude',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Longitude must be a valid number.' })
  longitude?: number;

  @ApiProperty({
    example: '+250788123456',
    description: 'International E.164 phone number with country code',
  })
  @IsNotEmpty({ message: 'Phone number is required.' })
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must follow international format (e.g., +250788123456).',
  })
  phoneNumber: string;

  @ApiProperty({
    example: 'kigalipharmacy@example.com',
    description: 'Valid pharmacy business email address',
  })
  @IsNotEmpty({ message: 'Email is required.' })
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  email: string;

  @ApiProperty({
    example: '123456789',
    description: 'Tax Identification Number (TIN) — exactly 9 digits',
  })
  @IsNotEmpty({ message: 'TIN is required.' })
  @Matches(/^\d{9}$/, {
    message: 'TIN must contain exactly 9 digits.',
  })
  tin: string;

  @ApiProperty({
    example: 'Pharmacy@123',
    description:
      'Password (min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character)',
  })
  @IsNotEmpty({ message: 'Password is required.' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-\[\]{}|;:'",.<>\/`~])[A-Za-z\d@$!%*?&#^()_+=\-\[\]{}|;:'",.<>\/`~]{8,}$/,
    {
      message:
        'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character.',
    },
  )
  password: string;
}
