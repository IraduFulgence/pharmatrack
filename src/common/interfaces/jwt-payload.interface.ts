export type UserRole = 'PATIENT' | 'PHARMACY' | 'ADMIN';

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  phoneNumber?: string;
  mustChangePassword?: boolean;
}
