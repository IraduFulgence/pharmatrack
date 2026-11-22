import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ActivateStaffDto {
  @ApiProperty({ example: '+250788123456 or staff@pharmacy.rw', description: 'Staff email or phone number' })
  @IsNotEmpty({ message: 'Identifier (email or telephone number) is required.' })
  @IsString({ message: 'Identifier must be a string.' })
  identifier: string;

  @ApiProperty({ example: '123456', description: '6-digit activation code or secure token' })
  @IsNotEmpty({ message: 'Activation code is required.' })
  @IsString({ message: 'Activation code must be a string.' })
  activationCode: string;

  @ApiProperty({ example: 'Str0ngP@ssw0rd!', description: 'New permanent password' })
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-\[\]{}|;:'",.<>\/`~])[A-Za-z\d@$!%*?&#^()_+=\-\[\]{}|;:'",.<>\/`~]{8,}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
    },
  )
  password: string;

  @ApiProperty({ example: 'Str0ngP@ssw0rd!', description: 'Confirmation of new permanent password' })
  @IsNotEmpty({ message: 'Password confirmation is required.' })
  confirmPassword: string;
}
