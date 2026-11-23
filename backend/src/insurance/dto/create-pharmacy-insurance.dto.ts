import { IsNumber, IsInt, IsOptional, Min, Max } from 'class-validator';

export class CreatePharmacyInsuranceDto {
  @IsOptional()
  @IsNumber()
  @IsInt()
  pharmacyId?: number;

  @IsNumber()
  @IsInt()
  insuranceId: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  coveragePercentage: number;
}

