import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class QueryActivityDto {
  @ApiPropertyOptional({ description: 'Filter by staff user ID' })
  @IsOptional()
  staffId?: number;

  @ApiPropertyOptional({ description: 'Filter by activity action (e.g. SALE_COMPLETED, STOCK_IN, STAFF_REGISTERED)' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Start date in YYYY-MM-DD format' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date in YYYY-MM-DD format' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;
}
