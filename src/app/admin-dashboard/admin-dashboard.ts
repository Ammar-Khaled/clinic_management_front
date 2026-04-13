import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { UserService } from '../services/user';
import { AppointmentService } from '../services/appointment';
import { User, DailyAppointmentStat, AppointmentStatusStat, AppointmentsAnalytics } from '../models/user.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  private userService = inject(UserService);
  private appointmentService = inject(AppointmentService);
  
  users = signal<User[]>([]);

  appointmentsPerDay = signal<DailyAppointmentStat[]>([]);
  appointmentStatuses = signal<AppointmentStatusStat[]>([]);
  growthPercentage = signal<number>(0);

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
    this.userService.getUsers().subscribe({
      next: (data) => this.users.set(data),
      error: (err) => console.error('Error fetching users:', err)
    });

    this.appointmentService.getAppointmentsAnalytics().subscribe({
      next: (data: AppointmentsAnalytics) => {
        if (data.volume) this.appointmentsPerDay.set(data.volume);
        if (data.statuses) this.appointmentStatuses.set(data.statuses);
        if (data.growthPercentage !== undefined) this.growthPercentage.set(data.growthPercentage);
      },
      error: (err) => console.warn('Error fetching analytics API:', err)
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
