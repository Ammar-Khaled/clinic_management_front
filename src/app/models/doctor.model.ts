export interface Doctor {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  specialization: string;
  email: string;
}

export interface DoctorsResponse {
  status: string;
  doctors: Doctor[];
}

export interface Slot {
  id: number;
  doctor_id: number;
  start_datetime: string;
  end_datetime: string;
  is_booked: boolean;
}

export interface SlotsResponse {
  status: string;
  message: string;
  start_date: string;
  end_date: string;
  count: number;
  slots: Slot[];
}

export interface DoctorAvailability {
  id: number;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
}

export interface DoctorAvailabilitiesResponse {
  status: string;
  availabilities: DoctorAvailability[];
}

export interface ReceptionistApiMessageResponse {
  status: string;
  message: string;
}

export interface AvailabilityCreateItem {
  day_of_week?: number | string;
  start_time: string;
  end_time: string;
}

export interface CreateDoctorAvailabilityRequest {
  similar_weekdays: 'true' | 'false';
  availability: AvailabilityCreateItem[];
}

export interface UpdateDoctorAvailabilityRequest {
  availability: Array<{
    start_time: string;
    end_time: string;
  }>;
}

export interface CreateDoctorExceptionRequest {
  date: string;
  type: DoctorExceptionType;
  start_time?: string;
  end_time?: string;
}

export interface RegenerateNext7DaysResponse {
  status: string;
  message: string;
  start_date: string;
  end_date: string;
  doctors_total: number;
  doctors_skipped_already_had_slots: number;
  doctors_regenerated_missing_slots: number;
  missing_dates_detected: number;
  generated_slots: number;
}

export enum DayOfWeek {
  SATURDAY = 0,
  SUNDAY = 1,
  MONDAY = 2,
  TUESDAY = 3,
  WEDNESDAY = 4,
  THURSDAY = 5,
  FRIDAY = 6,
}

export type DoctorExceptionType = 'VACATION_DAY' | 'EXTRA_WORKING_DAY';

export interface DoctorException {
  id: number;
  doctor: number;
  date: string;
  type: DoctorExceptionType;
  start_time: string | null;
  end_time: string | null;
}

export interface DoctorExceptionsResponse {
  status: string;
  exceptions: DoctorException[];
}