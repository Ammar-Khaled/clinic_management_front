import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DoctorService } from '../../services/doctor';
import { ReceptionistService } from '../../services/receptionist';
import { Doctor, DoctorException, Slot } from '../../models/doctor.model';

interface DaySlotGroup {
  date: string;
  label: string;
  isToday: boolean;
  exception: DoctorException | null;
  slots: Slot[];
}

@Component({
  selector: 'app-slots-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './slots-management.html',
  styleUrl: './slots-management.css',
})
export class SlotsManagementComponent implements OnInit {
  doctors: Doctor[] = [];
  selectedDoctorId: number | null = null;

  startDate = this.toDateStr(new Date());
  endDate = this.toDateStr(this.addDays(new Date(), 6));

  loadingDoctors = false;
  loadingSlots = false;
  regenerating = false;

  statusMessage = '';
  errorMessage = '';

  slots: Slot[] = [];
  exceptions: DoctorException[] = [];
  grouped: DaySlotGroup[] = [];

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

        if (this.selectedDoctorId) {
          this.loadSlots();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingDoctors = false;
        this.errorMessage = 'Failed to load doctors.';
        this.cdr.detectChanges();
      },
    });
  }

  loadSlots(): void {
    if (!this.selectedDoctorId) {
      this.grouped = [];
      this.slots = [];
      return;
    }

    this.loadingSlots = true;
    this.errorMessage = '';

    forkJoin({
      slotsRes: this.receptionistService.getDoctorSlots(this.selectedDoctorId, this.startDate, this.endDate),
      exceptionsRes: this.receptionistService.getDoctorExceptions(this.selectedDoctorId),
    }).subscribe({
      next: ({ slotsRes, exceptionsRes }) => {
        this.slots = slotsRes.slots;
        this.exceptions = exceptionsRes.exceptions;
        this.grouped = this.groupSlots(this.startDate, this.endDate, slotsRes.slots, exceptionsRes.exceptions);
        this.loadingSlots = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingSlots = false;
        this.slots = [];
        this.exceptions = [];
        this.grouped = [];
        this.errorMessage = 'Failed to load slots.';
        this.cdr.detectChanges();
      },
    });
  }

  regenerateForAllDoctors(): void {
    this.regenerating = true;
    this.statusMessage = '';
    this.errorMessage = '';

    this.receptionistService.regenerateNext7DaysSlots().subscribe({
      next: (res) => {
        this.regenerating = false;
        this.statusMessage = res.message;
        this.startDate = res.start_date;
        this.endDate = res.end_date;
        this.loadSlots();
        this.cdr.detectChanges();
      },
      error: () => {
        this.regenerating = false;
        this.errorMessage = 'Failed to regenerate slots for next 7 days.';
        this.cdr.detectChanges();
      },
    });
  }

  formatTime(value: string): string {
    const dateTimePart = value.includes('T') ? value.split('T')[1] : value;
    const match = dateTimePart.match(/(\d{2}):(\d{2})(?::\d{2})?/);

    if (!match) {
      return value;
    }

    const hours24 = Number(match[1]);
    const minutes = match[2];
    const meridiem = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;

    return `${hours12.toString().padStart(2, '0')}:${minutes} ${meridiem}`;
  }

  get totalCount(): number {
    return this.slots.length;
  }

  get bookedCount(): number {
    return this.slots.filter((slot) => slot.is_booked).length;
  }

  get availableCount(): number {
    return this.totalCount - this.bookedCount;
  }

  trackByDay(_: number, group: DaySlotGroup): string {
    return group.date;
  }

  trackBySlot(_: number, slot: Slot): number {
    return slot.id;
  }

  exceptionTypeLabel(type: string): string {
    return type === 'VACATION_DAY' ? 'Vacation Day' : 'Extra Working Day';
  }

  private groupSlots(startDate: string, endDate: string, slots: Slot[], exceptions: DoctorException[]): DaySlotGroup[] {
    const map = new Map<string, Slot[]>();
    const exceptionsMap = new Map<string, DoctorException>();

    for (const slot of slots) {
      const date = slot.start_datetime.split('T')[0];
      const current = map.get(date) || [];
      current.push(slot);
      map.set(date, current);
    }

    for (const item of exceptions) {
      exceptionsMap.set(item.date, item);
    }

    const groups: DaySlotGroup[] = [];
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const todayStr = this.toDateStr(new Date());

    for (let date = new Date(start); date <= end; date = this.addDays(date, 1)) {
      const key = this.toDateStr(date);
      const daySlots = (map.get(key) || []).sort(
        (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
      );

      groups.push({
        date: key,
        label: this.formatDayHeader(date),
        isToday: key === todayStr,
        exception: exceptionsMap.get(key) || null,
        slots: daySlots,
      });
    }

    return groups;
  }

  private formatDayHeader(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  private addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  private toDateStr(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
