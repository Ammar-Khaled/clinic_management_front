import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AppointmentService } from '../../services/appointment';
import { DoctorService } from '../../services/doctor';
import { Appointment, Consultation } from '../../models/appointment.model';
import { Slot } from '../../models/doctor.model';

@Component({
  selector: 'app-appointment-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointment-detail.html',
  styleUrl: './appointment-detail.css',
})
export class AppointmentDetailComponent implements OnInit, OnDestroy {
  appointment: Appointment | null = null;
  consultation: Consultation | null = null;
  loading = true;
  consultationLoading = false;
  errorMsg = '';

  // Waiting time countdown (CHECKED_IN)
  waitingMinutes = 0;
  waitingSeconds = 0;
  waitingLabel = '';
  waitingPast = false;
  private countdownInterval: any = null;

  // Cancel
  showCancelModal = false;
  cancelReason = '';
  cancelInProgress = false;
  cancelError = '';

  // Reschedule
  showRescheduleModal = false;
  rescheduleDate = '';
  rescheduleSlots: Slot[] = [];
  rescheduleSlotsLoading = false;
  selectedRescheduleSlot: Slot | null = null;
  rescheduleReason = '';
  rescheduleInProgress = false;
  rescheduleError = '';

  // Reschedule history
  rescheduleHistory: any[] = [];
  historyLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private appointmentService: AppointmentService,
    private doctorService: DoctorService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id')
      || this.route.snapshot.paramMap.get('appointmentId');
    const id = Number(idParam);

