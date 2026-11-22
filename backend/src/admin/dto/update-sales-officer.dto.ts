import { IsEmail, IsOptional, IsPhoneNumber, IsString, Length } from 'class-validator';

export class UpdateSalesOfficerDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;
}
