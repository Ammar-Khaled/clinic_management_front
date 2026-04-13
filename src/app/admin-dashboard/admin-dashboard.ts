import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export interface DailyAppointmentStat {
  day: string;
  percentage: number;
}

export interface AppointmentStatusStat {
  status: string;
  percentage: number;
  hexCode: string;
}

export interface AppointmentsAnalytics {
  growthPercentage: number;
  volume: DailyAppointmentStat[];
  statuses: AppointmentStatusStat[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  private http = inject(HttpClient);
  users = signal<User[]>([]);

  appointmentsPerDay = signal<DailyAppointmentStat[]>([
    { day: 'Mon', percentage: 40 },
    { day: 'Tue', percentage: 65 },
    { day: 'Wed', percentage: 95 },
    { day: 'Thu', percentage: 55 },
    { day: 'Fri', percentage: 80 },
    { day: 'Sat', percentage: 20 },
    { day: 'Sun', percentage: 15 }
  ]);
  
  appointmentStatuses = signal<AppointmentStatusStat[]>([
    { status: 'Requested', percentage: 15, hexCode: '#3b82f6' },
    { status: 'Confirmed', percentage: 20, hexCode: '#0ea5e9' },
    { status: 'Checked In', percentage: 20, hexCode: '#10b981' },
    { status: 'Completed', percentage: 30, hexCode: '#059669' },
    { status: 'Cancelled', percentage: 10, hexCode: '#ef4444' },
    { status: 'No Show', percentage: 5, hexCode: '#64748b' }
  ]);
  
  growthPercentage = signal<number>(12);

  pieChartString = computed(() => {
    let current = 0;
    const gradientParts = this.appointmentStatuses().map(stat => {
      const start = current;
      const end = current + stat.percentage;
      current = end;
      return `${stat.hexCode} ${start}% ${end}%`;
    });
    return gradientParts.length ? `conic-gradient(${gradientParts.join(', ')})` : 'conic-gradient(#e2e8f0 0 100%)';
  });

  ngOnInit() {
    this.http.get<User[]>('http://localhost:8000/users').subscribe({
      next: (data) => this.users.set(data),
      error: (err) => console.error('Error fetching users:', err)
    });

    this.http.get<AppointmentsAnalytics>('http://localhost:8000/appointments').subscribe({
      next: (data) => {
        if (data.volume) this.appointmentsPerDay.set(data.volume);
        if (data.statuses) this.appointmentStatuses.set(data.statuses);
        if (data.growthPercentage !== undefined) this.growthPercentage.set(data.growthPercentage);
      },
      error: (err) => console.warn('Using fallback data. Error fetching analytics API:', err)
    });
  }

  getRoleClasses(role: string | undefined): string {
    const baseClasses = 'px-2.5 py-1 text-[10px] font-bold rounded-md uppercase';
    const normalizedRole = role?.toLowerCase()?.trim() || '';
    
    switch (normalizedRole) {
      case 'admin':
        return `${baseClasses} bg-purple-100 text-purple-700`;
      case 'doctor':
        return `${baseClasses} bg-emerald-100 text-emerald-700`;
      case 'patient':
        return `${baseClasses} bg-blue-100 text-blue-700`;
      case 'nurse':
        return `${baseClasses} bg-pink-100 text-pink-700`;
      case 'receptionist':
        return `${baseClasses} bg-amber-100 text-amber-700`;
      default:
        return `${baseClasses} bg-slate-100 text-slate-700`;
    }
  }
}
