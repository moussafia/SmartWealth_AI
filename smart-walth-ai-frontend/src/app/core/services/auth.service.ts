import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, finalize, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, RegisterRequest, TokenResponse, UserProfile } from '../models/auth.model';
import {AppStateService} from '../state/app-state.service';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = environment.apiUrl;
  private readonly state = inject(AppStateService);

  /** Shared in-flight refresh so concurrent 401s trigger only one refresh call. */
  private refreshInFlight$: Observable<TokenResponse> | null = null;

  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  get isAuthenticated(): boolean {
    return !!this.accessToken || !!this.refreshToken;
  }

  login(body: LoginRequest): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${this.baseUrl}/auth/login`, body)
      .pipe(tap((res) => this.storeSession(res)));
  }

  register(body: RegisterRequest): Observable<UserProfile> {
    return this.http.post<UserProfile>(`${this.baseUrl}/users/register`, body);
  }

  me(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/users/me`);
  }

  refresh(): Observable<TokenResponse> {
    const refreshToken = this.refreshToken;
    if (!refreshToken) return throwError(() => new Error('No refresh token'));

    // Note: request key is `refreshToken` (camelCase), unlike the snake_case response.
    this.refreshInFlight$ ??= this.http
      .post<TokenResponse>(`${this.baseUrl}/auth/refresh`, { refreshToken })
      .pipe(
        tap((res) => this.storeSession(res)),
        finalize(() => (this.refreshInFlight$ = null)),
        shareReplay(1),
      );

    return this.refreshInFlight$;
  }

  storeSession(res: TokenResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, res.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.refresh_token);
  }

  logout(): void {
    const refreshToken = this.refreshToken;
    if (refreshToken) {
      this.http.post(`${this.baseUrl}/auth/logout`, { refreshToken }).subscribe({
        error: () => {},
      });
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.state.clearUser();
    void this.router.navigate(['/login']);
  }
}
