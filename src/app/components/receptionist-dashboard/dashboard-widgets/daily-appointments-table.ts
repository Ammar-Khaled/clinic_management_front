import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AppointmentListItem } from '../../../models/appointment.model';

@Component({
  selector: 'app-daily-appointments-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section
      class="overflow-hidden rounded-3xl border border-white bg-surface-container-lowest editorial-shadow lg:col-span-8"
    >
      <div
        class="flex items-center justify-between border-b border-surface-container-low bg-white p-6"
      >
        <div>
          <h2 class="text-xl font-bold text-on-surface">Daily Appointments</h2>
          <p class="mt-1 text-xs font-medium text-slate-500">
            Non-clinical administrative view only
          </p>
        </div>
        <div class="flex gap-2">
          <span
            class="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-700"
          >
            {{ appointments.length }} Today
          </span>
          <span
            class="rounded-full border border-green-100 bg-green-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-green-700"
          >
            {{ confirmedCount }} Confirmed
          </span>
        </div>
      </div>

      <div *ngIf="loading" class="flex items-center justify-center py-10 text-sm text-slate-500">
        <span class="material-symbols-outlined mr-2 animate-spin">progress_activity</span>
        Loading appointments...
      </div>

      <div *ngIf="!loading" class="overflow-x-auto">
        <table class="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr
              class="bg-slate-50/50 text-[10px] font-bold uppercase tracking-widest text-slate-400"
            >
              <th class="px-6 py-4">Time / Queue</th>
              <th class="px-6 py-4">Patient Information</th>
              <th class="px-6 py-4">Doctor</th>
              <th class="px-6 py-4">Status</th>
              <th class="px-6 py-4 text-right">Administrative Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              *ngFor="let item of appointments; trackBy: trackByAppointmentId"
              class="group transition-colors hover:bg-slate-50/50"
            >
              <td class="px-6 py-5 align-top">
                <span class="text-sm font-bold text-on-surface">{{
                  formatTime(item.slot?.start_datetime)
                }}</span>
                <p class="mt-1 text-[10px] font-bold uppercase" [ngClass]="queueClass(item.status)">
                  {{ queueLabel(item.status) }}
                </p>
              </td>
              <td class="px-6 py-5">
                <p class="text-sm font-semibold text-on-surface">{{ item.patient.name }}</p>
                <p class="text-[10px] font-medium text-slate-400">
                  ID: #APT-{{ item.id }} • {{ item.patient.email }}
                </p>
              </td>
              <td class="px-6 py-5">
                <span class="text-xs font-medium text-slate-600">
                  {{ getDoctorName(item.doctor) }}
                </span>
              </td>
              <td class="px-6 py-5">
                <span
                  class="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider"
                  [ngClass]="statusPillClass(item.status)"
                >
                  {{ statusLabel(item.status) }}
                </span>
              </td>
              <td class="px-6 py-5 text-right">
                <div class="flex justify-end gap-2" *ngIf="item.status === 'SCHEDULED'">
                  <button
                    class="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-[10px] font-bold text-green-700 shadow-sm transition-all duration-200 hover:bg-green-100 active:scale-95"
                    (click)="confirm.emit(item.id)"
                  >
                    CONFIRM
                  </button>
                  <button
                    class="rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-[10px] font-bold text-primary shadow-sm transition-all duration-200 hover:bg-primary/10 active:scale-95"
                    (click)="checkIn.emit(item.id)"
                  >
                    CHECK-IN
                  </button>
                  <button
                    class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-bold text-rose-700 shadow-sm transition-all duration-200 hover:bg-rose-100 active:scale-95"
                    (click)="noShow.emit(item.id)"
                  >
                    NO-SHOW
                  </button>
                  <button
                    class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-500 shadow-sm transition-all duration-200 hover:bg-slate-100 active:scale-95"
                    (click)="cancel.emit(item.id)"
                  >
                    CANCEL
                  </button>
                </div>
                <div class="flex justify-end gap-2" *ngIf="item.status === 'CONFIRMED'">
                  <button
                    class="rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-[10px] font-bold text-primary shadow-sm transition-all duration-200 hover:bg-primary/10 active:scale-95"
                    (click)="checkIn.emit(item.id)"
                  >
                    CHECK-IN
                  </button>
                  <button
                    class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-bold text-rose-700 shadow-sm transition-all duration-200 hover:bg-rose-100 active:scale-95"
                    (click)="noShow.emit(item.id)"
                  >
                    NO-SHOW
                  </button>
                  <button
                    class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-500 shadow-sm transition-all duration-200 hover:bg-slate-100 active:scale-95"
                    (click)="cancel.emit(item.id)"
                  >
                    CANCEL
                  </button>
                </div>
                <div class="flex justify-end gap-2" *ngIf="item.status === 'CHECKED_IN'">
                  <button
                    class="rounded-lg px-3 py-1.5 text-[10px] font-bold text-rose-700 transition-all hover:bg-rose-50"
                    (click)="noShow.emit(item.id)"
                  >
                    NO-SHOW
                  </button>
                </div>
                <span
                  *ngIf="
                    item.status !== 'SCHEDULED' &&
                    item.status !== 'CONFIRMED' &&
                    item.status !== 'CHECKED_IN'
                  "
                  class="text-[10px] font-semibold text-slate-400"
                  >No action</span
                >
              </td>
            </tr>
            <tr *ngIf="appointments.length === 0">
              <td colspan="5" class="px-6 py-10 text-center text-sm text-slate-500">
                No appointments found for the selected filters.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class DailyAppointmentsTableComponent {
  @Input() appointments: AppointmentListItem[] = [];
  @Input() loading = false;

  @Output() confirm = new EventEmitter<number>();
  @Output() checkIn = new EventEmitter<number>();
  @Output() noShow = new EventEmitter<number>();
  @Output() cancel = new EventEmitter<number>();
  @Output() startReschedule = new EventEmitter<number>();

  get confirmedCount(): number {
    return this.appointments.filter((item) => item.status === 'CONFIRMED').length;
  }

  trackByAppointmentId(_: number, item: AppointmentListItem): number {
    return item.id;
  }

  getDoctorName(doctor: { name: string; id: number } | null | undefined): string {
    if (!doctor) return 'Unknown doctor';
    return doctor.name ? `Dr. ${doctor.name} (#${doctor.id})` : 'Unknown doctor';
  }

  formatTime(value?: string | null): string {
    if (!value) return '-';
    // Use raw string processing to match backend format exactly
    if (value.includes('T')) {
      return value.split('T')[1].substring(0, 5);
    }
    return value.substring(0, 5);
  }

  statusLabel(status: string): string {
    return status.replaceAll('_', ' ');
  }

  queueLabel(status: string): string {
    if (status === 'CHECKED_IN') return 'In Queue';
    if (status === 'CONFIRMED') return 'Confirmed';
    if (status === 'SCHEDULED') return 'Pending Conf.';
    return status.replaceAll('_', ' ');
  }

  queueClass(status: string): string {
    if (status === 'CHECKED_IN') return 'text-primary';
    if (status === 'CONFIRMED') return 'text-green-600';
    if (status === 'SCHEDULED') return 'text-orange-600';
    return 'text-slate-500';
  }

  statusPillClass(status: string): string {
    if (status === 'CHECKED_IN') return 'bg-primary text-white';
    if (status === 'CONFIRMED') return 'border border-green-200 bg-green-100 text-green-700';
    if (status === 'SCHEDULED') return 'bg-slate-100 text-slate-500';
    if (status === 'NO_SHOW') return 'bg-rose-100 text-rose-700';
    if (status === 'CANCELLED') return 'bg-slate-200 text-slate-600';
    if (status === 'COMPLETED') return 'bg-secondary-container text-on-secondary-container';
    return 'bg-slate-100 text-slate-500';
  }
}
