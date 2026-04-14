import { Slot } from './doctor.model';

export interface AppointmentRaw {
  id: number;
  status: string;
  check_in_time: string | null;
  created_at: string;
  slot: number;
  patient: number;
}

export interface AppointmentListItem {
  id: number;
  status: string;
  check_in_time: string | null;
  created_at: string;
  slot: {
    id: number;
    start_datetime: string;
    end_datetime: string;
    doctor_id: number;
  } | null;
  doctor: {
    id: number;
    user_id: number;
    name: string;
  } | null;
  patient: {
    id: number;
    name: string;
    email: string;
  };
}

export interface AppointmentListResponse {
  status: string;
  count: number;
  appointments: AppointmentListItem[];
}

export interface TodayQueueResponse {
  status: string;
  doctor_id: number;
  date: string;
  count: number;
  queue: Array<{
    appointment_id: number;
    status: string;
    check_in_time: string | null;
    waiting_time_minutes: number | null;
    scheduled_start_datetime: string;
    scheduled_end_datetime: string;
    patient: {
      id: number;
      name: string;
      email: string;
    };
  }>;
}

export interface Appointment {
  id: number;
  status: string;
  check_in_time: string | null;
  created_at: string;
  slot_id: number;
  patient_id: number;
  doctor_id: number;
  doctor_name: string;
  doctor_specialization: string;
  start_datetime: string;
  end_datetime: string;
  session_duration: number;
}

export interface Prescription {
  id: number;
  drug_name: string;
  dose: string;
  duration: string;
  consultation: number;
}

export interface Consultation {
  id: number;
  diagnosis: string;
  notes: string;
  tests: string[];
  appointment: number;
  prescriptions: Prescription[];
}

export interface BookingCache {
  [appointmentId: number]: {
    doctor_id: number;
    doctor_name: string;
    doctor_specialization: string;
    start_datetime: string;
    end_datetime: string;
    session_duration: number;
  };
}
