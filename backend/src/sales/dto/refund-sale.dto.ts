import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RefundItemDto {
  @ApiProperty({ example: 1, description: 'sale_item_id from original sale' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  saleItemId: number;

  @ApiProperty({ example: 1, description: 'Quantity being returned / refunded' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    example: true,
    description: 'Whether the returned medicine is in good condition and accepted back into physical inventory',
    default: true,
  })
  @IsBoolean()
  restoreToInventory: boolean;
}

export class RefundSaleDto {
  @ApiProperty({
    example: 'Patient experienced adverse reaction and doctor changed prescription.',
    description: 'Mandatory reason for refund/cancellation',
  })
  @IsNotEmpty({ message: 'Reason is required for refund or cancellation.' })
  @IsString({ message: 'Reason must be a string.' })
  reason: string;

  @ApiPropertyOptional({
    type: [RefundItemDto],
    description: 'Specific items to return. If omitted, full sale is refunded.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundItemDto)
  items?: RefundItemDto[];

  @ApiPropertyOptional({
    example: 2500,
    description: 'Amount refunded to patient in RWF',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  refundAmount?: number;

  @ApiPropertyOptional({
    example: 'CASH',
    description: 'Method by which refund was disbursed to patient',
  })
  @IsOptional()
  @IsString()
  refundMethod?: string;

  @ApiPropertyOptional({ example: 'Authorized by Chief Pharmacist.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

