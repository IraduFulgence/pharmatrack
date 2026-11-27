import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { toList } from '../../medicine-catalogue/dto/catalogue.dto.js';

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

  @ApiPropertyOptional({ example: 1, description: 'Category (medicine_categories.category_id), e.g. Painkillers; null clears it' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @Type(() => Number)
  @IsInt({ message: 'Category must be chosen from the list.' })
  @Min(1)
  categoryId?: number | null;

  @ApiPropertyOptional({ example: ['Fever', 'Headache'], description: 'Tags: what the medicine treats. Patients search by these.' })
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @ArrayMaxSize(20, { message: 'Add at most 20 tags.' })
  @IsString({ each: true })
  @MaxLength(100, { each: true, message: 'Each tag can be at most 100 characters.' })
  indications?: string[];

  @ApiPropertyOptional({ example: 12, description: 'Youngest age (years) it may be given to; null = no limit' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @Type(() => Number)
  @IsInt({ message: 'Minimum age must be a whole number of years.' })
  @Min(0) @Max(130)
  minAgeYears?: number | null;

  @ApiPropertyOptional({ example: 65, description: 'Oldest age (years) it may be given to; null = no limit' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @Type(() => Number)
  @IsInt({ message: 'Maximum age must be a whole number of years.' })
  @Min(0) @Max(130)
  maxAgeYears?: number | null;

  @ApiPropertyOptional({ example: 'Adults: 1-2 tablets every 4-6 hours, at most 8 a day.' })
  @IsOptional()
  @IsString({ message: 'Dosage notes must be text.' })
  @MaxLength(2000)
  dosageNotes?: string | null;
}
