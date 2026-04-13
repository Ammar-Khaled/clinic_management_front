import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DoctorService } from '../../services/doctor';
import { AppointmentService } from '../../services/appointment';

export interface QueuePatient {
  id: number;
  appointmentId: number;
  name: string;
  initials: string;
  visitType: string;
  patientCode: string;
  checkInTime: string;
  waitMinutes: number;
  status: 'IN_PROGRESS' | 'CHECKED_IN' | 'WAITING';
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
  private router = inject(Router);

  // --- Doctor profile ---
  doctorName = signal('Dr. Alistair Vance');
  doctorSpecialization = signal('Senior Cardiologist');
  docId = signal<number | null>(null);

  // --- Today's date ---
  todayDate = signal('');
  activeCount = signal(0);

  // --- Queue ---
  queue = signal<QueuePatient[]>([]);
  selectedPatient = signal<QueuePatient | null>(null);

  // --- Consultation form ---
  diagnosis = signal('');
  clinicalNotes = signal('');
  prescriptions = signal<PrescriptionRow[]>([]);
  diagnosticTests = signal<string[]>([]);
  newTestInput = signal('');

  // --- Appointment Requests ---
  appointmentRequests = signal<AppointmentRequest[]>([]);

  // --- Search ---
  searchQuery = signal('');

