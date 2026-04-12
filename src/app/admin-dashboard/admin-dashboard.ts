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
}
