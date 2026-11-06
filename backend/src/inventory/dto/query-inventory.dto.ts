import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QueryInventoryDto {
  @ApiPropertyOptional({ example: 'Paracetamol', description: 'Search across medicine name, generic name, brand name, strength, batch number' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'Tablet', description: 'Filter by dosage form' })
  @IsOptional()
  @IsString()
  dosageForm?: string;

  @ApiPropertyOptional({ example: 'true', description: 'Filter by prescription requirement' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  requiresPrescription?: boolean;

  @ApiPropertyOptional({
    example: 'ALL',
    enum: ['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRED'],
    description: 'Filter by stock status',
  })
  @IsOptional()
  @IsIn(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRED'])
  stockStatus?: 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRED' = 'ALL';

  @ApiPropertyOptional({
    example: 'ALL',
    enum: ['ALL', 'VALID', 'EXPIRING_30', 'EXPIRING_60', 'EXPIRING_90', 'EXPIRED'],
    description: 'Filter by expiry timeframe',
  })
  @IsOptional()
  @IsIn(['ALL', 'VALID', 'EXPIRING_30', 'EXPIRING_60', 'EXPIRING_90', 'EXPIRED'])
  expiryStatus?: 'ALL' | 'VALID' | 'EXPIRING_30' | 'EXPIRING_60' | 'EXPIRING_90' | 'EXPIRED' = 'ALL';

  @ApiPropertyOptional({ example: 'name', enum: ['name', 'quantity', 'expiry', 'created_at', 'unit_price'] })
  @IsOptional()
  @IsIn(['name', 'quantity', 'expiry', 'created_at', 'unit_price'])
  sortBy?: 'name' | 'quantity' | 'expiry' | 'created_at' | 'unit_price' = 'name';

  @ApiPropertyOptional({ example: 'ASC', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}

