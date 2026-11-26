import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Relationship of a member to the family (HEAD is set automatically for whoever creates it). */
export const MEMBER_RELATIONSHIPS = ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'] as const;
export type MemberRelationship = (typeof MEMBER_RELATIONSHIPS)[number];

export class CreateFamilyDto {
  @ApiPropertyOptional({ example: 'Mugisha family' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Family name cannot exceed 100 characters.' })
  familyName?: string;
}

/** A dependent with no account of their own (a child, an elderly parent...). */
export class AddDependentDto {
  @ApiProperty({ example: 'Keza Mugisha' })
  @IsNotEmpty({ message: 'Full name is required.' })
  @IsString()
  @MinLength(3, { message: 'Full name must be at least 3 characters.' })
  @MaxLength(150)
  fullName: string;

  @ApiProperty({ example: '2016-04-12' })
  @IsNotEmpty({ message: 'Date of birth is required.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date of birth must be in YYYY-MM-DD format.' })
  @IsDateString({ strict: true }, { message: 'Date of birth must be a valid date.' })
  dateOfBirth: string;

  @ApiProperty({ enum: ['Male', 'Female', 'Other'] })
  @IsIn(['Male', 'Female', 'Other'], { message: 'Gender must be Male, Female, or Other.' })
  gender: 'Male' | 'Female' | 'Other';

  @ApiProperty({ enum: MEMBER_RELATIONSHIPS, example: 'CHILD' })
  @IsIn(MEMBER_RELATIONSHIPS as unknown as string[], {
    message: 'Relationship must be SPOUSE, CHILD, PARENT, SIBLING or OTHER.',
  })
  relationship: MemberRelationship;

  @ApiPropertyOptional({ example: '+250788123456', description: 'Only if the member has a phone of their own (numbers are unique).' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone number must follow international format (e.g., +250788123456).' })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '1201680012345012' })
  @IsOptional()
  @Matches(/^\d{16}$/, { message: 'National ID must contain exactly 16 digits.' })
  nationalId?: string;
}

/** Changes to a dependent's details. Only managed profiles can be edited this way. */
export class UpdateDependentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Full name must be at least 3 characters.' })
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date of birth must be in YYYY-MM-DD format.' })
  @IsDateString({ strict: true }, { message: 'Date of birth must be a valid date.' })
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: ['Male', 'Female', 'Other'] })
  @IsOptional()
  @IsIn(['Male', 'Female', 'Other'], { message: 'Gender must be Male, Female, or Other.' })
  gender?: 'Male' | 'Female' | 'Other';

  @ApiPropertyOptional({ enum: MEMBER_RELATIONSHIPS })
  @IsOptional()
  @IsIn(MEMBER_RELATIONSHIPS as unknown as string[], {
    message: 'Relationship must be SPOUSE, CHILD, PARENT, SIBLING or OTHER.',
  })
  relationship?: MemberRelationship;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone number must follow international format (e.g., +250788123456).' })
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d{16}$/, { message: 'National ID must contain exactly 16 digits.' })
  nationalId?: string;
}

/** Invite an adult who already has a PharmaTrack account. */
export class InviteMemberDto {
  @ApiProperty({ example: '+250788123456', description: 'Their phone number or email' })
  @IsNotEmpty({ message: 'Enter their phone number or email.' })
  @IsString()
  @MaxLength(255)
  identifier: string;

  @ApiProperty({ enum: MEMBER_RELATIONSHIPS, example: 'SPOUSE' })
  @IsIn(MEMBER_RELATIONSHIPS as unknown as string[], {
    message: 'Relationship must be SPOUSE, CHILD, PARENT, SIBLING or OTHER.',
  })
  relationship: MemberRelationship;
}
