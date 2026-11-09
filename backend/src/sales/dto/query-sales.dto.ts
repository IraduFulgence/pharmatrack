import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySalesDto {
  @ApiPropertyOptional({ example: 'REC-20261109-0001', description: 'Search by receipt number, customer name, phone, or medicine name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '2026-11-01', description: 'Start date filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid date string (YYYY-MM-DD).' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-11-30', description: 'End date filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid date string (YYYY-MM-DD).' })
  endDate?: string;

  @ApiPropertyOptional({ example: 'PRIVATE', enum: ['ALL', 'PRIVATE', 'INSURANCE'] })
  @IsOptional()
  @IsIn(['ALL', 'PRIVATE', 'INSURANCE'])
  paymentCategory?: 'ALL' | 'PRIVATE' | 'INSURANCE' = 'ALL';

  @ApiPropertyOptional({
    example: 'ALL',
    enum: ['ALL', 'PAID', 'PARTIAL', 'PENDING', 'REFUNDED', 'CANCELLED'],
  })
  @IsOptional()
  @IsIn(['ALL', 'PAID', 'PARTIAL', 'PENDING', 'REFUNDED', 'CANCELLED'])
  paymentStatus?: 'ALL' | 'PAID' | 'PARTIAL' | 'PENDING' | 'REFUNDED' | 'CANCELLED' = 'ALL';

  @ApiPropertyOptional({ example: 1, description: 'Filter by insurance provider ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  providerId?: number;

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

  @ApiPropertyOptional({ example: 'created_at', enum: ['created_at', 'total_amount', 'receipt_number'] })
  @IsOptional()
  @IsIn(['created_at', 'total_amount', 'receipt_number'])
  sortBy?: 'created_at' | 'total_amount' | 'receipt_number' = 'created_at';

  @ApiPropertyOptional({ example: 'DESC', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

