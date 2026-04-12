import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppointmentService } from '../../services/appointment';
import { Appointment } from '../../models/appointment.model';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-appointments.html',
  styleUrl: './my-appointments.css',
})
export class MyAppointmentsComponent implements OnInit {
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  loading = true;
  errorMsg = '';
  activeFilter = 'ALL';

  filters = [
    { label: 'All', value: 'ALL' },
    { label: 'Scheduled', value: 'SCHEDULED' },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  constructor(private appointmentService: AppointmentService) {}

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.loading = true;
    this.appointmentService.getMyAppointments().subscribe({
      next: (data) => {
        this.appointments = data;
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Failed to load appointments.';
        this.loading = false;
      },
    });
  }

  setFilter(value: string): void {
    this.activeFilter = value;
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.activeFilter === 'ALL') {
      this.filteredAppointments = this.appointments;
    } else {
      this.filteredAppointments = this.appointments.filter(
        (a) => a.status === this.activeFilter
      );
    }
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      SCHEDULED: 'bg-surface-container-highest text-slate-600',
      CONFIRMED: 'bg-secondary-fixed/30 text-on-secondary-fixed-variant',
      CHECKED_IN: 'bg-tertiary-fixed/30 text-on-tertiary-fixed-variant',
      COMPLETED: 'bg-blue-100 text-blue-700',
      CANCELLED: 'bg-error-container text-on-error-container',
      NO_SHOW: 'bg-error-container/50 text-error',
    };
    return colors[status] || 'bg-slate-100 text-slate-500';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      SCHEDULED: 'pending',
      CONFIRMED: 'event_available',
      CHECKED_IN: 'how_to_reg',
      COMPLETED: 'check_circle',
      CANCELLED: 'cancel',
      NO_SHOW: 'person_off',
    };
    return icons[status] || 'help';
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
}