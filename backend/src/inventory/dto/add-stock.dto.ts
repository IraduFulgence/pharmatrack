import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddStockDto {
  @ApiProperty({ example: 1, description: 'ID of the medicine from central catalogue' })
  @Type(() => Number)
  @IsInt({ message: 'medicineId must be an integer.' })
  @Min(1, { message: 'medicineId must be a positive integer.' })
  medicineId: number;

  @ApiProperty({ example: 'BATCH-2026-001', description: 'Manufacturer batch number' })
  @IsNotEmpty({ message: 'Batch number is required.' })
  @IsString({ message: 'Batch number must be a string.' })
  batchNumber: string;

  @ApiProperty({ example: 100, description: 'Quantity received (must be greater than 0)' })
  @Type(() => Number)
  @IsInt({ message: 'Quantity received must be an integer.' })
  @Min(1, { message: 'Quantity received must be greater than zero.' })
  quantityReceived: number;

  @ApiProperty({ example: 15.5, description: 'Unit selling / inventory price per item' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Unit price must be a valid number.' })
  @Min(0, { message: 'Unit price cannot be negative.' })
  unitPrice: number;

  @ApiProperty({ example: '2027-12-31', description: 'Expiry date (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Expiry date is required.' })
  @IsDateString({}, { message: 'Expiry date must be a valid date (YYYY-MM-DD).' })
  expiryDate: string;

  @ApiPropertyOptional({ example: 10, description: 'Configurable low-stock reorder threshold' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Reorder level must be an integer.' })
  @Min(0, { message: 'Reorder level cannot be negative.' })
  reorderLevel?: number;

  @ApiPropertyOptional({ example: 'Initial stock from Central Medical Stores supplier' })
  @IsOptional()
  @IsString({ message: 'Notes must be a string.' })
  notes?: string;
}

