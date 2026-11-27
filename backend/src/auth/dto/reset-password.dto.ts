import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f60718293a4b5c6d7e8f90...',
    description: 'The secret reset token received in the email',
  })
  @IsNotEmpty({ message: 'Reset token is required.' })
  @IsString({ message: 'Reset token must be a string.' })
  token: string;

  @ApiProperty({
    example: 'NewSecurePassword@2026',
    description:
      'New password (minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character)',
  })
  @IsNotEmpty({ message: 'New password is required.' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-\[\]{}|;:'",.<>\/`~])[A-Za-z\d@$!%*?&#^()_+=\-\[\]{}|;:'",.<>\/`~]{8,}$/,
    {
      message:
        'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character.',
    },
  )
  newPassword: string;
}

