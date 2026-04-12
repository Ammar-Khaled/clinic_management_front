import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { PatientService } from '../../services/patient';
import { DoctorService } from '../../services/doctor';
import { AppointmentService } from '../../services/appointment';
import { PatientProfile } from '../../models/user.model';
import { Doctor, Slot } from '../../models/doctor.model';
import { Appointment } from '../../models/appointment.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  // Profile
  profile: PatientProfile | null = null;
  profileLoading = true;

  // Doctors & Booking
  doctors: Doctor[] = [];
  specializations: string[] = [];
  selectedSpec = '';
  filteredDoctors: Doctor[] = [];
  selectedDoctorId: number | null = null;
  bookingDate = '';
  availableSlots: Slot[] = [];
  slotsLoading = false;
  selectedSlot: Slot | null = null;
  bookingInProgress = false;
  bookingSuccess = '';
  bookingError = '';

  // Appointments
  appointments: Appointment[] = [];
  upcomingAppointments: Appointment[] = [];
  pastAppointments: Appointment[] = [];
  appointmentsLoading = true;

  constructor(
    private auth: AuthService,
    private patientService: PatientService,
    private doctorService: DoctorService,
    private appointmentService: AppointmentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.bookingDate = this.toDateStr(new Date());
    this.loadProfile();
    this.loadDoctors();
    this.loadAppointments();
  }

  // ==================== PROFILE ====================

  loadProfile(): void {
    this.patientService.getProfile().subscribe({
      next: (data: PatientProfile) => {
        this.profile = data;
        this.profileLoading = false;
      },
      error: () => {
        this.profileLoading = false;
      },
    });
  }

  // ==================== DOCTORS & BOOKING ====================

  loadDoctors(): void {
    this.doctorService.getAllDoctors().subscribe({
      next: (res: any) => {
        this.doctors = res.doctors;
        this.specializations = this.doctorService.getSpecializations(res.doctors);
        this.filteredDoctors = [...this.doctors];
      },
      error: () => {},
    });
  }

  onSpecChange(): void {
    if (this.selectedSpec) {
      this.filteredDoctors = this.doctors.filter(
        (d: Doctor) => d.specialization === this.selectedSpec
      );
    } else {
      this.filteredDoctors = [...this.doctors];
    }
    if (this.selectedDoctorId) {
      const stillValid = this.filteredDoctors.some(
        (d: Doctor) => d.id === this.selectedDoctorId
      );
      if (!stillValid) {
        this.selectedDoctorId = null;
        this.availableSlots = [];
        this.selectedSlot = null;
      }
    }
  }

  onDoctorChange(): void {
    this.availableSlots = [];
    this.selectedSlot = null;
    this.bookingError = '';
    this.bookingSuccess = '';
    if (this.selectedDoctorId && this.bookingDate) {
      this.loadSlots();
    }
  }

  onDateChange(): void {
    this.availableSlots = [];
    this.selectedSlot = null;
    this.bookingError = '';
    this.bookingSuccess = '';
    if (this.selectedDoctorId && this.bookingDate) {
      this.loadSlots();
    }
  }

  loadSlots(): void {
    if (!this.selectedDoctorId || !this.bookingDate) return;
    this.slotsLoading = true;
    this.doctorService
      .getDoctorSlots(this.selectedDoctorId, this.bookingDate, this.bookingDate)
      .subscribe({
        next: (res: any) => {
          this.availableSlots = res.slots.filter((s: Slot) => !s.is_booked);
          this.slotsLoading = false;
        },
        error: () => {
          this.availableSlots = [];
          this.slotsLoading = false;
        },
      });
  }

  selectSlot(slot: Slot): void {
    this.selectedSlot = slot;
    this.bookingError = '';
    this.bookingSuccess = '';
  }

  bookAppointment(): void {
    if (!this.selectedSlot) return;
    this.bookingInProgress = true;
    this.bookingError = '';
    this.bookingSuccess = '';

    const slot = this.selectedSlot;
    const doctor = this.doctors.find((d: Doctor) => d.id === this.selectedDoctorId);

    this.appointmentService.bookAppointment(slot.id).subscribe({
      next: (apt: any) => {
        this.appointmentService.cacheBooking(apt.id, {
          doctor_name: doctor ? `Doctor #${doctor.id}` : '',
          doctor_specialization: doctor?.specialization || '',
          start_datetime: slot.start_datetime,
          end_datetime: slot.end_datetime,
          session_duration: 0,
        });

        this.bookingSuccess = 'Appointment booked successfully!';
        this.bookingInProgress = false;
        this.selectedSlot = null;

        this.loadSlots();
        this.loadAppointments();
      },
      error: (err: any) => {
        this.bookingInProgress = false;
        this.bookingError = err.error?.error || 'Failed to book appointment.';
      },
    });
  }

  // ==================== APPOINTMENTS ====================

  loadAppointments(): void {
    this.appointmentsLoading = true;
    this.appointmentService.getMyAppointments().subscribe({
      next: (data: Appointment[]) => {
        this.appointments = data;
        this.upcomingAppointments = data.filter((a: Appointment) =>
          ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'].includes(a.status)
        );
        this.pastAppointments = data.filter((a: Appointment) =>
          ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status)
        );
        this.appointmentsLoading = false;
      },
      error: () => {
        this.appointmentsLoading = false;
      },
    });
  }

  // ==================== LOGOUT ====================

  logout(): void {
    this.auth.logout();
  }

  // ==================== HELPERS ====================

  getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      SCHEDULED: 'bg-secondary-fixed/40 text-on-secondary-fixed-variant',
      CONFIRMED: 'bg-secondary-fixed/40 text-on-secondary-fixed-variant',
      CHECKED_IN: 'bg-green-100 text-green-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
      CANCELLED: 'bg-slate-200 text-slate-600',
      NO_SHOW: 'bg-error-container text-error',
    };
    return map[status] || 'bg-slate-100 text-slate-500';
  }

  getStatusIcon(status: string): string {
    const map: Record<string, string> = {
      SCHEDULED: 'pending',
      CONFIRMED: 'check_circle',
      CHECKED_IN: 'how_to_reg',
      COMPLETED: 'task_alt',
      CANCELLED: 'cancel',
      NO_SHOW: 'person_off',
    };
    return map[status] || 'help';
  }

  getStatusIconBg(status: string): string {
    const map: Record<string, string> = {
      SCHEDULED: 'bg-surface-container-highest text-slate-400',
      CONFIRMED: 'bg-secondary-container/20 text-secondary',
      CHECKED_IN: 'bg-green-100 text-green-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
      CANCELLED: 'bg-slate-100 text-slate-400',
      NO_SHOW: 'bg-error-container text-error',
    };
    return map[status] || 'bg-slate-100 text-slate-400';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatSlotTime(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  private toDateStr(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}