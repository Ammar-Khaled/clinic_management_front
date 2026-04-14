import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Slot, Doctor } from '../../../models/doctor.model';

export interface RescheduleSubmitPayload {
  appointmentId: number;
  newSlotId: number;
  reason: string;
}

export interface RescheduleSlotsQuery {
  doctorId: number;
  date: string;
}

@Component({
  selector: 'app-reschedule-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="rounded-[2rem] border border-slate-200/50 bg-slate-50 p-6">
      <div class="mb-4 flex items-center gap-3">
        <div class="rounded-lg bg-blue-100 p-2 text-blue-700">
          <span class="material-symbols-outlined text-xl">edit_calendar</span>
        </div>
        <h3 class="text-lg font-bold text-on-surface">Reschedule Tool</h3>
      </div>

      <div class="space-y-4">
        <div class="space-y-3">
          <div>
            <label
              class="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
              >New Appointment Details</label
            >
            <div class="grid grid-cols-2 gap-2">
              <div class="rounded-xl border border-slate-200 bg-white p-3">
                <p class="text-[9px] font-bold uppercase text-slate-400">Date</p>
                <input
                  type="date"
                  class="w-full bg-transparent text-xs font-semibold focus:ring-0"
                  [(ngModel)]="selectedDate"
                  (ngModelChange)="onDoctorOrDateChange()"
                />
              </div>
              <div class="rounded-xl border border-slate-200 bg-white p-3">
                <p class="text-[9px] font-bold uppercase text-slate-400">Doctor</p>
                <select
                  class="w-full cursor-pointer bg-transparent text-xs font-semibold focus:ring-0"
                  [(ngModel)]="selectedDoctorId"
                  (ngModelChange)="onDoctorOrDateChange()"
                >
                  <option [ngValue]="null">Select</option>
                  <option *ngFor="let doctor of doctors" [ngValue]="doctor.id">
                    {{ doctorDisplayName(doctor) }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-3">
            <label class="mb-1 block text-[9px] font-bold uppercase text-slate-400"
              >Appointment to Move</label
            >
            <select
              class="w-full cursor-pointer bg-transparent text-xs font-medium focus:ring-0"
              [(ngModel)]="selectedAppointmentId"
            >
              <option [ngValue]="null">Select appointment</option>
              <option *ngFor="let item of reschedulableAppointments" [ngValue]="item.id">
                #APT-{{ item.id }} • {{ item.patient.name }}
              </option>
            </select>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-3">
            <label class="mb-1 block text-[9px] font-bold uppercase text-slate-400"
              >Target Slot</label
            >
            <select
              class="w-full cursor-pointer bg-transparent text-xs font-medium focus:ring-0"
              [(ngModel)]="selectedSlotId"
              [disabled]="loadingSlots"
            >
              <option [ngValue]="null">
                {{ loadingSlots ? 'Loading slots...' : 'Select slot' }}
              </option>
              <option *ngFor="let slot of slots" [ngValue]="slot.id">{{ formatSlot(slot) }}</option>
            </select>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-3">
            <label class="mb-1 block text-[9px] font-bold uppercase text-slate-400"
              >Reason for Reschedule (Audit Trail)</label
            >
            <select
              class="w-full cursor-pointer bg-transparent text-xs font-medium focus:ring-0"
              [(ngModel)]="reason"
            >
              <option>Patient requested change</option>
              <option>Practitioner unavailability</option>
              <option>Scheduling conflict</option>
              <option>Administrative error</option>
            </select>
          </div>

          <p
            *ngIf="validationMessage"
            class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700"
          >
            {{ validationMessage }}
          </p>
        </div>

        <button
          class="w-full rounded-xl border-2 border-blue-200 py-3 text-xs font-bold uppercase tracking-wide text-blue-700 transition-all hover:bg-white disabled:opacity-60"
          [disabled]="busy"
          (click)="submitReschedule()"
        >
          {{ busy ? 'Rescheduling...' : 'Confirm Relocation' }}
        </button>

        <div class="border-t border-slate-200 pt-3">
          <p class="text-center text-[10px] font-medium italic text-slate-400">
            {{ auditMessage || 'Audit trail entry will appear after a successful change.' }}
          </p>
        </div>
      </div>
    </section>
  `,
})
export class RescheduleCardComponent implements OnChanges {
  @Input() doctors: Doctor[] = [];
  @Input() slots: Slot[] = [];
  @Input() loadingSlots = false;
  @Input() busy = false;
  @Input() auditMessage = '';
  @Input() reschedulableAppointments: Array<{ id: number; patient: { name: string } }> = [];
  @Input() preselectedAppointmentId: number | null = null;
  @Input() preselectedDoctorId: number | null = null;
  @Input() preselectedDate: string | null = null;

  @Output() requestSlots = new EventEmitter<RescheduleSlotsQuery>();
  @Output() submit = new EventEmitter<RescheduleSubmitPayload>();

  selectedDate = new Date().toISOString().split('T')[0];
  selectedDoctorId: number | null = null;
  selectedAppointmentId: number | null = null;
  selectedSlotId: number | null = null;
  reason = 'Patient requested change';
  validationMessage = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['preselectedAppointmentId'] && this.preselectedAppointmentId) {
      this.selectedAppointmentId = this.preselectedAppointmentId;
    }

    if (changes['preselectedDoctorId'] && this.preselectedDoctorId) {
      this.selectedDoctorId = this.preselectedDoctorId;
    }

    if (changes['preselectedDate'] && this.preselectedDate) {
      this.selectedDate = this.preselectedDate;
    }

    if (
      (changes['preselectedDoctorId'] || changes['preselectedDate']) &&
      this.selectedDoctorId &&
      this.selectedDate
    ) {
      this.onDoctorOrDateChange();
    }

    if (
      changes['reschedulableAppointments'] &&
      this.reschedulableAppointments.length > 0 &&
      !this.selectedAppointmentId
    ) {
      this.selectedAppointmentId = this.reschedulableAppointments[0].id;
    }

    if (
      changes['slots'] &&
      this.selectedSlotId &&
      !this.slots.some((slot) => slot.id === this.selectedSlotId)
    ) {
      this.selectedSlotId = null;
    }
  }

  onDoctorOrDateChange(): void {
    if (!this.selectedDoctorId || !this.selectedDate) return;
    this.requestSlots.emit({ doctorId: this.selectedDoctorId, date: this.selectedDate });
  }

  submitReschedule(): void {
    this.validationMessage = '';

    if (!this.selectedAppointmentId) {
      this.validationMessage = 'Please select an appointment to move.';
      return;
    }

    if (!this.selectedSlotId) {
      this.validationMessage = 'Please select a new target slot.';
      return;
    }

    const appointmentId = Number(this.selectedAppointmentId);
    const newSlotId = Number(this.selectedSlotId);

    if (Number.isNaN(appointmentId) || Number.isNaN(newSlotId)) {
      this.validationMessage = 'Invalid appointment or slot selection.';
      return;
    }

    this.submit.emit({
      appointmentId,
      newSlotId,
      reason: this.reason,
    });
  }

  formatSlot(slot: Slot): string {
    const start = new Date(slot.start_datetime);
    if (Number.isNaN(start.getTime())) return `Slot #${slot.id}`;
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  }

  doctorDisplayName(doctor: Doctor): string {
    const full = `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim();
    if (full) return `Dr. ${full}`;
    return `Doctor #${doctor.id}`;
  }
}
