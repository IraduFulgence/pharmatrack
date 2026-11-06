import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'Registered email address of the patient or pharmacy',
  })
  @IsNotEmpty({ message: 'Email address is required.' })
  @IsEmail({}, { message: 'Must be a valid email address.' })
  email: string;
}

