export type UserRole =
  | 'PATIENT'
  | 'PHARMACY'
  | 'ADMIN'
  | 'SYSTEM_ADMIN'
  | 'PHARMACY_ADMIN'
  | 'PHARMACIST'
  | 'SALES_OFFICER';

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  phoneNumber?: string;
  mustChangePassword?: boolean;
  pharmacyId?: number;
  pharmacyUserId?: number;
  /** Set when a family manager is acting for this patient: the manager's patient ID. */
  actedBy?: number;
}