    if (!id || isNaN(id)) {
      this.errorMsg = 'Invalid appointment ID.';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loadAppointment(id);
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  // ==================== LOAD DATA ====================

 loadAppointment(id: number): void {
    this.appointmentService.getAppointmentDetail(id).subscribe({
      next: (data) => {
        this.appointment = data;
        this.loading = false;

        // If no cached datetime, try to resolve from slot API
        if (!data.start_datetime && data.slot_id) {
          this.resolveSlotData(data);
        }

        if (data.status === 'COMPLETED') {
          this.loadConsultation(id);
        }
        if (data.status === 'CHECKED_IN') {
          this.startCountdown();
        }
        this.loadRescheduleHistory(id);
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMsg = 'Failed to load appointment.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * When cache has no slot data, find the doctor and slot info
   * by searching through all doctors' slots
   */
  resolveSlotData(appointment: Appointment): void {
    this.doctorService.getAllDoctors().subscribe({
      next: (res: any) => {
        const doctors = res.doctors || [];
        this.findSlotInDoctors(doctors, 0, appointment);
      },
      error: () => {},
    });
  }

  private findSlotInDoctors(doctors: any[], index: number, appointment: Appointment): void {
    if (index >= doctors.length) return;

    const doctor = doctors[index];
    // Search a wide date range to find the slot
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    this.doctorService.getDoctorSlots(doctor.id, startStr, endStr).subscribe({
      next: (res: any) => {
        const slots = res.slots || [];
        const matchedSlot = slots.find((s: any) => s.id === appointment.slot_id);

      if (matchedSlot) {
  this.appointment!.start_datetime = matchedSlot.start_datetime;
  this.appointment!.end_datetime = matchedSlot.end_datetime;
  this.appointment!.doctor_id = doctor.id;
  this.appointment!.doctor_name = `Dr. ${doctor.first_name} ${doctor.last_name}`.trim();
  this.appointment!.doctor_specialization = doctor.specialization || '';

  this.appointmentService.cacheBooking(appointment.id, {
    doctor_id: doctor.id,
    doctor_name: `Dr. ${doctor.first_name} ${doctor.last_name}`.trim(),
    doctor_specialization: doctor.specialization || '',
    start_datetime: matchedSlot.start_datetime,
    end_datetime: matchedSlot.end_datetime,
    session_duration: 0,
  });

          // Restart countdown if checked in
          if (this.appointment!.status === 'CHECKED_IN') {
            this.startCountdown();
          }

          this.cdr.detectChanges();
        } else {
          this.findSlotInDoctors(doctors, index + 1, appointment);
        }
      },
      error: () => {
        this.findSlotInDoctors(doctors, index + 1, appointment);
      },
    });
  }

  loadConsultation(appointmentId: number): void {
    this.consultationLoading = true;
    this.cdr.detectChanges();

    this.appointmentService.getConsultation(appointmentId).subscribe({
      next: (data) => {
        this.consultation = data;
        this.consultationLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.consultationLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadRescheduleHistory(appointmentId: number): void {
    this.historyLoading = true;
    this.appointmentService.getRescheduleHistory(appointmentId).subscribe({
      next: (res: any) => {
        this.rescheduleHistory = res.history || [];
        this.historyLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.historyLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ==================== COUNTDOWN (CHECKED_IN) ====================

  startCountdown(): void {
    this.updateCountdown();
    this.countdownInterval = setInterval(() => {
      this.updateCountdown();
      this.cdr.detectChanges();
    }, 1000);
  }

  stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  updateCountdown(): void {
    if (!this.appointment?.start_datetime) {
      this.waitingLabel = 'Waiting...';
      return;
    }

    const now = new Date().getTime();
    const slotStart = new Date(this.appointment.start_datetime).getTime();
    const diff = slotStart - now;

    if (diff > 0) {
      // Appointment is in the future — countdown
      this.waitingPast = false;
      this.waitingMinutes = Math.floor(diff / 60000);
      this.waitingSeconds = Math.floor((diff % 60000) / 1000);
      if (this.waitingMinutes >= 60) {
        const hours = Math.floor(this.waitingMinutes / 60);
        const mins = this.waitingMinutes % 60;
        this.waitingLabel = `${hours}h ${mins}m ${this.waitingSeconds}s`;
      } else {
        this.waitingLabel = `${this.waitingMinutes}m ${this.waitingSeconds}s`;
      }
    } else {
      // Appointment time has passed or is now
      this.waitingPast = true;
      const elapsed = Math.abs(diff);
      this.waitingMinutes = Math.floor(elapsed / 60000);
      this.waitingSeconds = Math.floor((elapsed % 60000) / 1000);
      this.waitingLabel = this.waitingMinutes > 0
        ? `${this.waitingMinutes}m ${this.waitingSeconds}s ago`
        : `${this.waitingSeconds}s ago`;
    }
  }

  // ==================== CANCEL ====================

  get canCancel(): boolean {
    return !!this.appointment &&
      ['SCHEDULED', 'CONFIRMED'].includes(this.appointment.status);
  }

  openCancelModal(): void {
    this.showCancelModal = true;
    this.cancelReason = '';
    this.cancelError = '';
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
  }

  confirmCancel(): void {
    if (!this.appointment || !this.cancelReason.trim()) {
      this.cancelError = 'Please provide a reason for cancellation.';
      return;
    }

    this.cancelInProgress = true;
    this.cancelError = '';
    this.cdr.detectChanges();

    this.appointmentService.cancelAppointment(this.appointment.id, this.cancelReason).subscribe({
      next: () => {
        this.appointment!.status = 'CANCELLED';
        this.showCancelModal = false;
        this.cancelInProgress = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cancelInProgress = false;
        this.cancelError = err.error?.message || 'Failed to cancel appointment.';
        this.cdr.detectChanges();
      },
    });
  }

  // ==================== RESCHEDULE ====================

  get canReschedule(): boolean {
    return !!this.appointment &&
      ['SCHEDULED', 'CONFIRMED'].includes(this.appointment.status);
  }

  openRescheduleModal(): void {
    this.showRescheduleModal = true;
    this.rescheduleDate = '';
    this.rescheduleSlots = [];
    this.selectedRescheduleSlot = null;
    this.rescheduleReason = '';
    this.rescheduleError = '';
  }

  closeRescheduleModal(): void {
    this.showRescheduleModal = false;
  }

   onRescheduleDateChange(): void {
    this.rescheduleSlots = [];
    this.selectedRescheduleSlot = null;
    this.rescheduleError = '';

    if (!this.rescheduleDate || !this.appointment) return;
    this.loadRescheduleSlots();
  }

  loadRescheduleSlots(): void {
    if (!this.appointment) return;

    const doctorId = this.appointment.doctor_id;

    if (!doctorId) {
      // Fallback: try to find doctor by searching all doctors for the slot
      this.loadRescheduleSlotsFallback();
      return;
    }

    this.rescheduleSlotsLoading = true;
    this.cdr.detectChanges();

    this.doctorService
      .getDoctorSlots(doctorId, this.rescheduleDate, this.rescheduleDate)
      .subscribe({
        next: (res: any) => {
          const allSlots: Slot[] = res.slots || [];
          this.rescheduleSlots = allSlots.filter(
            (s: Slot) => !s.is_booked && s.id !== this.appointment!.slot_id
          );
          this.rescheduleSlotsLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.rescheduleSlotsLoading = false;
          this.rescheduleError = 'Failed to load available slots.';
          this.cdr.detectChanges();
        },
      });
  }

  // Fallback: search all doctors to find who owns this appointment's slot
  private loadRescheduleSlotsFallback(): void {
    this.rescheduleSlotsLoading = true;
    this.cdr.detectChanges();

    this.doctorService.getAllDoctors().subscribe({
      next: (res: any) => {
        const doctors = res.doctors || [];
        this.searchDoctorForSlot(doctors, 0);
      },
      error: () => {
        this.rescheduleSlotsLoading = false;
        this.rescheduleError = 'Failed to load doctors.';
        this.cdr.detectChanges();
      },
    });
  }

  private searchDoctorForSlot(doctors: any[], index: number): void {
    if (index >= doctors.length) {
      this.rescheduleSlotsLoading = false;
      this.rescheduleError = 'Could not find available slots for this doctor.';
      this.cdr.detectChanges();
      return;
    }

    const doctor = doctors[index];

    this.doctorService
      .getDoctorSlots(doctor.id, this.rescheduleDate, this.rescheduleDate)
      .subscribe({
        next: (res: any) => {
          const allSlots: Slot[] = res.slots || [];
          const hasOurSlot = allSlots.some(
            (s: Slot) => s.id === this.appointment!.slot_id
          );

          if (hasOurSlot) {
            // Found the doctor — save doctor_id for future use
            this.appointment!.doctor_id = doctor.id;

            // Update cache with doctor_id
            const cache = JSON.parse(localStorage.getItem('booking_cache') || '{}');
            if (cache[this.appointment!.id]) {
              cache[this.appointment!.id].doctor_id = doctor.id;
              localStorage.setItem('booking_cache', JSON.stringify(cache));
            }

            this.rescheduleSlots = allSlots.filter(
              (s: Slot) => !s.is_booked && s.id !== this.appointment!.slot_id
            );
            this.rescheduleSlotsLoading = false;
            this.cdr.detectChanges();
          } else {
            this.searchDoctorForSlot(doctors, index + 1);
          }
        },
        error: () => {
          this.searchDoctorForSlot(doctors, index + 1);
        },
      });
  }

  selectRescheduleSlot(slot: Slot): void {
    this.selectedRescheduleSlot = slot;
    this.rescheduleError = '';
  }

 confirmReschedule(): void {
    if (!this.appointment || !this.selectedRescheduleSlot || !this.rescheduleReason.trim()) {
      this.rescheduleError = 'Please select a new slot and provide a reason.';
      return;
    }

    this.rescheduleInProgress = true;
    this.rescheduleError = '';
    this.cdr.detectChanges();

    this.appointmentService.rescheduleAppointment(
      this.appointment.id,
      this.selectedRescheduleSlot.id,
      this.rescheduleReason
    ).subscribe({
      next: () => {
        const newSlot = this.selectedRescheduleSlot!;

        // Update local appointment state
        this.appointment!.status = 'SCHEDULED';
        this.appointment!.start_datetime = newSlot.start_datetime;
        this.appointment!.end_datetime = newSlot.end_datetime;
        this.appointment!.slot_id = newSlot.id;

        // Update cache — create entry if it doesn't exist
        this.appointmentService.cacheBooking(this.appointment!.id, {
          doctor_id: this.appointment!.doctor_id || 0,
          doctor_name: this.appointment!.doctor_name || '',
          doctor_specialization: this.appointment!.doctor_specialization || '',
          start_datetime: newSlot.start_datetime,
          end_datetime: newSlot.end_datetime,
          session_duration: this.appointment!.session_duration || 0,
        });

        this.showRescheduleModal = false;
        this.rescheduleInProgress = false;

        // Reload history
        this.loadRescheduleHistory(this.appointment!.id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.rescheduleInProgress = false;
        this.rescheduleError = err.error?.message || 'Failed to reschedule appointment.';
        this.cdr.detectChanges();
      },
    });
  }

  // ==================== NAVIGATION ====================

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  // ==================== HELPERS ====================

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

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatShortDate(dateStr: string): string {
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
}