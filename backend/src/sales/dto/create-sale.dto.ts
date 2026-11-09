import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const PAYMENT_CATEGORIES = ['PRIVATE', 'INSURANCE'] as const;
export type PaymentCategory = typeof PAYMENT_CATEGORIES[number];

export const PAYMENT_METHODS = [
  'CASH',
  'MOBILE_MONEY',
  'CARD',
  'BANK_TRANSFER',
] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export class SaleItemDto {
  @ApiProperty({ example: 1, description: 'Inventory batch ID (inventory_id)' })
  @Type(() => Number)
  @IsInt({ message: 'inventoryId must be an integer.' })
  @Min(1, { message: 'inventoryId must be a positive integer.' })
  inventoryId: number;

  @ApiProperty({ example: 2, description: 'Quantity to dispense' })
  @Type(() => Number)
  @IsInt({ message: 'quantity must be an integer.' })
  @Min(1, { message: 'quantity must be at least 1.' })
  quantity: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this medicine is covered under patient insurance policy',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isInsuranceCovered?: boolean = true;

  @ApiPropertyOptional({
    example: 75.0,
    description: 'Optional custom coverage percentage for this specific medicine',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'customCoveragePercentage must be a number.' })
  @Min(0, { message: 'customCoveragePercentage cannot be negative.' })
  customCoveragePercentage?: number;
}

export class CreateSaleDto {
  @ApiProperty({
    example: 'PRIVATE',
    enum: PAYMENT_CATEGORIES,
    description: 'Payment category: PRIVATE or INSURANCE',
  })
  @IsNotEmpty({ message: 'paymentCategory is required.' })
  @IsIn(PAYMENT_CATEGORIES, {
    message: `paymentCategory must be one of: ${PAYMENT_CATEGORIES.join(', ')}.`,
  })
  paymentCategory: PaymentCategory;

  @ApiProperty({
    example: 'CASH',
    enum: PAYMENT_METHODS,
    description: 'Payment method used for the patient contribution',
  })
  @IsNotEmpty({ message: 'paymentMethod is required.' })
  @IsIn(PAYMENT_METHODS, {
    message: `paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}.`,
  })
  paymentMethod: PaymentMethod;

  @ApiProperty({
    type: [SaleItemDto],
    description: 'List of medicines and quantities to sell',
  })
  @IsArray({ message: 'items must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @ApiPropertyOptional({
    example: 5000,
    description: 'Amount paid by patient at point of sale (RWF)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'amountPaid must be a number.' })
  @Min(0, { message: 'amountPaid cannot be negative.' })
  amountPaid?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Registered patient ID (optional for walk-in)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'patientId must be an integer.' })
  patientId?: number;

  @ApiPropertyOptional({
    example: 'Jean Paul Habimana',
    description: 'Customer or patient name (used for walk-ins or receipt)',
  })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({
    example: '+250788123456',
    description: 'Customer phone number',
  })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Associated prescription ID if sale is fulfilling a prescription',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  prescriptionId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Insurance provider ID (required if paymentCategory is INSURANCE)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  providerId?: number;

  @ApiPropertyOptional({
    example: 'RAMA-987654321',
    description: 'Patient insurance membership card number (required if paymentCategory is INSURANCE)',
  })
  @IsOptional()
  @IsString()
  insuranceCardNumber?: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Authorized discount amount in RWF',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountAmount?: number = 0;

  @ApiPropertyOptional({
    example: 'MOMO-REF-123456',
    description: 'Transaction reference code for mobile money or card payments',
  })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiPropertyOptional({
    example: 'Patient requested generic substitution.',
    description: 'Pharmacist dispensing notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

