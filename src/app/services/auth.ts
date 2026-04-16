import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  LoginRequest, LoginResponse,
  RegisterRequest, RegisterResponse
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl;
  private _isLoggedIn$ = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$ = this._isLoggedIn$.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  private hasToken(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.api}/patients/register`, data);
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.api}/auth/login`, data)
      .pipe(
        tap(res => {
          localStorage.setItem('access_token', res.access);
          localStorage.setItem('refresh_token', res.refresh);
          this._isLoggedIn$.next(true);
        })
      );
  }

  loginWithGoogle(idToken: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.api}/auth/google/`, { "id_token": idToken })
      .pipe(
        tap(res => {
          localStorage.setItem('access_token', res.access);
          localStorage.setItem('refresh_token', res.refresh);
          this._isLoggedIn$.next(true);
        })
      );
  }

  getUserDetails(id: string): Observable<any> {
    return this.http.get(`${this.api}/users/${id}/`);
  }

  refreshToken(refresh: string): Observable<{ access: string, refresh?: string }> {
    return this.http.post<{ access: string, refresh?: string }>(`${this.api}/auth/token/refresh/`, { refresh }).pipe(
      tap(res => {
        if (res.access) localStorage.setItem('access_token', res.access);
        if (res.refresh) localStorage.setItem('refresh_token', res.refresh);
      })
    );
  }

  logout(): void {
    const refresh = localStorage.getItem('refresh_token');
    const access = localStorage.getItem('access_token');
    
    if (refresh) {
      const headers: Record<string, string> = access ? { Authorization: `Bearer ${access}` } : {};
      
      this.http.post(
        `${this.api}/auth/logout`, 
        { refresh: refresh },
        { headers }
      ).subscribe({
        complete: () => this.clearSession(),
        error: () => this.clearSession()
      });
    } else {
      this.clearSession();
    }
  }

  private clearSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('booking_cache');
    this._isLoggedIn$.next(false);
    this.router.navigate(['/login']);
  }
}