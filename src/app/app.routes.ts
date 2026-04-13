import { Routes } from '@angular/router';
import { AdminDashboard } from './admin-dashboard/admin-dashboard';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'admin-dashboard',
    component: AdminDashboard,
    canActivate: [authGuard],
  },
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent) },
  { path: 'signup', loadComponent: () => import('./pages/signup/signup').then(m => m.SignupComponent) },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'appointments/:id', loadComponent: () => import('./pages/appointment-detail/appointment-detail').then(m => m.AppointmentDetailComponent), canActivate: [authGuard] },
  { path: 'profile', loadComponent: () => import('./pages/profile/profile').then(m => m.ProfileComponent), canActivate: [authGuard] },
  { path: 'my-appointments', loadComponent: () => import('./pages/my-appointments/my-appointments').then(m => m.MyAppointmentsComponent), canActivate: [authGuard] },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },
];
