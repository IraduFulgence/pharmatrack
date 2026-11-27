import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export const ADJUSTMENT_TYPES = [
  'INCREASE',
  'DECREASE',
  'DAMAGED',
  'EXPIRED',
  'LOST',
  'PHYSICAL_COUNT',
] as const;

export type AdjustmentType = typeof ADJUSTMENT_TYPES[number];

export class StockAdjustmentDto {
  @ApiProperty({ example: 1, description: 'Inventory batch ID (inventory_id)' })
  @Type(() => Number)
  @IsInt({ message: 'inventoryId must be an integer.' })
  @Min(1, { message: 'inventoryId must be a positive integer.' })
  inventoryId: number;

  @ApiProperty({
    example: 'DAMAGED',
    enum: ADJUSTMENT_TYPES,
    description: 'Type of adjustment to perform',
  })
  @IsNotEmpty({ message: 'Adjustment type is required.' })
  @IsIn(ADJUSTMENT_TYPES, {
    message: `Adjustment type must be one of: ${ADJUSTMENT_TYPES.join(', ')}.`,
  })
  adjustmentType: AdjustmentType;

  @ApiProperty({
    example: 5,
    description:
      'Quantity to adjust. For INCREASE, DECREASE, DAMAGED, EXPIRED, LOST, this is the delta (> 0). For PHYSICAL_COUNT, this is the counted total (>= 0).',
  })
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer.' })
  @Min(0, { message: 'Quantity cannot be negative.' })
  quantity: number;

  @ApiProperty({ example: 'Water damage during storage inspection.', description: 'Mandatory reason for audit trail' })
  @IsNotEmpty({ message: 'Reason is required for all stock adjustments.' })
  @IsString({ message: 'Reason must be a string.' })
  reason: string;

  @ApiPropertyOptional({ example: 'Inspected by Pharmacist on duty.' })
  @IsOptional()
  @IsString({ message: 'Notes must be a string.' })
  notes?: string;
}

