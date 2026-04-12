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