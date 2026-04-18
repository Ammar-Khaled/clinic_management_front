import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
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

  constructor(
    private appointmentService: AppointmentService,
    private cdr: ChangeDetectorRef,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.loadAppointments();
  }

  goBack(): void {
    this.location.back();
  }

  loadAppointments(): void {
    this.loading = true;
    this.errorMsg = '';
    this.cdr.detectChanges();

    this.appointmentService.getMyAppointments().subscribe({
      next: (data) => {
        this.appointments = data;
        this.applyFilter();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMsg = 'Failed to load appointments. Please check your connection and try again.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  setFilter(value: string): void {
    this.activeFilter = value;
    this.applyFilter();
  }
private parseEgyptDate(dateStr: string): Date {
  if (!dateStr) return new Date();

  return new Date(
    dateStr
      .replace('Z', '')   // remove UTC shift
      .replace(' ', 'T')  // fix Django format
  );
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

  getCountForFilter(value: string): number {
    return this.appointments.filter((a) => a.status === value).length;
  }

  getActiveFilterLabel(): string {
    const found = this.filters.find((f) => f.value === this.activeFilter);
    return found ? found.label : '';
  }

  getUpcomingAppointments(): Appointment[] {
    if (this.activeFilter !== 'ALL') return [];
    const upcomingStatuses = ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'];
    return this.appointments.filter((a) => upcomingStatuses.includes(a.status));
  }

  getPastAppointments(): Appointment[] {
    if (this.activeFilter !== 'ALL') return [];
    const pastStatuses = ['COMPLETED', 'CANCELLED', 'NO_SHOW'];
    return this.appointments.filter((a) => pastStatuses.includes(a.status));
  }

  getInitials(name: string | undefined): string {
    if (!name) return '??';
    return name
      .split(' ')
      .filter((n) => n.length > 0)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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

  getStatusBadgeColor(status: string): string {
    const colors: Record<string, string> = {
      SCHEDULED: 'bg-slate-100 text-slate-600',
      CONFIRMED: 'bg-secondary/10 text-secondary',
      CHECKED_IN: 'bg-amber-100 text-amber-700',
      COMPLETED: 'bg-blue-50 text-blue-700',
      CANCELLED: 'bg-error-container text-error',
      NO_SHOW: 'bg-error-container/50 text-error',
    };
    return colors[status] || 'bg-slate-100 text-slate-500';
  }

  getStatusDotColor(status: string): string {
    const colors: Record<string, string> = {
      SCHEDULED: 'bg-slate-400',
      CONFIRMED: 'bg-secondary',
      CHECKED_IN: 'bg-amber-500',
      COMPLETED: 'bg-secondary',
      CANCELLED: 'bg-error',
      NO_SHOW: 'bg-slate-300',
    };
    return colors[status] || 'bg-slate-300';
  }

  getStatusTextColor(status: string): string {
    const colors: Record<string, string> = {
      SCHEDULED: 'text-slate-500',
      CONFIRMED: 'text-secondary',
      CHECKED_IN: 'text-amber-600',
      COMPLETED: 'text-secondary',
      CANCELLED: 'text-error',
      NO_SHOW: 'text-slate-400',
    };
    return colors[status] || 'text-slate-400';
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
  // Use raw string processing to match backend format exactly
  if (dateStr.includes('T')) {
    return dateStr.split('T')[1].substring(0, 5);
  }
  return dateStr.substring(0, 5).replace('T', ' ');
}
}