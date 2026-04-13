export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface PatientProfile {
  id?: number;
  user?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  date_of_birth: string;
  gender: string;
  phone_number: string;
  height: number;
  weight: number;
  blood_type: string;
  allergies: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  first_name: string;
  last_name: string;
  profile: {
    date_of_birth: string;
    gender: string;
    phone_number: string;
    height: number;
    weight: number;
    blood_type?: string;
    allergies?: string;
  };
}

export interface RegisterResponse {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile: PatientProfile;
}

// --- Admin types (used by AdminDashboard) ---
export interface User {
  id?: string | number;
  username?: string;
  email?: string;
  password?: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface DailyAppointmentStat {
  day: string;
  percentage: number;
}

export interface AppointmentStatusStat {
  status: string;
  percentage: number;
  hexCode: string;
}

export interface AppointmentsAnalytics {
  growthPercentage?: number;
  volume?: DailyAppointmentStat[];
  statuses?: AppointmentStatusStat[];
}