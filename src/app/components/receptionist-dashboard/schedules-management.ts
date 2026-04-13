import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DoctorService } from '../../services/doctor';
import { ReceptionistService } from '../../services/receptionist';
import {
  CreateDoctorAvailabilityRequest,
  CreateDoctorExceptionRequest,
  DayOfWeek,
  Doctor,
  DoctorAvailability,
  DoctorException,
  DoctorExceptionType,
} from '../../models/doctor.model';

interface WeekdayRow {
  day_of_week: DayOfWeek;
  label: string;
  start_time: string;
  end_time: string;
}

@Component({
  selector: 'app-schedules-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './schedules-management.html',
  styleUrl: './schedules-management.css',
})
export class SchedulesManagementComponent implements OnInit {
  doctors: Doctor[] = [];
  selectedDoctorId: number | null = null;

  loadingDoctors = false;
  loadingAvailabilities = false;
  savingSchedule = false;
  updatingAvailabilityId: number | null = null;
  deletingAllAvailabilities = false;

  scheduleMessage = '';
  scheduleError = '';

  similarWeekdays = true;
  uniformStartTime = '08:00';
  uniformEndTime = '16:00';

  weekdayRows: WeekdayRow[] = [
    { day_of_week: DayOfWeek.SUNDAY, label: 'Sunday', start_time: '08:00', end_time: '16:00' },
    { day_of_week: DayOfWeek.MONDAY, label: 'Monday', start_time: '08:00', end_time: '16:00' },
    { day_of_week: DayOfWeek.TUESDAY, label: 'Tuesday', start_time: '08:00', end_time: '16:00' },
    { day_of_week: DayOfWeek.WEDNESDAY, label: 'Wednesday', start_time: '08:00', end_time: '16:00' },
    { day_of_week: DayOfWeek.THURSDAY, label: 'Thursday', start_time: '08:00', end_time: '16:00' },
  ];

  currentAvailabilities: DoctorAvailability[] = [];

  exceptionDate = this.toDateStr(new Date());
  exceptionType: DoctorExceptionType = 'VACATION_DAY';
  exceptionStartTime = '09:00';
  exceptionEndTime = '12:30';
  creatingException = false;
  exceptionMessage = '';
  exceptionError = '';

  currentExceptions: DoctorException[] = [];
  loadingExceptions = false;

  deleteExceptionId: number | null = null;
  deletingException = false;

  constructor(
    private doctorService: DoctorService,
    private receptionistService: ReceptionistService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDoctors();
  }

  loadDoctors(): void {
    this.loadingDoctors = true;

    this.doctorService.getAllDoctors().subscribe({
      next: (res) => {
        this.doctors = res.doctors;
        this.selectedDoctorId = this.doctors.length > 0 ? this.doctors[0].id : null;
        this.loadingDoctors = false;
        this.loadDoctorAvailability();
        this.loadDoctorExceptions();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingDoctors = false;
        this.scheduleError = 'Failed to load doctors.';
        this.cdr.detectChanges();
      },
    });
  }

  onDoctorChanged(): void {
    this.resetMessages();
    this.loadDoctorAvailability();
    this.loadDoctorExceptions();
  }

  loadDoctorAvailability(): void {
    if (!this.selectedDoctorId) {
      this.currentAvailabilities = [];
      return;
    }

    this.loadingAvailabilities = true;

    this.receptionistService.getDoctorAvailability(this.selectedDoctorId).subscribe({
      next: (res) => {
        this.currentAvailabilities = [...res.availabilities]
          .map((item) => ({
            ...item,
            start_time: item.start_time.slice(0, 5),
            end_time: item.end_time.slice(0, 5),
          }))
          .sort((a, b) => Number(a.day_of_week) - Number(b.day_of_week));
        this.hydrateScheduleFormFromApi();
        this.loadingAvailabilities = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.currentAvailabilities = [];
        this.loadingAvailabilities = false;
        this.scheduleError = 'Failed to load availabilities.';
        this.cdr.detectChanges();
      },
    });
  }

  loadDoctorExceptions(): void {
    if (!this.selectedDoctorId) {
      this.currentExceptions = [];
      this.deleteExceptionId = null;
      return;
    }

    this.loadingExceptions = true;
    this.exceptionError = '';

    this.receptionistService.getDoctorExceptions(this.selectedDoctorId).subscribe({
      next: (res) => {
        this.currentExceptions = [...res.exceptions].sort((a, b) => a.date.localeCompare(b.date));
        this.loadingExceptions = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.currentExceptions = [];
        this.loadingExceptions = false;
        this.exceptionError = 'Failed to load exceptions.';
        this.cdr.detectChanges();
      },
    });
  }

