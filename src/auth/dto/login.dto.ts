import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'Email address or international phone number (e.g. +250788123456)',
  })
  @IsNotEmpty({ message: 'Identifier (email or phone number) is required.' })
  @IsString({ message: 'Identifier must be a string.' })
  identifier: string;

  @ApiProperty({
    example: 'John@12345',
    description: 'User account password',
  })
  @IsNotEmpty({ message: 'Password is required.' })
  @IsString({ message: 'Password must be a string.' })
  password: string;
}

