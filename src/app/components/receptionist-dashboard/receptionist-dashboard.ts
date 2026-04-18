import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DoctorService } from '../../services/doctor';
import { ReceptionistService } from '../../services/receptionist';
import { AppointmentService } from '../../services/appointment';
import { AuthService } from '../../services/auth';
import { Doctor, DoctorAvailability, Slot } from '../../models/doctor.model';
import { AppointmentListItem } from '../../models/appointment.model';
import { DailyAppointmentsTableComponent } from './dashboard-widgets/daily-appointments-table';
import { CheckInCardComponent } from './dashboard-widgets/check-in-card';
import {
  RescheduleCardComponent,
  RescheduleSlotsQuery,
  RescheduleSubmitPayload,
} from './dashboard-widgets/reschedule-card';
import { StatCardComponent } from './dashboard-widgets/stat-card';

@Component({
  selector: 'app-receptionist-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DailyAppointmentsTableComponent,
    CheckInCardComponent,
    RescheduleCardComponent,
    StatCardComponent,
  ],
  templateUrl: './receptionist-dashboard.html',
  styleUrl: './receptionist-dashboard.css',
})
export class ReceptionistDashboardComponent implements OnInit {
  doctors: Doctor[] = [];
  appointments: AppointmentListItem[] = [];
  appointmentFilterOptions: AppointmentListItem[] = [];
  selectedAppointmentFilterId: number | null = null;
  selectedDoctorId: number | null = null;
  selectedStatus = 'ALL';
  selectedDate = this.toDateStr(new Date());
  searchText = '';
  focusAppointmentForReschedule: number | null = null;
  focusRescheduleDoctorId: number | null = null;
  focusRescheduleDate: string | null = null;

  today = this.toDateStr(new Date());
  endDate = this.toDateStr(this.addDays(new Date(), 7));

  availability: DoctorAvailability[] = [];
  rescheduleSlots: Slot[] = [];

  loadingDoctors = false;
  loadingAppointments = false;
  loadingAvailability = false;
  loadingRescheduleSlots = false;
  loadingQueue = false;
  actionBusy = false;
  checkInBusy = false;

  successMessage = '';
  errorMessage = '';
  auditTrailMessage = '';
  checkedInQueue: Array<{
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
  }> = [];