  saveWeeklySchedule(): void {
    if (!this.selectedDoctorId) {
      this.scheduleError = 'Select a doctor first.';
      return;
    }

    const payload: CreateDoctorAvailabilityRequest = this.similarWeekdays
      ? {
          similar_weekdays: 'true',
          availability: [
            {
              start_time: this.uniformStartTime,
              end_time: this.uniformEndTime,
            },
          ],
        }
      : {
          similar_weekdays: 'false',
          availability: this.weekdayRows.map((row) => ({
            day_of_week: String(row.day_of_week),
            start_time: row.start_time,
            end_time: row.end_time,
          })),
        };

    this.savingSchedule = true;
    this.resetMessages();

    this.receptionistService.createDoctorAvailability(this.selectedDoctorId, payload).subscribe({
      next: (res) => {
        this.savingSchedule = false;
        this.scheduleMessage = res.message;
        this.loadDoctorAvailability();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingSchedule = false;
        this.scheduleError = err?.error?.message || 'Failed to save schedule.';
        this.cdr.detectChanges();
      },
    });
  }

  updateAvailability(item: DoctorAvailability): void {
    if (!this.selectedDoctorId) {
      this.scheduleError = 'Select a doctor first.';
      return;
    }

    this.updatingAvailabilityId = item.id;
    this.resetMessages();

    this.receptionistService
      .updateDoctorAvailability(this.selectedDoctorId, item.id, {
        availability: [
          {
            start_time: item.start_time,
            end_time: item.end_time,
          },
        ],
      })
      .subscribe({
        next: (res) => {
          this.updatingAvailabilityId = null;
          this.scheduleMessage = res.message;
          this.loadDoctorAvailability();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.updatingAvailabilityId = null;
          this.scheduleError = err?.error?.message || 'Failed to update availability row.';
          this.cdr.detectChanges();
        },
      });
  }

  deleteAllAvailabilities(): void {
    if (!this.selectedDoctorId) {
      this.scheduleError = 'Select a doctor first.';
      return;
    }

    this.deletingAllAvailabilities = true;
    this.resetMessages();

    this.receptionistService.deleteAllDoctorAvailabilities(this.selectedDoctorId).subscribe({
      next: (res) => {
        this.deletingAllAvailabilities = false;
        this.scheduleMessage = res.message;
        this.currentAvailabilities = [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.deletingAllAvailabilities = false;
        this.scheduleError = err?.error?.message || 'Failed to delete availabilities.';
        this.cdr.detectChanges();
      },
    });
  }

  applyException(): void {
    if (!this.selectedDoctorId) {
      this.exceptionError = 'Select a doctor first.';
      return;
    }

    const payload: CreateDoctorExceptionRequest = {
      date: this.exceptionDate,
      type: this.exceptionType,
    };

    if (this.exceptionType === 'EXTRA_WORKING_DAY') {
      payload.start_time = this.exceptionStartTime;
      payload.end_time = this.exceptionEndTime;
    }

    this.creatingException = true;
    this.exceptionError = '';
    this.exceptionMessage = '';

    this.receptionistService.createDoctorException(this.selectedDoctorId, payload).subscribe({
      next: (res) => {
        this.creatingException = false;
        this.exceptionMessage = res.message;
        this.loadDoctorExceptions();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.creatingException = false;
        this.exceptionError = err?.error?.message || 'Failed to apply exception.';
        this.cdr.detectChanges();
      },
    });
  }

  removeExceptionById(): void {
    if (!this.selectedDoctorId) {
      this.exceptionError = 'Select a doctor first.';
      return;
    }
    if (!this.deleteExceptionId) {
      this.exceptionError = 'Enter exception ID first.';
      return;
    }

    this.deletingException = true;
    this.exceptionError = '';
    this.exceptionMessage = '';

    this.receptionistService.deleteDoctorException(this.selectedDoctorId, this.deleteExceptionId).subscribe({
      next: (res) => {
        this.deletingException = false;
        this.exceptionMessage = res.message;
        this.deleteExceptionId = null;
        this.loadDoctorExceptions();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.deletingException = false;
        this.exceptionError = err?.error?.message || 'Failed to delete exception.';
        this.cdr.detectChanges();
      },
    });
  }

  isExtraWorkingDay(): boolean {
    return this.exceptionType === 'EXTRA_WORKING_DAY';
  }

  trackByAvailabilityId(_: number, item: DoctorAvailability): number {
    return item.id;
  }

  trackByExceptionId(_: number, item: DoctorException): number {
    return item.id;
  }

  formatExceptionTime(value: string | null): string {
    return value ? value.slice(0, 5) : '-';
  }

  private hydrateScheduleFormFromApi(): void {
    const weekRows = this.weekdayRows;

    weekRows.forEach((row) => {
      const existing = this.currentAvailabilities.find(
        (item) => Number(item.day_of_week) === Number(row.day_of_week)
      );

      if (existing) {
        row.start_time = existing.start_time.slice(0, 5);
        row.end_time = existing.end_time.slice(0, 5);
      }
    });

    const representedRows = weekRows.filter((row) =>
      this.currentAvailabilities.some(
        (item) => Number(item.day_of_week) === Number(row.day_of_week)
      )
    );

    if (representedRows.length >= 1) {
      const start = representedRows[0].start_time;
      const end = representedRows[0].end_time;
      const allSame = representedRows.every(
        (row) => row.start_time === start && row.end_time === end
      );

      this.similarWeekdays = allSame;
      this.uniformStartTime = start;
      this.uniformEndTime = end;
    }
  }

  private resetMessages(): void {
    this.scheduleMessage = '';
    this.scheduleError = '';
  }

  private toDateStr(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
