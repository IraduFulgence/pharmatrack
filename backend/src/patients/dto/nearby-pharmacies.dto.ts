
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class NearbyPharmaciesDto {
  @ApiPropertyOptional({
    example: -1.9441,
    description: 'Patient latitude',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiPropertyOptional({
    example: 30.0619,
    description: 'Patient longitude',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({
    example: '1',
    description: 'Optional medicine ID to filter pharmacies by stock',
  })
  @IsOptional()
  @IsString()
  medicineId?: string;
}
