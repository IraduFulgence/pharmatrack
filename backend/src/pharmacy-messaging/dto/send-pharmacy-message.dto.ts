import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendPharmacyMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;
}