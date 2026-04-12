import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AppointmentService } from '../../services/appointment';
import { Appointment, Consultation } from '../../models/appointment.model';

@Component({
  selector: 'app-appointment-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appointment-detail.html',
  styleUrl: './appointment-detail.css',
})
export class AppointmentDetailComponent implements OnInit {
  appointment: Appointment | null = null;
  consultation: Consultation | null = null;
  loading = true;
  consultationLoading = false;
  errorMsg = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private appointmentService: AppointmentService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('appointmentId'));
    this.loadAppointment(id);
  }

  loadAppointment(id: number): void {
    this.appointmentService.getAppointmentDetail(id).subscribe({
      next: (data) => {
        this.appointment = data;
        this.loading = false;
        if (data.status === 'COMPLETED') {
          this.loadConsultation(id);
        }
      },
      error: () => {
        this.errorMsg = 'Failed to load appointment.';
        this.loading = false;
      },
    });
  }

  loadConsultation(appointmentId: number): void {
    this.consultationLoading = true;
    this.appointmentService.getConsultation(appointmentId).subscribe({
      next: (data) => {
        this.consultation = data;
        this.consultationLoading = false;
      },
      error: () => {
        this.consultationLoading = false;
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
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

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    });
  }
}