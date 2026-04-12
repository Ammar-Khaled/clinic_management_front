import { Slot } from './doctor.model';

// What the API actually returns (flat)
export interface AppointmentRaw {
  id: number;
  status: string;
  check_in_time: string | null;
  created_at: string;
  slot: number;       // just the slot ID
  patient: number;    // just the patient ID
}

// Enriched version for display (built on the frontend)
export interface Appointment {
  id: number;
  status: string;
  check_in_time: string | null;
  created_at: string;
  slot_id: number;
  patient_id: number;
  // enriched fields (may be empty if not resolved)
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

// Used to cache booking context
export interface BookingCache {
  [appointmentId: number]: {
    doctor_name: string;
    doctor_specialization: string;
    start_datetime: string;
    end_datetime: string;
    session_duration: number;
  };
}