  readonly statusOptions = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'SCHEDULED', label: 'Pending Confirmation' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'CHECKED_IN', label: 'Checked-In' },
    { value: 'NO_SHOW', label: 'No Show' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'COMPLETED', label: 'Completed' },
  ];

  constructor(
    private doctorService: DoctorService,
    private receptionistService: ReceptionistService,
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDoctors();
    this.loadAppointmentFilterOptions();
    this.loadAppointments();
  }

  loadDoctors(): void {
    this.loadingDoctors = true;

    this.doctorService.getAllDoctors().subscribe({
      next: (res) => {
        this.doctors = res.doctors;
        // Only set default if no doctor is currently selected
        if (!this.selectedDoctorId && this.doctors.length > 0) {
          this.selectedDoctorId = this.doctors[0].id;
        }
        this.loadingDoctors = false;
        this.cdr.detectChanges();
        this.loadDoctorAvailability();
        this.loadCheckedInQueue();
      },
      error: () => {
        this.loadingDoctors = false;
        this.errorMessage = 'Failed to load doctors.';
        this.cdr.detectChanges();
      },
    });
  }

  onFiltersChanged(): void {
    this.selectedAppointmentFilterId = null;
    this.refreshData();
  }

  onAppointmentFilterChanged(): void {
    this.loadAppointments();
  }

  refreshData(): void {
    this.loadAppointmentFilterOptions();
    this.loadAppointments();
    this.loadDoctorAvailability();
    this.loadCheckedInQueue();
  }

  loadAppointments(): void {
    this.loadingAppointments = true;
    this.errorMessage = '';
    this.cdr.detectChanges(); // Ensure spinner shows up immediately

    const trimmedSearch = this.searchText.trim();
    const appointmentId = Number(trimmedSearch);
    const appointmentIdFilter =
      this.selectedAppointmentFilterId ||
      (trimmedSearch && !Number.isNaN(appointmentId) ? appointmentId : undefined);

    this.appointmentService
      .listAppointments({
        doctorId: this.selectedDoctorId || undefined,
        from: this.selectedDate,
        to: this.selectedDate,
        status: this.selectedStatus !== 'ALL' ? this.selectedStatus : undefined,
        patientName:
          !appointmentIdFilter && trimmedSearch && Number.isNaN(appointmentId)
            ? trimmedSearch
            : undefined,
        appointmentId: appointmentIdFilter,
      })
      .subscribe({
        next: (res) => {
          this.appointments = res.appointments.filter((item) => item.slot !== null);
          this.loadingAppointments = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingAppointments = false;
          this.errorMessage = 'Failed to load appointments.';
          this.cdr.detectChanges();
        },
      });
  }

  loadAppointmentFilterOptions(): void {
    this.appointmentService
      .listAppointments({
        doctorId: this.selectedDoctorId || undefined,
        from: this.selectedDate,
        to: this.selectedDate,
      })
      .subscribe({
        next: (res) => {
          this.appointmentFilterOptions = res.appointments.filter((item) => item.slot !== null);

          if (
            this.selectedAppointmentFilterId &&
            !this.appointmentFilterOptions.some(
              (item) => item.id === this.selectedAppointmentFilterId,
            )
          ) {
            this.selectedAppointmentFilterId = null;
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.appointmentFilterOptions = [];
          this.cdr.detectChanges();
        },
      });
  }

  loadDoctorAvailability(): void {
    if (!this.selectedDoctorId) {
      this.availability = [];
      return;
    }

    this.loadingAvailability = true;

    this.receptionistService.getDoctorAvailability(this.selectedDoctorId).subscribe({
      next: (res) => {
        this.availability = [...res.availabilities].sort(
          (a, b) => Number(a.day_of_week) - Number(b.day_of_week),
        );
        this.loadingAvailability = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingAvailability = false;
        this.errorMessage = 'Failed to load doctor availability.';
        this.cdr.detectChanges();
      },
    });
  }

  confirmAppointment(appointmentId: number): void {
    this.actionBusy = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.appointmentService.confirmAppointment(appointmentId).subscribe({
      next: () => {
        this.actionBusy = false;
        this.successMessage = `Appointment #${appointmentId} confirmed.`;
        this.cdr.detectChanges();
        this.loadAppointments();
        this.loadCheckedInQueue();
      },
      error: () => {
        this.actionBusy = false;
        this.errorMessage = `Failed to confirm appointment #${appointmentId}.`;
        this.cdr.detectChanges();
      },
    });
  }

  checkInAppointment(appointmentId: number): void {
    this.checkInBusy = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.appointmentService.checkInAppointment(appointmentId).subscribe({
      next: () => {
        this.checkInBusy = false;
        this.successMessage = `Patient checked in for appointment #${appointmentId}.`;
        this.cdr.detectChanges();
        this.loadAppointments();
        this.loadCheckedInQueue();
      },
      error: () => {
        this.checkInBusy = false;
        this.errorMessage = `Failed to check in appointment #${appointmentId}.`;
        this.cdr.detectChanges();
      },
    });
  }

  noShowAppointment(appointmentId: number): void {
    this.actionBusy = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.appointmentService.noShowAppointment(appointmentId).subscribe({
      next: () => {
        this.actionBusy = false;
        this.successMessage = `Appointment #${appointmentId} marked as no-show.`;
        this.cdr.detectChanges();
        this.loadAppointments();
        this.loadCheckedInQueue();
      },
      error: () => {
        this.actionBusy = false;
        this.errorMessage = `Failed to mark appointment #${appointmentId} as no-show.`;
        this.cdr.detectChanges();
      },
    });
  }

  cancelAppointment(appointmentId: number): void {
    const reason = window.prompt('Cancellation reason (required):', 'Administrative cancellation');
    if (!reason || !reason.trim()) {
      return;
    }

    this.actionBusy = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.appointmentService.cancelAppointment(appointmentId, reason.trim()).subscribe({
      next: () => {
        this.actionBusy = false;
        this.successMessage = `Appointment #${appointmentId} cancelled.`;
        this.cdr.detectChanges();
        this.loadAppointments();
        this.loadCheckedInQueue();
      },
      error: () => {
        this.actionBusy = false;
        this.errorMessage = `Failed to cancel appointment #${appointmentId}.`;
        this.cdr.detectChanges();
      },
    });
  }

  requestRescheduleSlots(query: RescheduleSlotsQuery): void {
    this.loadingRescheduleSlots = true;
    this.rescheduleSlots = [];

    this.receptionistService.getDoctorSlots(query.doctorId, query.date, query.date).subscribe({
      next: (res) => {
        this.rescheduleSlots = res.slots.filter((slot) => !slot.is_booked);
        this.loadingRescheduleSlots = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingRescheduleSlots = false;
        this.errorMessage = 'Failed to load available slots for reschedule.';
        this.cdr.detectChanges();
      },
    });
  }

  submitReschedule(payload: RescheduleSubmitPayload): void {
    this.actionBusy = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.appointmentService
      .rescheduleAppointment(payload.appointmentId, payload.newSlotId, payload.reason)
      .subscribe({
        next: () => {
          const oldAppointment = this.reschedulableAppointments.find(
            (item) => item.id === payload.appointmentId,
          );
          const newSlot = this.rescheduleSlots.find((slot) => slot.id === payload.newSlotId);

          this.auditTrailMessage = this.buildAuditMessage(oldAppointment, newSlot, payload.reason);
          this.successMessage = `Appointment #${payload.appointmentId} moved successfully.`;
          this.actionBusy = false;
          this.cdr.detectChanges();
          this.refreshData(); // Unified refresh
        },
        error: () => {
          this.actionBusy = false;
          this.errorMessage = `Failed to reschedule appointment #${payload.appointmentId}.`;
          this.cdr.detectChanges();
        },
      });
  }

  prepareReschedule(appointmentId: number): void {
    this.focusAppointmentForReschedule = appointmentId;

    const appointment = this.reschedulableAppointments.find((item) => item.id === appointmentId);
    this.focusRescheduleDoctorId = appointment?.slot?.doctor_id || null;
    this.focusRescheduleDate = appointment?.slot?.start_datetime
      ? appointment.slot.start_datetime.split('T')[0]
      : null;

    if (this.focusRescheduleDoctorId && this.focusRescheduleDate) {
      this.requestRescheduleSlots({
        doctorId: this.focusRescheduleDoctorId,
        date: this.focusRescheduleDate,
      });
    }
  }

  loadCheckedInQueue(): void {
    if (!this.selectedDoctorId) {
      this.checkedInQueue = [];
      return;
    }

    this.loadingQueue = true;
    this.appointmentService
      .getQueueTodayForDoctor(this.selectedDoctorId, this.selectedDate)
      .subscribe({
        next: (res) => {
          this.checkedInQueue = res.queue;
          this.loadingQueue = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.checkedInQueue = [];
          this.loadingQueue = false;
          this.cdr.detectChanges();
        },
      });
  }

  get totalAppointments(): number {
    return this.appointments.length;
  }

  get confirmedAppointments(): number {
    return this.appointments.filter((item) => item.status === 'CONFIRMED').length;
  }

  get checkedInAppointments(): number {
    return this.appointments.filter((item) => item.status === 'CHECKED_IN').length;
  }

  get selectedDoctor(): Doctor | null {
    return this.doctors.find((doc) => doc.id === this.selectedDoctorId) || null;
  }

  get checkInCandidates(): AppointmentListItem[] {
    return this.appointments.filter(
      (item) => item.status === 'SCHEDULED' || item.status === 'CONFIRMED',
    );
  }

  get reschedulableAppointments(): AppointmentListItem[] {
    return this.appointments.filter(
      (item) => item.status === 'SCHEDULED' || item.status === 'CONFIRMED',
    );
  }

  dayLabel(day: number): string {
    const labels: Record<number, string> = {
      0: 'Saturday',
      1: 'Sunday',
      2: 'Monday',
      3: 'Tuesday',
      4: 'Wednesday',
      5: 'Thursday',
      6: 'Friday',
    };
    return labels[day] || '-';
  }

  doctorDisplayName(doctor: Doctor | null | undefined): string {
    if (!doctor) return 'Unknown Doctor';
    const name = `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim();
    return name ? `Dr. ${name} (#${doctor.id})` : `Doctor #${doctor.id}`;
  }

  receptionistName(): string {
    return 'Reception Desk';
  }

  receptionistAvatar(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.receptionistName())}&background=e8eaf6&color=3f51b5&bold=true&size=64`;
  }

  logout(): void {
    this.authService.logout();
  }

  trackByAvailabilityId(_: number, availability: DoctorAvailability): number {
    return availability.id;
  }

  private buildAuditMessage(
    appointment: AppointmentListItem | undefined,
    slot: Slot | undefined,
    reason: string,
  ): string {
    const oldTime = appointment?.slot?.start_datetime
      ? (appointment.slot.start_datetime.includes('T') 
          ? appointment.slot.start_datetime.split('T')[1].substring(0, 5)
          : appointment.slot.start_datetime.substring(0, 5))
      : 'unknown';

    const newTime = slot?.start_datetime
      ? (slot.start_datetime.includes('T')
          ? slot.start_datetime.split('T')[1].substring(0, 5)
          : slot.start_datetime.substring(0, 5))
      : 'unknown';

    return `Audit trail entry: APT-${appointment?.id ?? 'N/A'} moved from ${oldTime} to ${newTime} (Reason: ${reason})`;
  }

  private addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  private toDateStr(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
