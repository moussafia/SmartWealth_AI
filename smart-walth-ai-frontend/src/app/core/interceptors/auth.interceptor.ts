import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Endpoints that must NOT carry a token and must NOT trigger a refresh-retry. */
const AUTH_FREE = ['/auth/login', '/auth/refresh', '/users/register',  '/auth/logout'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const isApiCall = req.url.includes('/api/');
  const isAuthFree = AUTH_FREE.some((path) => req.url.includes(path));
  const shouldAttach = isApiCall && !isAuthFree;

  const token = auth.accessToken;
  const authReq =
    token && shouldAttach
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      const is401 = error instanceof HttpErrorResponse && error.status === 401;

      if (is401 && shouldAttach) {
        // Access token expired → refresh once, then retry the original request.
        return auth.refresh().pipe(
          switchMap((res) =>
            next(req.clone({ setHeaders: { Authorization: `Bearer ${res.access_token}` } })),
          ),
          catchError((refreshError) => {
            auth.logout();
            return throwError(() => refreshError);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
