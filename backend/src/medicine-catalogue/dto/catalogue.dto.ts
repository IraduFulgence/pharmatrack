import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

// Trim strings; turn "" into undefined so optional fields can be cleared with null only.
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
// Accept ["Fever", "Headache"] or "Fever; Headache".
export const toList = ({ value }: { value: unknown }) => {
  const parts = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[;,\n]/) : value;
  if (!Array.isArray(parts)) return parts;
  const seen = new Set<string>();
  return parts
    .map((p) => String(p).trim().replace(/\s+/g, ' '))
    .filter((p) => p && !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()));
};

export class CatalogueMedicineDto {
  @ApiProperty({ example: 'Paracetamol 500mg Tablets' })
  @Transform(trim)
  @IsNotEmpty({ message: 'Medicine name is required.' })
  @IsString()
  @MaxLength(200)
  medicineName: string;

  @ApiPropertyOptional({ example: 'Paracetamol' })
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200)
  genericName?: string | null;

  @ApiPropertyOptional({ example: 'Panadol' })
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200)
  brandName?: string | null;

  @ApiPropertyOptional({ example: '500mg' })
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100)
  strength?: string | null;

  @ApiPropertyOptional({ example: 'Tablet' })
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100)
  dosageForm?: string | null;

  @ApiPropertyOptional({ example: 'Relieves mild to moderate pain and reduces fever.' })
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ example: 1, description: 'medicine_categories.category_id (e.g. Painkillers)' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt({ message: 'Category must be chosen from the list.' })
  @Min(1)
  categoryId?: number | null;

  @ApiPropertyOptional({ example: ['Fever', 'Headache'], description: 'What the medicine treats' })
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @ArrayMaxSize(20, { message: 'Add at most 20 conditions it treats.' })
  @IsString({ each: true })
  @MaxLength(100, { each: true, message: 'Each condition can be at most 100 characters.' })
  indications?: string[];

  @ApiPropertyOptional({ example: 12, description: 'Youngest age (years) it may be given to; null = no limit' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt({ message: 'Minimum age must be a whole number of years.' })
  @Min(0) @Max(130)
  minAgeYears?: number | null;

  @ApiPropertyOptional({ example: null, description: 'Oldest age (years) it may be given to; null = no limit' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt({ message: 'Maximum age must be a whole number of years.' })
  @Min(0) @Max(130)
  maxAgeYears?: number | null;

  @ApiPropertyOptional({ example: 'Adults and children over 12: 1-2 tablets every 4-6 hours, max 8 a day.' })
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000)
  dosageNotes?: string | null;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  requiresPrescription?: boolean;
}

/** Same fields, all optional (PATCH). */
export class UpdateCatalogueMedicineDto extends PartialType(CatalogueMedicineDto) {}

export class CreateCategoryDto {
  @ApiProperty({ example: 'Painkillers' })
  @Transform(trim)
  @IsNotEmpty({ message: 'Category name is required.' })
  @IsString()
  @MaxLength(100)
  categoryName: string;

  @ApiPropertyOptional({ example: 'Pain and fever relief' })
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500)
  description?: string;
}
