import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class UpdatePatientDto {
  @ApiPropertyOptional({ example: 'John Updated' })
  @IsOptional()
  @IsString({ message: 'Full name must be a string.' })
  fullName?: string;

  @ApiPropertyOptional({ example: '+250788999999' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must follow international format (e.g., +250788999999).',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'newemail@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  email?: string;

  @ApiPropertyOptional({ example: 'Female', enum: ['Male', 'Female', 'Other'] })
  @IsOptional()
  @IsIn(['Male', 'Female', 'Other'], {
    message: 'Gender must be Male, Female, or Other.',
  })
  gender?: 'Male' | 'Female' | 'Other';
}

