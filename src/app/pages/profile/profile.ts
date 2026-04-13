import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PatientService } from '../../services/patient';
import { AuthService } from '../../services/auth';
import { PatientProfile } from '../../models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfileComponent implements OnInit {
  profile: PatientProfile | null = null;
  loading = true;
  editing = false;
  saving = false;
  successMsg = '';
  errorMsg = '';

  // Edit form fields
  form = {
    phone_number: '',
    height: '',
    weight: '',
    blood_type: '',
    allergies: '',
  };

  bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  constructor(
    private patientService: PatientService,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.patientService.getProfile().subscribe({
      next: (data) => {
        this.profile = data;
        this.populateForm(data);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMsg = 'Failed to load profile.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  populateForm(p: PatientProfile): void {
    this.form.phone_number = p.phone_number || '';
    this.form.height = p.height?.toString() || '';
    this.form.weight = p.weight?.toString() || '';
    this.form.blood_type = p.blood_type || '';
    this.form.allergies = p.allergies || '';
  }

  startEdit(): void {
    this.editing = true;
    this.successMsg = '';
    this.errorMsg = '';
    if (this.profile) this.populateForm(this.profile);
  }

  cancelEdit(): void {
    this.editing = false;
    this.errorMsg = '';
    if (this.profile) this.populateForm(this.profile);
  }

  saveProfile(): void {
    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.cdr.detectChanges();

    const payload: any = {
      phone_number: this.form.phone_number,
      allergies: this.form.allergies,
      blood_type: this.form.blood_type,
    };

    if (this.form.height) payload.height = parseFloat(this.form.height);
    if (this.form.weight) payload.weight = parseFloat(this.form.weight);

    this.patientService.updateProfile(payload).subscribe({
      next: (data) => {
        this.profile = data;
        this.populateForm(data);
        this.editing = false;
        this.saving = false;
        this.successMsg = 'Profile updated successfully!';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        this.errorMsg = err.error?.detail || err.error?.message || 'Failed to update profile.';
        this.cdr.detectChanges();
      },
    });
  }

  logout(): void {
    this.auth.logout();
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  getGenderIcon(): string {
    if (!this.profile) return 'person';
    return this.profile.gender === 'MALE' ? 'male' : this.profile.gender === 'FEMALE' ? 'female' : 'person';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
}