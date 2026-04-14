import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
  patientName = '';

  // Doctors & Booking
  doctors: Doctor[] = [];
  doctorMap: Map<number, Doctor> = new Map();
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

  // Track if both doctors and appointments loaded (for resolution)
  private doctorsLoaded = false;
  private appointmentsLoaded = false;

  constructor(
    private auth: AuthService,
    private patientService: PatientService,
    private doctorService: DoctorService,
    private appointmentService: AppointmentService,
    private router: Router,
    private cdr: ChangeDetectorRef,
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
        this.patientName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Patient';
        if (data.first_name) localStorage.setItem('patient_first_name', data.first_name);
        if (data.last_name) localStorage.setItem('patient_last_name', data.last_name);
        this.profileLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.patientName = localStorage.getItem('patient_first_name') || 'Patient';
        this.profileLoading = false;
        this.cdr.detectChanges();
      },
    });
  }
  private parseEgyptDate(dateStr: string): Date {
    if (!dateStr) return new Date();

    return new Date(
      dateStr
        .replace('Z', '') // remove UTC shift
        .replace(' ', 'T'), // fix Django format
    );
  }
  // ==================== DOCTORS & BOOKING ====================

  loadDoctors(): void {
    this.doctorService.getAllDoctors().subscribe({
      next: (res: any) => {
        this.doctors = res.doctors;
        this.specializations = this.doctorService.getSpecializations(res.doctors);
        this.filteredDoctors = [...this.doctors];
        this.doctorMap = new Map(this.doctors.map((d: Doctor) => [d.id, d]));
        this.doctorsLoaded = true;
        this.cdr.detectChanges();

        // Try resolving uncached appointments now that doctors are loaded
        this.tryResolveUncached();
      },
      error: () => {
        this.cdr.detectChanges();
      },
    });
  }

  onSpecChange(): void {
    if (this.selectedSpec) {
      this.filteredDoctors = this.doctors.filter(
        (d: Doctor) => d.specialization === this.selectedSpec,
      );
    } else {
      this.filteredDoctors = [...this.doctors];
    }
    if (this.selectedDoctorId) {
      const stillValid = this.filteredDoctors.some((d: Doctor) => d.id === this.selectedDoctorId);
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

  onDateChange(value?: string): void {
    if (typeof value === 'string') {
      this.bookingDate = value;
    }
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
    this.cdr.detectChanges();

    this.doctorService
      .getDoctorSlots(this.selectedDoctorId, this.bookingDate, this.bookingDate)
      .subscribe({
        next: (res: any) => {
          this.availableSlots = res.slots.filter((s: Slot) => !s.is_booked);
          this.slotsLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.availableSlots = [];
          this.slotsLoading = false;
          this.cdr.detectChanges();
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
    this.cdr.detectChanges();

    const slot = this.selectedSlot;
    const doctor = this.doctors.find((d: Doctor) => d.id === this.selectedDoctorId);
    const doctorName = doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}`.trim() : '';

    this.appointmentService.bookAppointment(slot.id).subscribe({
      next: (apt: any) => {
        this.appointmentService.cacheBooking(apt.id, {
          doctor_id: doctor?.id || 0,
          doctor_name: doctorName || `Doctor #${doctor?.id}`,
          doctor_specialization: doctor?.specialization || '',
          start_datetime: slot.start_datetime,
          end_datetime: slot.end_datetime,
          session_duration: 0,
        });

        this.bookingSuccess = 'Appointment booked successfully!';
        this.bookingInProgress = false;
        this.selectedSlot = null;
        this.cdr.detectChanges();

        this.loadSlots();
        this.loadAppointments();
      },
      error: (err: any) => {
        this.bookingInProgress = false;
        this.bookingError = err.error?.error || 'Failed to book appointment.';
        this.cdr.detectChanges();
      },
    });
  }

  // ==================== APPOINTMENTS ====================

  loadAppointments(): void {
    this.appointmentsLoading = true;
    this.cdr.detectChanges();

    this.appointmentService.getMyAppointments().subscribe({
      next: (data: Appointment[]) => {
        this.appointments = data;
        this.splitAppointments();
        this.appointmentsLoaded = true;
        this.appointmentsLoading = false;
        this.cdr.detectChanges();

        // Try resolving uncached appointments
        this.tryResolveUncached();
      },
      error: () => {
        this.appointmentsLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private splitAppointments(): void {
    this.upcomingAppointments = this.appointments.filter((a: Appointment) =>
      ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'].includes(a.status),
    );
    this.pastAppointments = this.appointments.filter((a: Appointment) =>
      ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status),
    );
  }

  // ==================== RESOLVE UNCACHED APPOINTMENTS ====================

  private tryResolveUncached(): void {
    if (!this.doctorsLoaded || !this.appointmentsLoaded) return;

    // Find appointments that have no cached doctor_name and still have a valid slot
    const uncached = this.appointments.filter((a) => !a.doctor_name && a.slot_id && a.slot_id > 0);

    if (uncached.length === 0) return;

    // Search through each doctor's slots to find matches
    this.resolveFromDoctor(0, uncached);
  }

  private resolveFromDoctor(doctorIndex: number, uncached: Appointment[]): void {
    // Stop if we've checked all doctors or resolved all appointments
    if (doctorIndex >= this.doctors.length) return;
    if (uncached.every((a) => a.doctor_name)) return;

    const doctor = this.doctors[doctorIndex];
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 30);
    const end = new Date(today);
    end.setDate(end.getDate() + 60);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    this.doctorService.getDoctorSlots(doctor.id, startStr, endStr).subscribe({
      next: (res: any) => {
        const slots: Slot[] = res.slots || [];
        const slotMap = new Map(slots.map((s: Slot) => [s.id, s]));
        const doctorName = `Dr. ${doctor.first_name} ${doctor.last_name}`.trim();

        let resolved = false;

        for (const apt of uncached) {
          if (!apt.doctor_name && slotMap.has(apt.slot_id)) {
            const slot = slotMap.get(apt.slot_id)!;

            // Update appointment in place
            apt.doctor_name = doctorName;
            apt.doctor_specialization = doctor.specialization;
            apt.doctor_id = doctor.id;
            apt.start_datetime = slot.start_datetime;
            apt.end_datetime = slot.end_datetime;

            // Cache for future page loads
            this.appointmentService.cacheBooking(apt.id, {
              doctor_id: doctor.id,
              doctor_name: doctorName,
              doctor_specialization: doctor.specialization,
              start_datetime: slot.start_datetime,
              end_datetime: slot.end_datetime,
              session_duration: 0,
            });

            resolved = true;
          }
        }

        if (resolved) {
          this.splitAppointments();
          this.cdr.detectChanges();
        }

        // Continue with next doctor for remaining unresolved
        this.resolveFromDoctor(doctorIndex + 1, uncached);
      },
      error: () => {
        // Skip this doctor, try next
        this.resolveFromDoctor(doctorIndex + 1, uncached);
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

    const d = this.parseEgyptDate(dateStr);

    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
  formatTime(dateStr: string): string {
    if (!dateStr) return '';

    const d = new Date(dateStr.replace(' ', 'T'));

    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
  formatSlotTime(dateStr: string): string {
    if (!dateStr) return '';

    const fixed = dateStr.replace('Z', '');

    const d = new Date(fixed);

    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  private toDateStr(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
