export interface Doctor {
  id: number;
  user_id: number;
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