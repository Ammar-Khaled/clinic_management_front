import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DoctorService } from '../../services/doctor';
import { AppointmentService } from '../../services/appointment';
import { Slot } from '../../models/doctor.model';

@Component({
  selector: 'app-doctor-slots',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './doctor-slots.html',
  styleUrl: './doctor-slots.css',
})
export class DoctorSlotsComponent implements OnInit {
  doctorId!: number;
  slots: Slot[] = [];
  groupedSlots: { date: string; slots: Slot[] }[] = [];
  loading = true;
  booking = false;
  bookingSlotId: number | null = null;
  errorMsg = '';
  successMsg = '';

  // date range
  startDate = '';
  endDate = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private doctorService: DoctorService,
    private appointmentService: AppointmentService,
  ) {}

  ngOnInit(): void {
    this.doctorId = Number(this.route.snapshot.paramMap.get('doctorId'));
    this.setDefaultDates();
    this.loadSlots();
  }

  setDefaultDates(): void {
    const today = new Date();
    this.startDate = this.toDateString(today);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 13);
    this.endDate = this.toDateString(nextWeek);
  }

  loadSlots(): void {
    this.loading = true;
    this.errorMsg = '';
    this.doctorService.getDoctorSlots(this.doctorId, this.startDate, this.endDate).subscribe({
      next: (res) => {
        this.slots = res.slots.filter((s) => !s.is_booked);
        this.groupByDate();
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Failed to load slots.';
        this.loading = false;
      },
    });
  }

  groupByDate(): void {
    const map = new Map<string, Slot[]>();
    for (const slot of this.slots) {
      const date = slot.start_datetime.split('T')[0];
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(slot);
    }
    this.groupedSlots = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, slots]) => ({ date, slots }));
  }

  onDateChange(type: 'start' | 'end', value: string): void {
    const val = value || '';
    if (type === 'start') this.startDate = val;
    else this.endDate = val;
    this.loadSlots();
  }

  bookSlot(slot: Slot): void {
    this.booking = true;
    this.bookingSlotId = slot.id;
    this.errorMsg = '';
    this.successMsg = '';

    this.appointmentService.bookAppointment(slot.id).subscribe({
      next: (apt) => {
        // Cache the booking info for dashboard display
        this.appointmentService.cacheBooking(apt.id, {
          doctor_id: Number(this.route.snapshot.paramMap.get('id')) || 0,
          doctor_name: `Doctor #${this.doctorId}`,
          doctor_specialization: '',
          start_datetime: slot.start_datetime,
          end_datetime: slot.end_datetime,
          session_duration: 0,
        });
        this.successMsg = 'Appointment booked successfully!';
        this.booking = false;
        this.bookingSlotId = null;

        // Remove booked slot from view
        this.slots = this.slots.filter((s) => s.id !== slot.id);
        this.groupByDate();

        // Navigate after short delay
        setTimeout(() => {
          this.router.navigate(['/my-appointments']);
        }, 1500);
      },
      error: (err) => {
        this.booking = false;
        this.bookingSlotId = null;
        this.errorMsg = err.error?.error || 'Failed to book appointment. Please try again.';
      },
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private toDateString(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
