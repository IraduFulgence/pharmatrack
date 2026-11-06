import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateMedicineDto {
  @ApiProperty({ example: 'Amoxicillin 500mg Capsules', description: 'Complete name of medicine' })
  @IsNotEmpty({ message: 'Medicine name is required.' })
  @IsString({ message: 'Medicine name must be a string.' })
  medicineName: string;

  @ApiPropertyOptional({ example: 'Amoxicillin', description: 'Generic / INN name' })
  @IsOptional()
  @IsString({ message: 'Generic name must be a string.' })
  genericName?: string;

  @ApiPropertyOptional({ example: 'Amoxil', description: 'Brand or trade name' })
  @IsOptional()
  @IsString({ message: 'Brand name must be a string.' })
  brandName?: string;

  @ApiPropertyOptional({ example: '500mg', description: 'Strength of formulation' })
  @IsOptional()
  @IsString({ message: 'Strength must be a string.' })
  strength?: string;

  @ApiPropertyOptional({ example: 'Capsule', description: 'Dosage form (e.g. Tablet, Syrup, Injection)' })
  @IsOptional()
  @IsString({ message: 'Dosage form must be a string.' })
  dosageForm?: string;

  @ApiPropertyOptional({ example: 'Broad-spectrum antibiotic for bacterial infections.' })
  @IsOptional()
  @IsString({ message: 'Description must be a string.' })
  description?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether this medicine requires a prescription' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean({ message: 'requiresPrescription must be a boolean.' })
  requiresPrescription?: boolean;
}

