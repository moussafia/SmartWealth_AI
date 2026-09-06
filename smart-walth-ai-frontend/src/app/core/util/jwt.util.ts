import {JwtPayload} from '../models/auth.model';

export function decodeJwt(token: string): JwtPayload {
  const payload = token.split('.')[1];
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}
