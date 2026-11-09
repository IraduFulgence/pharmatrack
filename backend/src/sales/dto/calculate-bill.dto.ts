import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PAYMENT_CATEGORIES, SaleItemDto } from './create-sale.dto.js';
import type { PaymentCategory } from './create-sale.dto.js';

export class CalculateBillDto {
  @ApiProperty({
    example: 'INSURANCE',
    enum: PAYMENT_CATEGORIES,
    description: 'Payment category: PRIVATE or INSURANCE',
  })
  @IsNotEmpty({ message: 'paymentCategory is required.' })
  @IsIn(PAYMENT_CATEGORIES, {
    message: `paymentCategory must be one of: ${PAYMENT_CATEGORIES.join(', ')}.`,
  })
  paymentCategory: PaymentCategory;

  @ApiProperty({
    type: [SaleItemDto],
    description: 'Items to calculate the bill for',
  })
  @IsArray({ message: 'items must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @ApiPropertyOptional({
    example: 1,
    description: 'Insurance provider ID (used to fetch default coverage rate)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  providerId?: number;

  @ApiPropertyOptional({
    example: 75.0,
    description: 'Explicit global insurance coverage percentage override (e.g. 75.00)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  globalCoveragePercentage?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Optional discount in RWF',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountAmount?: number = 0;
}
