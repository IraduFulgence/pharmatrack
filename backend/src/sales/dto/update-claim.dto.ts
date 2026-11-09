import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const CLAIM_STATUSES = [
  'PENDING',
  'SUBMITTED',
  'APPROVED',
  'PARTIALLY_PAID',
  'PAID',
  'REJECTED',
] as const;

export type ClaimStatus = typeof CLAIM_STATUSES[number];

export class UpdateClaimDto {
  @ApiProperty({
    example: 'APPROVED',
    enum: CLAIM_STATUSES,
    description: 'Updated claim status',
  })
  @IsNotEmpty({ message: 'claimStatus is required.' })
  @IsIn(CLAIM_STATUSES, {
    message: `claimStatus must be one of: ${CLAIM_STATUSES.join(', ')}.`,
  })
  claimStatus: ClaimStatus;

  @ApiPropertyOptional({
    example: 3750,
    description: 'Approved amount confirmed by the insurance company in RWF',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  approvedAmount?: number;

  @ApiPropertyOptional({
    example: 3750,
    description: 'Actual payment amount received from the insurance company in RWF',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @ApiPropertyOptional({
    example: 'MMI-SETTLE-7890',
    description: 'Payment reference or bank transfer reference for insurance disbursement',
  })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiPropertyOptional({
    example: 'Non-formulary medicine not covered under scheme',
    description: 'Reason for rejection if claim was rejected by insurer',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({ example: 'Settlement confirmed via Bank of Kigali transfer.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

