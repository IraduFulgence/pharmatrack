
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SearchMedicineDto {
  @ApiProperty({
    example: 'Paracetamol',
    description: 'Name of the medicine to search for',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;
}
