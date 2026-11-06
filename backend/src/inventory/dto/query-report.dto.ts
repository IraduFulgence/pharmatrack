import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const REPORT_TYPES = [
  'CURRENT_STOCK',
  'STOCK_IN',
  'STOCK_OUT',
  'LOW_STOCK',
  'EXPIRED',
  'NEAR_EXPIRY',
  'ADJUSTMENT',
  'VALUATION',
] as const;

export type ReportType = typeof REPORT_TYPES[number];

export class QueryReportDto {
  @ApiProperty({
    example: 'CURRENT_STOCK',
    enum: REPORT_TYPES,
    description: 'Type of inventory report to generate',
  })
  @IsIn(REPORT_TYPES, {
    message: `reportType must be one of: ${REPORT_TYPES.join(', ')}.`,
  })
  reportType: ReportType;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Start date filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid date string (YYYY-MM-DD).' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'End date filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid date string (YYYY-MM-DD).' })
  endDate?: string;

  @ApiPropertyOptional({ example: 1, description: 'Filter by specific medicine ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  medicineId?: number;

  @ApiPropertyOptional({ example: 'BATCH-2026-001', description: 'Filter by batch number' })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiPropertyOptional({ example: 'STOCK_IN', description: 'Filter by transaction type' })
  @IsOptional()
  @IsString()
  transactionType?: string;

  @ApiPropertyOptional({ example: 'json', enum: ['json', 'csv'], default: 'json' })
  @IsOptional()
  @IsIn(['json', 'csv'])
  exportFormat?: 'json' | 'csv' = 'json';
}