  ngOnInit() {
    this.setTodayDate();
    this.loadDoctorProfile();
    this.loadQueue();
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
        const doctor = res.doctor || res; // Handle both nested and flat responses
        if (doctor) {
          this.docId.set(doctor.id);
          const name = doctor.user?.first_name && doctor.user?.last_name
            ? `Dr. ${doctor.user.first_name} ${doctor.user.last_name}`
            : doctor.user?.username ? `Dr. ${doctor.user.username}` : 'Dr.';
          this.doctorName.set(name);
          this.doctorSpecialization.set(doctor.specialization || 'Specialist');
          
          // Load appointments for this specific doctor
          this.loadAppointmentRequests(doctor.id);
        }
      },
      error: () => {
        // Fallback for demo
        this.loadAppointmentRequests();
      },
    });
  }

  private loadQueue() {
    this.appointmentService.getQueueToday().subscribe({
      next: (res: any) => {
        const items = Array.isArray(res) ? res : res?.data || res?.queue || [];
        const mapped: QueuePatient[] = items.map((item: any, idx: number) => {
          const checkIn = item.check_in_time ? new Date(item.check_in_time) : new Date();
          const now = new Date();
          const waitMs = now.getTime() - checkIn.getTime();
          const waitMin = Math.max(0, Math.round(waitMs / 60000));
          const name = item.patient_name || item.patient?.name || `Patient ${idx + 1}`;
          const initials = name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase();

          let status: QueuePatient['status'] = 'CHECKED_IN';
          if (item.status === 'IN_PROGRESS' || item.status === 'IN_CONSULTATION') status = 'IN_PROGRESS';

          return {
            id: item.patient_id || item.patient?.id || idx,
            appointmentId: item.id || item.appointment_id || idx,
            name,
            initials,
            visitType: item.visit_type || item.reason || 'General Checkup',
            patientCode: item.patient_code || `#PT-${String(item.patient_id || idx).padStart(4, '0')}`,
            checkInTime: checkIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            waitMinutes: waitMin,
            status,
            age: item.patient_age || item.patient?.age,
            gender: item.patient_gender || item.patient?.gender,
            allergies: item.patient_allergies || item.patient?.allergies || '',
          };
        });

        this.queue.set(mapped);
        this.activeCount.set(mapped.length);
        if (mapped.length > 0 && !this.selectedPatient()) {
          this.selectPatient(mapped[0]);
        }
      },
      error: () => {
        // Fallback demo data
        this.loadFallbackQueue();
      },
    });
  }

  private loadFallbackQueue() {
    const demo: QueuePatient[] = [
      {
        id: 1, appointmentId: 101, name: 'Eleanor Fitzwilliam', initials: 'EF',
        visitType: 'General Checkup', patientCode: '#PT-8821',
        checkInTime: '09:15', waitMinutes: 45, status: 'IN_PROGRESS',
        age: 72, gender: 'Female', allergies: 'Penicillin Allergy',
      },
      {
        id: 2, appointmentId: 102, name: 'Arthur Pendragon', initials: 'AP',
        visitType: 'Post-Op Review', patientCode: '#PT-9012',
        checkInTime: '09:35', waitMinutes: 25, status: 'CHECKED_IN',
        age: 45, gender: 'Male', allergies: '',
      },
      {
        id: 3, appointmentId: 103, name: 'Sarah Connor', initials: 'SC',
        visitType: 'Blood Lab Review', patientCode: '#PT-4423',
        checkInTime: '09:48', waitMinutes: 12, status: 'CHECKED_IN',
        age: 38, gender: 'Female', allergies: '',
      },
    ];
    this.queue.set(demo);
    this.activeCount.set(demo.length);
    this.selectPatient(demo[0]);
  }

  private loadAppointmentRequests(doctorId?: number) {
    this.appointmentService.getScheduledAppointments(doctorId).subscribe({
      next: (appointments: any) => {
        const pending = (Array.isArray(appointments) ? appointments : [])
          .slice(0, 5);

        const colors = [
          { bg: '#e0e7ff', text: '#3730a3' },
          { bg: '#fce7f3', text: '#9d174d' },
          { bg: '#d1fae5', text: '#065f46' },
          { bg: '#fef3c7', text: '#92400e' },
        ];

        const mapped: AppointmentRequest[] = pending.map((a: any, i: number) => {
          const name = a.patient_name || a.patient?.name || a.doctor_name || `Patient ${a.patient_id || a.patient?.id || i}`;
          const initials = name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase();
          const c = colors[i % colors.length];
          return {
            id: a.id,
            name,
            initials,
            date: a.start_datetime 
              ? new Date(a.start_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
              : a.created_at 
                ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                : '',
            bgColor: c.bg,
            textColor: c.text,
          };
        });
        this.appointmentRequests.set(mapped);
      },
      error: () => {
        this.appointmentRequests.set([
          { id: 1, name: 'James Wilson', initials: 'JW', date: 'Oct 26, 14:00', bgColor: '#e0e7ff', textColor: '#3730a3' },
          { id: 2, name: 'Martha Raye', initials: 'MR', date: 'Oct 27, 09:30', bgColor: '#fce7f3', textColor: '#9d174d' },
        ]);
      },
    });
  }

  // --- Actions ---

  selectPatient(patient: QueuePatient) {
    this.selectedPatient.set(patient);
    this.diagnosis.set('');
    this.clinicalNotes.set('');
    this.diagnosticTests.set([]);
    this.prescriptions.set([]);

    // Try to load existing consultation
    if (patient.appointmentId) {
      this.appointmentService.getConsultation(patient.appointmentId).subscribe({
        next: (c: any) => {
          if (c) {
            this.diagnosis.set(c.diagnosis || '');
            this.clinicalNotes.set(c.notes || '');
            this.diagnosticTests.set(c.tests || []);
            if (c.prescriptions && c.prescriptions.length) {
              this.prescriptions.set(c.prescriptions.map((p: any) => ({
                drugName: p.drug_name || '',
                dosage: p.dose || '',
                duration: p.duration || '',
              })));
            }
          }
        },
        error: () => {},
      });
    }
  }

  startVisit(patient: QueuePatient) {
    this.appointmentService.checkInAppointment(patient.appointmentId).subscribe({
      next: () => {
        patient.status = 'IN_PROGRESS';
        this.selectPatient(patient);
        this.queue.update(q => [...q]);
      },
      error: () => {
        patient.status = 'IN_PROGRESS';
        this.selectPatient(patient);
        this.queue.update(q => [...q]);
      },
    });
  }

  markNoShow(patient?: QueuePatient) {
    const target = patient || this.selectedPatient();
    if (!target) return;
    this.appointmentService.noShowAppointment(target.appointmentId).subscribe({
      next: () => {
        this.queue.update(q => q.filter(p => p.id !== target.id));
        if (this.selectedPatient()?.id === target.id) {
          const remaining = this.queue();
          this.selectedPatient.set(remaining.length > 0 ? remaining[0] : null);
        }
        this.activeCount.update(c => Math.max(0, c - 1));
      },
      error: () => {},
    });
  }

  completeConsultation() {
    const patient = this.selectedPatient();
    if (!patient) return;

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

    // Try creating/updating consultation first, then complete appointment
    this.appointmentService.createConsultation(patient.appointmentId, consultationData).subscribe({
      next: () => {
        this.appointmentService.completeAppointment(patient.appointmentId).subscribe({
          next: () => this.removePatientFromQueue(patient),
          error: () => this.removePatientFromQueue(patient),
        });
      },
      error: () => {
        // If create fails (already exists), try updating
        this.appointmentService.updateConsultation(patient.appointmentId, consultationData).subscribe({
          next: () => {
            this.appointmentService.completeAppointment(patient.appointmentId).subscribe({
              next: () => this.removePatientFromQueue(patient),
              error: () => this.removePatientFromQueue(patient),
            });
          },
          error: () => this.removePatientFromQueue(patient),
        });
      },
    });
  }

  private removePatientFromQueue(patient: QueuePatient) {
    this.queue.update(q => q.filter(p => p.id !== patient.id));
    const remaining = this.queue();
    this.selectedPatient.set(remaining.length > 0 ? remaining[0] : null);
    this.activeCount.update(c => Math.max(0, c - 1));
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
  }

  removeTest(index: number) {
    this.diagnosticTests.update(t => t.filter((_, i) => i !== index));
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
      },
      error: () => {},
    });
  }

  declineRequest(req: AppointmentRequest) {
    this.appointmentService.declineAppointment(req.id, 'Declined by doctor').subscribe({
      next: () => {
        this.appointmentRequests.update(list => list.filter(r => r.id !== req.id));
      },
      error: () => {},
    });
  }

  confirmAllRequests() {
    const requests = this.appointmentRequests();
    requests.forEach(req => {
      this.appointmentService.confirmAppointment(req.id).subscribe({
        next: () => {
          this.appointmentRequests.update(list => list.filter(r => r.id !== req.id));
        },
        error: () => {},
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
