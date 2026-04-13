import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { User, PaginatedResponse } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getUsers(filters?: { role?: string; is_active?: boolean; search?: string; page_size?: number; page?: number }): Observable<PaginatedResponse<User> | User[]> {
    let params = new HttpParams();
    if (filters?.role) params = params.set('role', filters.role);
    if (filters?.is_active !== undefined) params = params.set('is_active', String(filters.is_active));
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.page_size) params = params.set('page_size', String(filters.page_size));
    if (filters?.page) params = params.set('page', String(filters.page));

    return this.http.get<PaginatedResponse<User> | User[]>(`${this.api}/users`, { params });
  }

  createUser(data: User): Observable<User> {
    return this.http.post<User>(`${this.api}/users/`, data);
  }

  updateUser(id: number | string, data: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.api}/users/${id}/`, data);
  }

  deleteUser(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.api}/users/${id}/`);
  }
}
