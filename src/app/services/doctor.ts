import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DoctorsResponse, SlotsResponse } from '../models/doctor.model';

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllDoctors(): Observable<DoctorsResponse> {
    return this.http.get<DoctorsResponse>(`${this.api}/doctors/`);
  }

  getDoctorSlots(doctorId: number, startDate?: string, endDate?: string): Observable<SlotsResponse> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    return this.http.get<SlotsResponse>(
      `${this.api}/doctors/${doctorId}/slots`,
      { params }
    );
  }

  // Get unique specializations from doctor list
  getSpecializations(doctors: any[]): string[] {
    const specs = new Set(doctors.map(d => d.specialization));
    return Array.from(specs).sort();
  }

  // --- Doctor Exceptions ---
  createException(doctorId: number | string, data: any): Observable<any> {
    return this.http.post(`${this.api}/doctors/${doctorId}/exceptions`, data);
  }

  deleteException(doctorId: number | string, exceptionId: number | string): Observable<void> {
    return this.http.delete<void>(`${this.api}/doctors/${doctorId}/exceptions/${exceptionId}`);
  }

  // --- Doctor Availability (Schedule) ---
  getDoctorSchedule(doctorId: number | string): Observable<any> {
    return this.http.get(`${this.api}/doctors/${doctorId}/availability`);
  }

  createDoctorSchedule(doctorId: number | string, data: any): Observable<any> {
    return this.http.post(`${this.api}/doctors/${doctorId}/availability`, data);
  }

  updateDoctorSchedule(doctorId: number | string, availabilityId: number | string, data: any): Observable<any> {
    return this.http.patch(`${this.api}/doctors/${doctorId}/availability/${availabilityId}`, data);
  }

  deleteDoctorSchedule(doctorId: number | string): Observable<void> {
    return this.http.delete<void>(`${this.api}/doctors/${doctorId}/availability`);
  }

  // --- Advanced Slots ---
  regenerateSlots(doctorId: number | string): Observable<any> {
    return this.http.post(`${this.api}/doctors/${doctorId}/slots/regenerate`, {});
  }

  // --- Doctor Self ---
  getDoctorProfileSelf(): Observable<any> {
    return this.http.get(`${this.api}/doctors/me`);
  }

  getDoctorScheduleSelf(date?: string): Observable<any> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get(`${this.api}/doctors/me/schedule`, { params });
  }
}