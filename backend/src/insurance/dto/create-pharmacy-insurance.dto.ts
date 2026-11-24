import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
export class CreatePharmacyInsuranceDto {
  @IsOptional()
  @IsNumber()

  @ApiPropertyOptional({
    description: 'Ignored: the pharmacy comes from the URL and your login. Kept so older clients still validate.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pharmacyId?: number;

  @ApiProperty({ example: 1, description: 'insurance_providers.provider_id' })
  @Type(() => Number)
  @IsInt({ message: 'insuranceId must be an integer.' })
  @Min(1, { message: 'insuranceId must be a positive integer.' })
  insuranceId: number;

  @ApiProperty({ example: 85, description: 'Share of the bill the insurer pays at this pharmacy (0-100)' })
  @Type(() => Number)
  @IsNumber({}, { message: 'coveragePercentage must be a number.' })
  @Min(0, { message: 'coveragePercentage cannot be below 0.' })
  @Max(100, { message: 'coveragePercentage cannot be above 100.' })
  coveragePercentage: number;
}
