import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class RegisterPharmacyDto {
  @ApiProperty({
    example: 'Kigali Central Pharmacy',
    description: 'Registered business name of the pharmacy',
  })
  @IsNotEmpty({ message: 'Pharmacy name is required.' })
  @IsString({ message: 'Pharmacy name must be a string.' })
  pharmacyName: string;

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
