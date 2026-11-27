import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export const PACKAGING_UNITS = [
  'Unit',
  'Tablet',
  'Capsule',
  'Carton',
  'Box',
  'Bottle',
  'Packet',
  'Sachet',
  'Gallon',
  'Litre',
  'Millilitre',
  'Kilogram',
  'Gram',
] as const;

export type PackagingUnit = typeof PACKAGING_UNITS[number];

export class CreatePackagingDto {
  @ApiProperty({ example: 1, description: 'Medicine ID' })
  @Type(() => Number)
  @IsInt({ message: 'medicineId must be an integer.' })
  @Min(1, { message: 'medicineId must be positive.' })
  medicineId: number;

  @ApiProperty({ example: 'Box of 20 Tablets', description: 'Package label/name' })
  @IsNotEmpty({ message: 'Package name is required.' })
  @IsString({ message: 'Package name must be a string.' })
  packageName: string;

  @ApiProperty({ example: 'Box', enum: PACKAGING_UNITS, description: 'Package unit type' })
  @IsNotEmpty({ message: 'Package unit is required.' })
  @IsIn(PACKAGING_UNITS, {
    message: `Package unit must be one of: ${PACKAGING_UNITS.join(', ')}.`,
  })
  packageUnit: PackagingUnit;

  @ApiProperty({ example: 20, description: 'Conversion factor: number of base units per package' })
  @Type(() => Number)
  @IsInt({ message: 'unitsPerPackage must be an integer.' })
  @Min(1, { message: 'unitsPerPackage must be at least 1.' })
  unitsPerPackage: number;

  @ApiPropertyOptional({ example: 350.0, description: 'Custom package selling price (optional)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'pricePerPackage must be a valid number.' })
  @Min(0, { message: 'pricePerPackage cannot be negative.' })
  pricePerPackage?: number;

  @ApiPropertyOptional({ example: false, description: 'Whether this is the default packaging' })
  @IsOptional()
  @IsBoolean({ message: 'isDefault must be a boolean.' })
  isDefault?: boolean;
}

