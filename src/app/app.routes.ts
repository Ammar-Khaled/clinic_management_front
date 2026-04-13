import { Routes } from '@angular/router';
import { AdminDashboard } from './admin-dashboard/admin-dashboard';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'admin-dashboard',
    component: AdminDashboard,
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login').then(m => m.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./pages/signup/signup').then(m => m.SignupComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then(m => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'appointments/:appointmentId',
    loadComponent: () =>
      import('./pages/appointment-detail/appointment-detail').then(m => m.AppointmentDetailComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile/profile').then(m => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'my-appointments',
    loadComponent: () =>
      import('./pages/my-appointments/my-appointments').then(m => m.MyAppointmentsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'receptionist/dashboard',
    loadComponent: () =>
      import('./components/receptionist-dashboard/receptionist-dashboard').then(
        m => m.ReceptionistDashboardComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'receptionist/schedules',
    loadComponent: () =>
      import('./components/receptionist-dashboard/schedules-management').then(
        m => m.SchedulesManagementComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'receptionist/slots',
    loadComponent: () =>
      import('./components/receptionist-dashboard/slots-management').then(
        m => m.SlotsManagementComponent
      ),
    canActivate: [authGuard],
  },
  { path: 'receptionist', redirectTo: 'receptionist/dashboard', pathMatch: 'full' },
  { path: 'doctor-dashboard', loadComponent: () => import('./pages/doctor-dashboard/doctor-dashboard').then(m => m.DoctorDashboardComponent), canActivate: [authGuard] },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
