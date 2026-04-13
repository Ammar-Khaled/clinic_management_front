import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DoctorService } from '../../services/doctor';
import { ReceptionistService } from '../../services/receptionist';
import { Doctor, DoctorAvailability, Slot } from '../../models/doctor.model';

@Component({
  selector: 'app-receptionist-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './receptionist-dashboard.html',
  styleUrl: './receptionist-dashboard.css',
})
export class ReceptionistDashboardComponent implements OnInit {
  doctors: Doctor[] = [];
  selectedDoctorId: number | null = null;

  today = this.toDateStr(new Date());
  endDate = this.toDateStr(this.addDays(new Date(), 6));

  availability: DoctorAvailability[] = [];
  slots: Slot[] = [];

  loadingDoctors = false;
  loadingAvailability = false;
  loadingSlots = false;
  regenerating = false;

  statusMessage = '';
  errorMessage = '';

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
    this.errorMessage = '';

    this.doctorService.getAllDoctors().subscribe({
      next: (res) => {
        console.log('DoctorService.getAllDoctors response:', res);
        this.doctors = res.doctors;
        this.selectedDoctorId = this.doctors.length > 0 ? this.doctors[0].id : null;
        this.loadingDoctors = false;
        this.refreshDoctorPanels();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('DoctorService.getAllDoctors error:', err);
        this.loadingDoctors = false;
        this.errorMessage = 'Failed to load doctors.';
        this.cdr.detectChanges();
      },
    });
  }

  refreshDoctorPanels(): void {
    if (!this.selectedDoctorId) {
      this.availability = [];
      this.slots = [];
      return;
    }

    this.loadAvailability(this.selectedDoctorId);
    this.loadSlots(this.selectedDoctorId);
  }

  loadAvailability(doctorId: number): void {
    this.loadingAvailability = true;

    this.receptionistService.getDoctorAvailability(doctorId).subscribe({
      next: (res) => {
        console.log('ReceptionistService.getDoctorAvailability response:', res);
        this.availability = [...res.availabilities].sort(
          (a, b) => Number(a.day_of_week) - Number(b.day_of_week)
        );
        this.loadingAvailability = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('ReceptionistService.getDoctorAvailability error:', err);
        this.loadingAvailability = false;
        this.errorMessage = 'Failed to load doctor availability.';
        this.cdr.detectChanges();
      },
    });
  }

  loadSlots(doctorId: number): void {
    this.loadingSlots = true;

    this.receptionistService.getDoctorSlots(doctorId, this.today, this.endDate).subscribe({
      next: (res) => {
        console.log('ReceptionistService.getDoctorSlots response:', res);
        this.slots = res.slots;
        this.loadingSlots = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('ReceptionistService.getDoctorSlots error:', err);
        this.slots = [];
        this.loadingSlots = false;
        this.errorMessage = 'Failed to load slots.';
        this.cdr.detectChanges();
      },
    });
  }

  regenerateAllDoctorsSlots(): void {
    this.regenerating = true;
    this.statusMessage = '';
    this.errorMessage = '';

    this.receptionistService.regenerateNext7DaysSlots().subscribe({
      next: (res) => {
        console.log('ReceptionistService.regenerateNext7DaysSlots response:', res);
        this.regenerating = false;
        this.statusMessage = res.message;
        this.today = res.start_date;
        this.endDate = res.end_date;
        this.refreshDoctorPanels();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('ReceptionistService.regenerateNext7DaysSlots error:', err);
        this.regenerating = false;
        this.errorMessage = 'Failed to regenerate slots for all doctors.';
        this.cdr.detectChanges();
      },
    });
  }

  get selectedDoctor(): Doctor | null {
    return this.doctors.find((doc) => doc.id === this.selectedDoctorId) || null;
  }

  get totalSlots(): number {
    return this.slots.length;
  }

  get bookedSlots(): number {
    return this.slots.filter((slot) => slot.is_booked).length;
  }

  get availableSlots(): number {
    return this.totalSlots - this.bookedSlots;
  }

  get visibleSlots(): Slot[] {
    return this.slots.slice(0, 12);
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

  formatSlotTime(dateTime: string): string {
    const dateTimePart = dateTime.includes('T') ? dateTime.split('T')[1] : dateTime;
    const match = dateTimePart.match(/(\d{2}):(\d{2})(?::\d{2})?/);

    if (!match) {
      return dateTime;
    }

    const hours24 = Number(match[1]);
    const minutes = match[2];
    const meridiem = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;

    return `${hours12.toString().padStart(2, '0')}:${minutes} ${meridiem}`;
  }

  formatSlotDate(dateTime: string): string {
    return new Date(dateTime).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  trackBySlotId(_: number, slot: Slot): number {
    return slot.id;
  }

  trackByAvailabilityId(_: number, availability: DoctorAvailability): number {
    return availability.id;
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
