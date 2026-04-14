import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DoctorService } from '../../services/doctor';
import { AppointmentService } from '../../services/appointment';
import { PatientService } from '../../services/patient';
import { PatientProfile } from '../../models/user.model';

export interface QueuePatient {
  id: number;
  appointmentId: number;
  patientId: number;
  name: string;
  initials: string;
  visitType: string;
  patientCode: string;
  scheduledTime: string;
  checkInTime: string;
  waitMinutes: number;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'IN_CONSULTATION';
  age?: number;
  gender?: string;
  allergies?: string;
}

export interface PrescriptionRow {
  drugName: string;
  dosage: string;
  duration: string;
}

export interface AppointmentRequest {
  id: number;
  name: string;
  initials: string;
  date: string;
  bgColor: string;
  textColor: string;
}

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-dashboard.html',
  styleUrl: './doctor-dashboard.css',
})
export class DoctorDashboardComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private appointmentService = inject(AppointmentService);
  private patientService = inject(PatientService);
  private router = inject(Router);

  // --- Doctor profile ---
  doctorName = signal('');
  doctorSpecialization = signal('');
  docId = signal<number | null>(null);
  loading = false;

  // --- Today's date ---
  todayDate = signal('');
  activeCount = signal(0);

  // --- Queue ---
  queue = signal<QueuePatient[]>([]);
  selectedPatient = signal<QueuePatient | null>(null);
  selectedPatientProfile = signal<PatientProfile | null>(null);
  profileLoading = signal(false);

  // --- Consultation form ---
  diagnosis = signal('');
  clinicalNotes = signal('');
  prescriptions = signal<PrescriptionRow[]>([]);
  diagnosticTests = signal<string[]>([]);
  newTestInput = signal('');
  showTestDropdown = signal(false);

  availableTestTypes = [
    { code: 'CBC', name: 'Complete Blood Count' },
    { code: 'BMP', name: 'Basic Metabolic Panel' },
    { code: 'LFT', name: 'Liver Function Test' },
    { code: 'LIPID', name: 'Lipid Panel' },
    { code: 'TSH', name: 'Thyroid Stimulating Hormone' },
    { code: 'HBA1C', name: 'HbA1c' },
    { code: 'URINE', name: 'Urinalysis' },
    { code: 'XRAY', name: 'X-Ray' },
    { code: 'ECG', name: 'Electrocardiogram' },
    { code: 'ECHO', name: 'Echocardiogram' },
    { code: 'MRI', name: 'MRI Scan' },
    { code: 'CT', name: 'CT Scan' },
    { code: 'ULTRASOUND', name: 'Ultrasound' },
  ];

  filteredTests = computed(() => {
    const input = this.newTestInput().toLowerCase().trim();
    if (!input) return this.availableTestTypes;
    return this.availableTestTypes.filter(t =>
      t.code.toLowerCase().includes(input) ||
      t.name.toLowerCase().includes(input)
    );
  });

  // --- Appointment Requests ---
  appointmentRequests = signal<AppointmentRequest[]>([]);

  // --- Search ---
  successMessage = signal<string | null>(null);

  ngOnInit() {
    this.setTodayDate();
    this.loadDoctorProfile();
    this.loadQueue();
  }

  private showSuccess(msg: string) {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  private setTodayDate() {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    };
    const ordinal = (n: number) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
    const month = now.toLocaleDateString('en-US', { month: 'long' });
    const day = ordinal(now.getDate());
    this.todayDate.set(`${weekday}, ${month} ${day}`);
  }

  private loadDoctorProfile() {
    this.doctorService.getDoctorProfileSelf().subscribe({
      next: (res: any) => {
        const d = res.doctor;
        if (d) {
          this.docId.set(d.id);
          const fullName = d.first_name && d.last_name 
            ? `Dr. ${d.first_name} ${d.last_name}` 
            : `Dr. ${d.username || 'Specialist'}`;
          this.doctorName.set(fullName);
          this.doctorSpecialization.set(d.specialization || 'Specialist');

          // Load appointments for this specific doctor
          this.loadAppointmentRequests(d.id);
        }
      },
      error: () => { },
    });
  }

  private loadQueue(preserveSelection = false) {
    const currentSelectedId = this.selectedPatient()?.appointmentId;

    this.appointmentService.getQueueToday().subscribe({
      next: (res: any) => {
        // Handle the nested 'queue' array as per the API response structure
        const items = res?.queue || (Array.isArray(res) ? res : res?.data || []);

        const mapped: QueuePatient[] = items.map((item: any, idx: number) => {
          const patientId = item.patient?.id || item.patient_id || idx;
          const name = item.patient?.name || item.patient_name || `Patient ${idx + 1}`;
          const initials = name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase();

          // Format scheduled range: "HH:mm - HH:mm"
          let scheduledTime = '—';
          if (item.scheduled_start_datetime && item.scheduled_end_datetime) {
            const start = new Date(item.scheduled_start_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            const end = new Date(item.scheduled_end_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            scheduledTime = `${start} - ${end}`;
          }

          // Actual check-in time for checked-in patients
          let checkInTime = '—';
          if (item.check_in_time) {
            const date = new Date(item.check_in_time);
            checkInTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
          }

          const status = item.status || 'WAITING';

          return {
            id: patientId,
            appointmentId: item.appointment_id || item.id || idx,
            patientId: patientId,
            name,
            initials,
            visitType: item.visit_type || item.reason || 'Consultation',
            patientCode: item.patient_code || `#PT-${String(patientId).padStart(4, '0')}`,
            scheduledTime,
            checkInTime,
            waitMinutes: item.waiting_time_minutes || 0,
            status: status as any,
            age: item.patient?.age || item.patient_age,
            gender: item.patient?.gender || item.patient_gender,
            allergies: item.patient?.allergies || item.patient_allergies || '',
          };
        });

        this.queue.set(mapped);
        this.activeCount.set(mapped.length);

        if (mapped.length > 0) {
          if (preserveSelection && currentSelectedId) {
            const stillExists = mapped.find(p => p.appointmentId === currentSelectedId);
            if (stillExists) {
              this.selectedPatient.set(stillExists);
            } else {
              this.selectPatient(mapped[0]);
            }
          } else if (!this.selectedPatient()) {
            this.selectPatient(mapped[0]);
          }
        } else {
          this.selectedPatient.set(null);
        }
      },
      error: () => { },
    });
  }


  private loadAppointmentRequests(doctorId?: number) {
    this.appointmentService.getScheduledAppointments(doctorId).subscribe({
      next: (res: any) => {
        // Use the 'appointments' array from the API response
        const items = res?.appointments || (Array.isArray(res) ? res : []);
        const pending = items.slice(0, 5);

        const colors = [
          { bg: '#e0e7ff', text: '#3730a3' },
          { bg: '#fce7f3', text: '#9d174d' },
          { bg: '#d1fae5', text: '#065f46' },
          { bg: '#fef3c7', text: '#92400e' },
        ];

        const mapped: AppointmentRequest[] = pending.map((a: any, i: number) => {
          const name = a.patient?.name || a.patient_name || `Patient ${a.patient?.id || a.patient_id || i}`;
          const initials = name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase();
          const c = colors[i % colors.length];

          // Use slot.start_datetime if available, otherwise fallback to created_at
          const displayDate = a.slot?.start_datetime || a.start_datetime || a.created_at;

          return {
            id: a.id,
            name,
            initials,
            date: displayDate
              ? new Date(displayDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : '',
            bgColor: c.bg,
            textColor: c.text,
          };
        });
        this.appointmentRequests.set(mapped);
      },
      error: () => { },
    });
  }

  // --- Actions ---

  selectPatient(patient: QueuePatient) {
    this.selectedPatient.set(patient);
    this.selectedPatientProfile.set(null);
    this.diagnosis.set('');
    this.clinicalNotes.set('');
    this.diagnosticTests.set([]);
    this.prescriptions.set([]);

    if (patient.patientId) {
      this.profileLoading.set(true);
      this.patientService.getPatientById(patient.patientId).subscribe({
        next: (res: any) => {
          const p = res.patient;
          if (p) {
            this.selectedPatientProfile.set(p);
          }
          this.profileLoading.set(false);
        },
        error: () => {
          this.profileLoading.set(false);
        }
      });
    }
  }

  calculateAge(dobString?: string): string {
    if (!dobString) return '';
    try {
      const dob = new Date(dobString);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return `${age} Years`;
    } catch {
      return '';
    }
  }

  startVisit(patient: QueuePatient) {
    this.appointmentService.checkInAppointment(patient.appointmentId).subscribe({
      next: () => {
        patient.status = 'CHECKED_IN';
        this.selectPatient(patient);
        this.queue.update(q => [...q]);
      },
      error: () => {
        patient.status = 'CHECKED_IN';
        this.selectPatient(patient);
        this.queue.update(q => [...q]);
      },
    });
  }

  markNoShow(patient?: QueuePatient) {
    const target = patient || this.selectedPatient();
    if (!target) return;

    if (!confirm(`Are you sure you want to mark ${target.name} as a no-show?`)) return;

    this.loading = true;
    this.appointmentService.noShowAppointment(target.appointmentId).subscribe({
      next: () => {
        this.loading = false;
        this.showSuccess(`${target.name} marked as No-Show`);
        if (this.selectedPatient()?.id === target.id) {
          this.clearForm();
        }
        this.loadQueue(); // Refresh
      },
      error: (err: any) => {
        this.loading = false;
        console.error('Failed to mark no-show:', err);
        alert('Action failed. Please try again.');
        this.loadQueue();
      },
    });
  }

  completeConsultation() {
    const patient = this.selectedPatient();
    if (!patient || !patient.appointmentId) return;

    if (!this.diagnosis().trim()) {
      alert('Please enter a diagnosis before completing the consultation.');
      return;
    }

    this.loading = true;

    const consultationData = {
      diagnosis: this.diagnosis(),
      notes: this.clinicalNotes(),
      tests: this.diagnosticTests(),
      prescriptions: this.prescriptions().filter(p => p.drugName).map(p => ({
        drug_name: p.drugName,
        dose: p.dosage,
        duration: p.duration,
      })),
    };

    // 1. Write Consultation (Upsert)
    this.appointmentService.writeConsultation(patient.appointmentId, consultationData).subscribe({
      next: () => {
        // 2. Complete Appointment status
        this.appointmentService.completeAppointment(patient.appointmentId).subscribe({
          next: () => {
            this.loading = false;
            this.showSuccess('Consultation completed successfully');
            this.clearForm();
            this.loadQueue(); // Refresh entire queue from server
          },
          error: () => {
            this.loading = false;
            this.loadQueue();
          },
        });
      },
      error: (err) => {
        this.loading = false;
        console.error('Failed to save consultation:', err);
        alert('Failed to save consultation. Please try again.');
      },
    });
  }

  private clearForm() {
    this.diagnosis.set('');
    this.clinicalNotes.set('');
    this.prescriptions.set([]);
    this.diagnosticTests.set([]);
  }


  // --- Prescription management ---
  addPrescription() {
    this.prescriptions.update(list => [...list, { drugName: '', dosage: '', duration: '' }]);
  }

  removePrescription(index: number) {
    this.prescriptions.update(list => list.filter((_, i) => i !== index));
  }

  updatePrescription(index: number, field: keyof PrescriptionRow, value: string) {
    this.prescriptions.update(list => {
      const copy = [...list];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  // --- Test management ---
  addTest() {
    const test = this.newTestInput().trim();
    if (test && !this.diagnosticTests().includes(test)) {
      this.diagnosticTests.update(t => [...t, test]);
      this.newTestInput.set('');
    }
    this.showTestDropdown.set(false);
  }

  selectTestType(type: { code: string, name: string }) {
    if (!this.diagnosticTests().includes(type.name)) {
      this.diagnosticTests.update(t => [...t, type.name]);
    }
    this.newTestInput.set('');
    this.showTestDropdown.set(false);
  }

  removeTest(index: number) {
    this.diagnosticTests.update(t => t.filter((_, i) => i !== index));
  }

  trackByPrescription(index: number): number {
    return index;
  }

  onTestKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addTest();
    }
  }

  // --- Appointment Request actions ---
  confirmRequest(req: AppointmentRequest) {
    this.appointmentService.confirmAppointment(req.id).subscribe({
      next: () => {
        this.appointmentRequests.update(list => list.filter(r => r.id !== req.id));
        this.loadQueue();
      },
      error: () => { },
    });
  }

  cancelRequest(req: AppointmentRequest) {
    this.appointmentService.cancelAppointment(req.id, 'Cancelled by doctor').subscribe({
      next: () => {
        this.appointmentRequests.update(list => list.filter(r => r.id !== req.id));
      },
      error: () => { },
    });
  }

  confirmAllRequests() {
    const requests = this.appointmentRequests();
    requests.forEach(req => {
      this.appointmentService.confirmAppointment(req.id).subscribe({
        next: () => {
          this.appointmentRequests.update(list => list.filter(r => r.id !== req.id));
          this.loadQueue();
        },
        error: () => { },
      });
    });
  }

  // --- Helpers ---
  getPatientAvatar(name: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e8eaf6&color=3f51b5&bold=true&size=64`;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
}
