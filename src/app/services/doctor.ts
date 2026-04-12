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
}