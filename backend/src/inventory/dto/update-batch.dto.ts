import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const BATCH_STATUSES = ['ACTIVE', 'EXPIRED', 'DEPLETED', 'DISCARDED'] as const;
export type BatchStatus = typeof BATCH_STATUSES[number];

export class UpdateBatchDto {
  @ApiPropertyOptional({ example: 18.0, description: 'Updated unit price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'unitPrice must be a valid number.' })
  @Min(0, { message: 'unitPrice cannot be negative.' })
  unitPrice?: number;

  @ApiPropertyOptional({ example: 15, description: 'Updated reorder level threshold' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'reorderLevel must be an integer.' })
  @Min(0, { message: 'reorderLevel cannot be negative.' })
  reorderLevel?: number;

  @ApiPropertyOptional({ example: 'ACTIVE', enum: BATCH_STATUSES })
  @IsOptional()
  @IsIn(BATCH_STATUSES, {
    message: `status must be one of: ${BATCH_STATUSES.join(', ')}.`,
  })
  status?: BatchStatus;
}

