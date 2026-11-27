import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdatePharmacyInsuranceDto {
  @ApiPropertyOptional({ example: 80, description: 'New coverage percentage (0-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'coveragePercentage must be a number.' })
  @Min(0, { message: 'coveragePercentage cannot be below 0.' })
  @Max(100, { message: 'coveragePercentage cannot be above 100.' })
  coveragePercentage?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether the pharmacy currently accepts this insurer' })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be true or false.' })
  isActive?: boolean;
}
