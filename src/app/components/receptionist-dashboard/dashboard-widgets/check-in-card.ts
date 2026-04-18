import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppointmentListItem } from '../../../models/appointment.model';

@Component({
  selector: 'app-check-in-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="rounded-[2rem] border border-slate-100 bg-white p-6 editorial-shadow">
      <div class="mb-5 flex items-center gap-3">
        <div class="rounded-lg bg-primary/10 p-2 text-primary">
          <span class="material-symbols-outlined text-xl">how_to_reg</span>
        </div>
        <h3 class="text-lg font-bold text-on-surface">Patient Check-in</h3>
      </div>

      <div class="space-y-4">
        <div class="relative">
          <input
            class="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 pl-10 text-sm transition-all focus:ring-2 focus:ring-primary/20"
            type="number"
            placeholder="Enter appointment ID for express check-in..."
            [(ngModel)]="appointmentId"
          />
          <span class="material-symbols-outlined absolute left-3 top-3.5 text-lg text-slate-400"
            >search</span
          >
        </div>

        <div class="rounded-xl border border-slate-100 bg-white p-3">
          <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
            >Appointment List</label
          >
          <select
            class="w-full cursor-pointer bg-transparent text-xs font-medium focus:ring-0"
            [(ngModel)]="appointmentId"
          >
            <option [ngValue]="null">Select appointment to check-in</option>
            <option *ngFor="let item of appointments" [ngValue]="item.id">
              #APT-{{ item.id }} • {{ item.patient.name }}
            </option>
          </select>
        </div>

        <div
          class="rounded-2xl border border-slate-100 bg-slate-50 p-4"
          *ngIf="selectedAppointment"
        >
          <div class="mb-2 flex items-start justify-between">
            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400"
              >Selected Profile</span
            >
            <span class="text-[10px] font-bold text-primary">APT-{{ selectedAppointment.id }}</span>
          </div>
          <p class="font-bold text-on-surface">{{ selectedAppointment.patient.name }}</p>
          <p class="mb-4 text-xs text-slate-500">
            {{ selectedAppointment.status }} with
            {{ getDoctorName(selectedAppointment.doctor) }}
          </p>
          <button
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-white transition-all hover:shadow-lg disabled:opacity-60"
            [disabled]="busy"
            (click)="onCheckIn()"
          >
            <span class="material-symbols-outlined text-sm">alarm_on</span>
            {{ busy ? 'PROCESSING...' : 'MARK CHECK-IN' }}
          </button>
        </div>

        <p class="text-xs text-slate-500" *ngIf="!selectedAppointment">
          Type a valid appointment ID from today's list.
        </p>

        <div class="rounded-2xl border border-slate-100 bg-white p-4">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400"
              >Checked-In Patients</span
            >
            <span class="text-[10px] font-bold text-primary">{{ checkedInQueue.length }}</span>
          </div>

          <div *ngIf="loadingQueue" class="py-3 text-xs text-slate-500">Loading queue...</div>

          <div
            *ngIf="!loadingQueue && checkedInQueue.length === 0"
            class="py-3 text-xs text-slate-500"
          >
            No checked-in patients found for selected doctor/date.
          </div>

          <div *ngIf="!loadingQueue && checkedInQueue.length > 0" class="space-y-2">
            <div
              *ngFor="let queueItem of checkedInQueue"
              class="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <p class="text-xs font-semibold text-on-surface">{{ queueItem.patient.name }}</p>
              <p class="text-[10px] text-slate-500">
                #APT-{{ queueItem.appointment_id }} •
                {{ formatTime(queueItem.scheduled_start_datetime) }} • Waiting
                {{ queueItem.waiting_time_minutes ?? 0 }}m
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class CheckInCardComponent {
  @Input() appointments: AppointmentListItem[] = [];
  @Input() checkedInQueue: Array<{
    appointment_id: number;
    waiting_time_minutes: number | null;
    scheduled_start_datetime: string;
    patient: { name: string };
  }> = [];
  @Input() loadingQueue = false;
  @Input() busy = false;
  @Output() checkIn = new EventEmitter<number>();

  appointmentId: number | null = null;

  get selectedAppointment(): AppointmentListItem | undefined {
    if (!this.appointmentId) return undefined;
    return this.appointments.find((item) => item.id === this.appointmentId);
  }

  getDoctorName(doctor: { name: string; id: number } | null | undefined): string {
    if (!doctor) return 'Unknown doctor';
    return doctor.name ? `Dr. ${doctor.name} (#${doctor.id})` : 'Unknown doctor';
  }

  formatTime(dateTime: string): string {
    if (!dateTime) return '-';
    // If ISO string, extract time. Otherwise return start of string.
    if (dateTime.includes('T')) {
      return dateTime.split('T')[1].substring(0, 5);
    }
    return dateTime.substring(0, 5);
  }

  onCheckIn(): void {
    if (!this.selectedAppointment) return;
    this.checkIn.emit(this.selectedAppointment.id);
  }
}
