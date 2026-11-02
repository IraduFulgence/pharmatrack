export type UserRole = 'PATIENT' | 'PHARMACY';

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  phoneNumber?: string;
}

