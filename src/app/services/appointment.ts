import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppointmentRaw, Appointment, BookingCache, Consultation } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // --- Booking Cache (stores doctor/slot info when patient books) ---

  private getCache(): BookingCache {
    try {
      return JSON.parse(localStorage.getItem('booking_cache') || '{}');
    } catch {
      return {};
    }
  }

  cacheBooking(appointmentId: number, info: {
    doctor_name: string;
    doctor_specialization: string;
    start_datetime: string;
    end_datetime: string;
    session_duration: number;
  }): void {
    const cache = this.getCache();
    cache[appointmentId] = info;
    localStorage.setItem('booking_cache', JSON.stringify(cache));
  }

  // --- API Calls ---

  bookAppointment(slotId: number): Observable<AppointmentRaw> {
    return this.http.post<AppointmentRaw>(
      `${this.api}/patients/appointments`,
      { slot_id: slotId }
    );
  }

  getMyAppointments(): Observable<Appointment[]> {
    return this.http.get<AppointmentRaw[]>(`${this.api}/patients/appointments/me`).pipe(
      map(raw => this.enrichList(raw))
    );
  }

  getAppointmentDetail(id: number): Observable<Appointment> {
    return this.http.get<AppointmentRaw>(`${this.api}/patients/appointments/${id}`).pipe(
      map(raw => this.enrichOne(raw))
    );
  }

  getConsultation(appointmentId: number): Observable<Consultation> {
    return this.http.get<Consultation>(
      `${this.api}/appointments/${appointmentId}/consultation`
    );
  }

  createConsultation(appointmentId: number | string, data: any): Observable<Consultation> {
    return this.http.post<Consultation>(`${this.api}/appointments/${appointmentId}/consultation`, data);
  }

  updateConsultation(appointmentId: number | string, data: any): Observable<Consultation> {
    return this.http.patch<Consultation>(`${this.api}/appointments/${appointmentId}/consultation`, data);
  }

  // --- Admin & Queues ---

  getAllAppointments(): Observable<Appointment[]> {
    return this.http.get<AppointmentRaw[]>(`${this.api}/appointments/`).pipe(
      map(raw => this.enrichList(raw))
    );
  }

  getQueueToday(): Observable<any> {
    return this.http.get(`${this.api}/appointments/queue/today`);
  }

  getAppointmentsAnalytics(): Observable<any> {
    return this.http.get(`${this.api}/appointments`);
  }

  // --- Status Updates ---

  confirmAppointment(id: number | string): Observable<any> {
    return this.http.patch(`${this.api}/appointments/${id}/confirm`, { status: 'CONFIRMED' });
  }

  completeAppointment(id: number | string): Observable<any> {
    return this.http.patch(`${this.api}/appointments/${id}/complete`, {});
  }

  checkInAppointment(id: number | string): Observable<any> {
    return this.http.patch(`${this.api}/appointments/${id}/check-in`, { status: 'CHECKED_IN' });
  }

  noShowAppointment(id: number | string): Observable<any> {
    return this.http.patch(`${this.api}/appointments/${id}/no-show`, {});
  }

  declineAppointment(id: number | string, reason: string): Observable<any> {
    return this.http.patch(`${this.api}/appointments/${id}/decline`, { reason });
  }

  cancelAppointment(id: number | string, reason: string): Observable<any> {
    return this.http.patch(`${this.api}/appointments/${id}/cancel`, { reason });
  }

  rescheduleAppointment(id: number | string, newSlotId: number, reason: string): Observable<any> {
    return this.http.patch(`${this.api}/appointments/${id}/reschedule`, { new_slot_id: newSlotId, reason });
  }

  getRescheduleHistory(id: number | string): Observable<any> {
    return this.http.get(`${this.api}/appointments/${id}/reschedule-history`);
  }

  // --- Enrichment from cache ---

  private enrichOne(raw: AppointmentRaw): Appointment {
    const cache = this.getCache();
    const cached = cache[raw.id];
    return {
      id: raw.id,
      status: raw.status,
      check_in_time: raw.check_in_time,
      created_at: raw.created_at,
      slot_id: raw.slot,
      patient_id: raw.patient,
      doctor_name: cached?.doctor_name || '',
      doctor_specialization: cached?.doctor_specialization || '',
      start_datetime: cached?.start_datetime || '',
      end_datetime: cached?.end_datetime || '',
      session_duration: cached?.session_duration || 0,
    };
  }

  private enrichList(rawList: AppointmentRaw[]): Appointment[] {
    return rawList.map(r => this.enrichOne(r));
  }
}