import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNumber, IsOptional, IsString, Matches } from 'class-validator';

export class UpdatePharmacyProfileDto {
  @ApiPropertyOptional({ example: 'Kigali City Central Pharmacy', description: 'Pharmacy commercial name' })
  @IsOptional()
  @IsString({ message: 'Pharmacy name must be a string.' })
  pharmacyName?: string;

  @ApiPropertyOptional({ example: 'KN 4 Ave, Kigali, Rwanda', description: 'Physical address' })
  @IsOptional()
  @IsString({ message: 'Location address must be a string.' })
  locationAddress?: string;

  @ApiPropertyOptional({ example: -1.9545, description: 'GPS Latitude' })
  @IsOptional()
  @IsNumber({}, { message: 'Latitude must be a valid number.' })
  latitude?: number;

  @ApiPropertyOptional({ example: 30.0612, description: 'GPS Longitude' })
  @IsOptional()
  @IsNumber({}, { message: 'Longitude must be a valid number.' })
  longitude?: number;

  @ApiPropertyOptional({ example: '+250788123456', description: 'Pharmacy contact telephone' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Telephone number must be in international format (e.g. +250788123456).',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'info@kigalipharmacy.rw', description: 'Pharmacy contact email' })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address.' })
  email?: string;
}
