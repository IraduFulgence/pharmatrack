import { IsInt, Min } from 'class-validator';

export class TransferSalesOfficerDto {
  @IsInt()
  @Min(1)
  targetPharmacyId!: number;
}
