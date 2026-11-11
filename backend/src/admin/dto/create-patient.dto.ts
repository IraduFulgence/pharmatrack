import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreatePatientDto {
  @ApiPropertyOptional({
    example: '1199880012345678',
    description: 'National ID consisting of exactly 16 numerical digits (optional)',
  })
  @IsOptional()
  @Matches(/^\d{16}$/, {
    message: 'National ID must contain exactly 16 digits.',
  })
  nationalId?: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the patient',
  })
  @IsNotEmpty({ message: 'Full name is required.' })
  @IsString({ message: 'Full name must be a string.' })
  fullName: string;

  @ApiProperty({
    example: '1998-05-15',
    description: 'Date of birth in YYYY-MM-DD format',
  })
  @IsNotEmpty({ message: 'Date of birth is required.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date of birth must be in YYYY-MM-DD format.',
  })
  @IsDateString(
    { strict: true },
    { message: 'Date of birth must be a valid calendar date in YYYY-MM-DD format.' },
  )
  dateOfBirth: string;

  @ApiProperty({
    example: '+250788123456',
    description: 'International E.164 phone number with country code',
  })
  @IsNotEmpty({ message: 'Phone number is required.' })
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must follow international format (e.g., +250788123456).',
  })
  phoneNumber: string;

  @ApiPropertyOptional({
    example: 'john@example.com',
    description: 'Valid email address (optional)',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  email?: string;

  @ApiProperty({
    example: 'Male',
    enum: ['Male', 'Female', 'Other'],
    description: 'Patient gender',
  })
  @IsNotEmpty({ message: 'Gender is required.' })
  @IsIn(['Male', 'Female', 'Other'], {
    message: 'Gender must be Male, Female, or Other.',
  })
  gender: 'Male' | 'Female' | 'Other';

  @ApiProperty({
    example: 'Patient@123',
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

