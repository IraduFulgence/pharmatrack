import { IsNumber, IsInt, IsPositive, Min, Max } from 'class-validator';

export class CreatePharmacyInsuranceDto {
  @IsNumber()
  @IsInt()
  pharmacyId: number;

  @IsNumber()
  @IsInt()
  insuranceId: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  coveragePercentage: number;
}

