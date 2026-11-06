import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RejectPharmacyDto {
  @ApiProperty({ example: 'Documents are incomplete or unreadable. Please re-upload valid certificates.' })
  @IsNotEmpty({ message: 'Rejection reason is required.' })
  @IsString()
  @MinLength(10, { message: 'Rejection reason must be at least 10 characters long.' })
  rejectionReason: string;
}

