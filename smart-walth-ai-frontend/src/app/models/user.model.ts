export type UserRole = 'USER' | 'ADMIN';

/** Shape of `assets/data/user.json` — mirrors the User Service `users` table. */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}
