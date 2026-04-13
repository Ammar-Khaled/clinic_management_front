import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
	CreateDoctorExceptionRequest,
	CreateDoctorAvailabilityRequest,
	DoctorAvailabilitiesResponse,
	DoctorExceptionsResponse,
	ReceptionistApiMessageResponse,
	RegenerateNext7DaysResponse,
	SlotsResponse,
	UpdateDoctorAvailabilityRequest,
} from '../models/doctor.model';

@Injectable({ providedIn: 'root' })
export class ReceptionistService {
	private api = environment.apiUrl;

	constructor(private http: HttpClient) {}

	private getAuthHeaders(): HttpHeaders {
		const token = localStorage.getItem('access_token');
		return token
			? new HttpHeaders({ Authorization: `Bearer ${token}` })
			: new HttpHeaders();
	}

	// --- Doctor Availability ---
	getDoctorAvailability(doctorId: number | string): Observable<DoctorAvailabilitiesResponse> {
		return this.http.get<DoctorAvailabilitiesResponse>(`${this.api}/doctors/${doctorId}/availability`, {
			headers: this.getAuthHeaders(),
		});
	}

	createDoctorAvailability(
		doctorId: number | string,
		data: CreateDoctorAvailabilityRequest
	): Observable<ReceptionistApiMessageResponse> {
		return this.http.post<ReceptionistApiMessageResponse>(`${this.api}/doctors/${doctorId}/availability`, data, {
			headers: this.getAuthHeaders(),
		});
	}

	updateDoctorAvailability(
		doctorId: number | string,
		availabilityId: number | string,
		data: UpdateDoctorAvailabilityRequest
	): Observable<ReceptionistApiMessageResponse> {
		return this.http.patch<ReceptionistApiMessageResponse>(
			`${this.api}/doctors/${doctorId}/availability/${availabilityId}`,
			data,
			{ headers: this.getAuthHeaders() }
		);
	}

	deleteAllDoctorAvailabilities(doctorId: number | string): Observable<ReceptionistApiMessageResponse> {
		return this.http.delete<ReceptionistApiMessageResponse>(`${this.api}/doctors/${doctorId}/availability`, {
			headers: this.getAuthHeaders(),
		});
	}

	// --- Doctor Exceptions ---
	createDoctorException(
		doctorId: number | string,
		data: CreateDoctorExceptionRequest
	): Observable<ReceptionistApiMessageResponse> {
		return this.http.post<ReceptionistApiMessageResponse>(`${this.api}/doctors/${doctorId}/exceptions`, data, {
			headers: this.getAuthHeaders(),
		});
	}

	deleteDoctorException(
		doctorId: number | string,
		exceptionId: number | string
	): Observable<ReceptionistApiMessageResponse> {
		return this.http.delete<ReceptionistApiMessageResponse>(`${this.api}/doctors/${doctorId}/exceptions/${exceptionId}`, {
			headers: this.getAuthHeaders(),
		});
	}

	getDoctorExceptions(doctorId: number | string): Observable<DoctorExceptionsResponse> {
		return this.http.get<DoctorExceptionsResponse>(`${this.api}/doctors/${doctorId}/exceptions`, {
			headers: this.getAuthHeaders(),
		});
	}

	// --- Doctor Slots ---
	getDoctorSlots(doctorId: number | string, startDate?: string, endDate?: string): Observable<SlotsResponse> {
		let params = new HttpParams();
		if (startDate) params = params.set('start_date', startDate);
		if (endDate) params = params.set('end_date', endDate);

		return this.http.get<SlotsResponse>(`${this.api}/doctors/${doctorId}/slots`, {
			headers: this.getAuthHeaders(),
			params,
		});
	}

	// --- Global Slot Regeneration ---
	regenerateNext7DaysSlots(): Observable<RegenerateNext7DaysResponse> {
		return this.http.post<RegenerateNext7DaysResponse>(`${this.api}/receptionist/slots/regenerate-next-7-days`, {}, {
			headers: this.getAuthHeaders(),
		});
	}
}
