import { IsOptional, IsString, IsEmail, Matches, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  // Simple phone regex: + followed by digits, length 7-15
  @IsOptional()
  @Matches(/^\+\d{7,15}$/)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  // Avatar will be handled via multipart upload; we accept a URL string for simplicity
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
