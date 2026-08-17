export type UserRole = 'USER' | 'ADMIN';
export type KycStatus = 'PENDING' | 'VERIFIED';

/** Shape of `assets/data/user.json` — mirrors the User Service `users` table. */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  kycStatus: KycStatus;
  createdAt: string;
  updatedAt: string;
}
