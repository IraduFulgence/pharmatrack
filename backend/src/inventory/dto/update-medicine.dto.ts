import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateMedicineDto {
  @ApiPropertyOptional({ example: 'Amoxicillin 500mg Capsules' })
  @IsOptional()
  @IsString({ message: 'Medicine name must be a string.' })
  medicineName?: string;

  @ApiPropertyOptional({ example: 'Amoxicillin' })
  @IsOptional()
  @IsString({ message: 'Generic name must be a string.' })
  genericName?: string;

  @ApiPropertyOptional({ example: 'Amoxil' })
  @IsOptional()
  @IsString({ message: 'Brand name must be a string.' })
  brandName?: string;

  @ApiPropertyOptional({ example: '500mg' })
  @IsOptional()
  @IsString({ message: 'Strength must be a string.' })
  strength?: string;

  @ApiPropertyOptional({ example: 'Capsule' })
  @IsOptional()
  @IsString({ message: 'Dosage form must be a string.' })
  dosageForm?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString({ message: 'Description must be a string.' })
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean({ message: 'requiresPrescription must be a boolean.' })
  requiresPrescription?: boolean;
}

