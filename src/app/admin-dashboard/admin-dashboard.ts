import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/user';
import { AppointmentService } from '../services/appointment';
import { User, DailyAppointmentStat, AppointmentStatusStat, AppointmentsAnalytics, PaginatedResponse } from '../models/user.model';
import { AuthService } from '../services/auth';

import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DecimalPipe, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  private userService = inject(UserService);
  private appointmentService = inject(AppointmentService);
  private authService = inject(AuthService);
  private router = inject(Router);
  
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

  totalUsers = signal<number>(0);
  roleFilter = signal<string>('');
  isActiveFilter = signal<boolean | undefined>(undefined);
  searchFilter = signal<string>('');
  
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  hasNextPage = signal<boolean>(false);
  hasPrevPage = signal<boolean>(false);

  private searchSubject = new Subject<string>();

  ngOnInit() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.searchFilter.set(searchTerm);
      this.currentPage.set(1);
      this.loadUsers();
    });

    this.loadUsers();

    this.appointmentService.getAppointmentsAnalytics().subscribe({
      next: (response: any) => {
        if (response.status === 'success' && Array.isArray(response.data)) {
          let maxTotal = 0;
          response.data.forEach((item: any) => {
            if (item.total > maxTotal) maxTotal = item.total;
          });
          
          const mappedVolume: DailyAppointmentStat[] = response.data.map((item: any) => {
            const d = new Date(item.date);
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayStr = !isNaN(d.getTime()) ? dayNames[d.getDay()] : item.date;
            
            // To ensure bars visually render, even 0 total can be 0% but we map it cleanly.
            const pct = maxTotal > 0 ? Math.round((item.total / maxTotal) * 100) : 0;
            return { day: dayStr, percentage: pct > 0 ? pct : 2 }; // default to 2% so it shows a tiny sliver instead of completely empty
          });

          this.appointmentsPerDay.set(mappedVolume);
        }
      },
      error: (err) => console.warn('Error fetching analytics API:', err)
    });

    this.appointmentService.getTodayStatusAnalytics().subscribe({
      next: (response: any) => {
        if (response.status === 'success' && Array.isArray(response.data)) {
           const colorMap: Record<string, string> = {
             'SCHEDULED': '#3b82f6', // blue
             'CONFIRMED': '#10b981', // green
             'COMPLETED': '#8b5cf6', // purple
             'CANCELLED': '#ef4444', // red
             'CHECKED_IN': '#f59e0b', // amber
             'NO_SHOW': '#64748b' // slate
           };
           const mappedStatuses: AppointmentStatusStat[] = response.data.map((item: any) => ({
             status: item.status,
             percentage: item.percentage,
             hexCode: colorMap[item.status.toUpperCase()] || '#cbd5e1'
           }));
           this.appointmentStatuses.set(mappedStatuses);
        }
      },
      error: (err) => console.warn('Error fetching today status analytics API:', err)
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
      case 'receptionist':
        return `${baseClasses} bg-amber-100 text-amber-700`;
      default:
        return `${baseClasses} bg-slate-100 text-slate-700`;
    }
  }

  getUserAvatar(user: User): string {
    const firstName = user.first_name || user.username || 'User';
    const lastName = user.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&color=fff&bold=true`;
  }

  loadUsers() {
    const filters: any = {};
    if (this.roleFilter()) filters.role = this.roleFilter();
    if (this.isActiveFilter() !== undefined) filters.is_active = this.isActiveFilter();
    if (this.searchFilter()) filters.search = this.searchFilter();
    filters.page = this.currentPage();
    filters.page_size = this.pageSize();

    this.userService.getUsers(filters).subscribe({
      next: (data: PaginatedResponse<User> | User[] | any) => {
        if (data && 'results' in data) {
          this.users.set(data.results);
          this.totalUsers.set(data.count);
          this.hasNextPage.set(!!data.next);
          this.hasPrevPage.set(!!data.previous);
        } else {
           this.users.set(data as User[]);
           this.totalUsers.set((data as User[]).length);
           this.hasNextPage.set(false);
           this.hasPrevPage.set(false);
        }
      },
      error: (err) => console.error('Error fetching users:', err)
    });
  }

  onRoleChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.roleFilter.set(val);
    this.currentPage.set(1);
    this.loadUsers();
  }

  onStatusChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    let isActive: boolean | undefined = undefined;
    if (val === 'true') isActive = true;
    else if (val === 'false') isActive = false;
    
    this.isActiveFilter.set(isActive);
    this.currentPage.set(1);
    this.loadUsers();
  }

  onSearchChange(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.searchSubject.next(val);
  }

  getUserId(user: any): string | number {
    if (user.id !== undefined) return user.id;
    if (user.pk !== undefined) return user.pk;
    if (user._id !== undefined) return user._id;
    if (user.url) {
      const parts = user.url.split('/').filter((p: string) => p.trim() !== '');
      return parts[parts.length - 1];
    }
    return '';
  }

  toggleUserStatus(user: User) {
    const userId = this.getUserId(user);
    console.log('Toggling user:', user);
    if (!userId) {
        console.error('No ID found for user. Cannot update status. Object:', user);
        return;
    }
    
    const newStatus = user.is_active === false ? true : false;
    this.userService.updateUser(userId, { is_active: newStatus }).subscribe({
      next: () => this.loadUsers(),
      error: (err) => console.error(`Error ${newStatus ? 'activating' : 'deactivating'} user:`, err)
    });
  }

  deleteUser(user: User) {
    const userId = this.getUserId(user);
    if (!userId) {
        console.error('No ID found for user. Cannot delete. Object:', user);
        return;
    }
    
    const identifier = user.first_name || user.username || 'this user';
    if (confirm(`Are you sure you want to permanently delete ${identifier}?`)) {
      this.userService.deleteUser(userId).subscribe({
        next: () => this.loadUsers(),
        error: (err) => console.error('Error deleting user:', err)
      });
    }
  }

  isCreateModalOpen = signal(false);
  newUserForm: Partial<User> = {
    username: '',
    email: '',
    password: '',
    role: 'PATIENT',
    first_name: '',
    last_name: ''
  };

  createApiErrors = signal<any>({});

  openCreateModal() {
    this.createApiErrors.set({});
    this.newUserForm = {
      username: '',
      email: '',
      password: '',
      role: 'PATIENT',
      first_name: '',
      last_name: ''
    };
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal() {
    this.isCreateModalOpen.set(false);
  }

  createUser() {
    this.createApiErrors.set({});
    this.userService.createUser(this.newUserForm as User).subscribe({
      next: () => {
         this.closeCreateModal();
         this.loadUsers();
      },
      error: (err) => {
        console.error("Failed to create user", err);
        if (err.status === 400 && err.error) {
          this.createApiErrors.set(err.error);
        } else {
          this.createApiErrors.set({ _global: 'An unexpected error occurred. Please try again later.' });
        }
      }
    });
  }

  nextPage() {
    if (this.hasNextPage()) {
      this.currentPage.update(p => p + 1);
      this.loadUsers();
    }
  }

  prevPage() {
    if (this.hasPrevPage() && this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadUsers();
    }
  }

  logout() {
    this.authService.logout();
  }

  exportCSV() {
    this.appointmentService.exportAnalytics().subscribe({
      next: (response: any) => {
        const blob: Blob = response.body;
        const contentType = response.headers.get('Content-Type') || '';
        const contentDisposition = response.headers.get('Content-Disposition') || '';

        // Try to extract filename from Content-Disposition header
        let filename = 'appointments_analytics';
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        } else if (contentType.includes('spreadsheetml') || contentType.includes('excel')) {
          filename = 'appointments_analytics.xlsx';
        } else if (contentType.includes('csv')) {
          filename = 'appointments_analytics.csv';
        } else {
          filename = 'appointments_analytics.xlsx';
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Export failed:', err)
    });
  }
}
