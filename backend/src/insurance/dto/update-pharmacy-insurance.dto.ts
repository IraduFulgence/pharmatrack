import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdatePharmacyInsuranceDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  coveragePercentage?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
