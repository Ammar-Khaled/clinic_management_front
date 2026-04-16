import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PatientProfile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<PatientProfile> {
    return this.http.get<PatientProfile>(`${this.api}/patients/me`);
  }

  getPatientById(id: number | string): Observable<PatientProfile> {
    return this.http.get<PatientProfile>(`${this.api}/patients/${id}`);
  }

  updateProfile(data: Partial<PatientProfile>): Observable<PatientProfile> {
    return this.http.patch<PatientProfile>(`${this.api}/patients/me`, data);
  }

  completeProfile(data: PatientProfile): Observable<PatientProfile> {
    return this.http.post<PatientProfile>(`${this.api}/patients/complete-profile/`, data);
  }
}