import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { PatientService } from '../../services/patient';
import { PatientProfile } from '../../models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfileComponent implements OnInit {
  profile: PatientProfile | null = null;
  form!: FormGroup;
  editing = false;
  loading = true;
  saving = false;
  successMsg = '';
  errorMsg = '';

  bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  constructor(private patientService: PatientService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.patientService.getProfile().subscribe({
      next: (data) => {
        this.profile = data;
        this.buildForm(data);
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Failed to load profile.';
        this.loading = false;
      },
    });
  }

  buildForm(p: PatientProfile): void {
    this.form = this.fb.group({
      phone_number: [p.phone_number],
      height: [p.height],
      weight: [p.weight],
      blood_type: [p.blood_type],
      allergies: [p.allergies],
    });
  }

  toggleEdit(): void {
    this.editing = !this.editing;
    this.successMsg = '';
    this.errorMsg = '';
    if (this.editing && this.profile) {
      this.buildForm(this.profile);
    }
  }

  save(): void {
    this.saving = true;
    this.patientService.updateProfile(this.form.value).subscribe({
      next: (data) => {
        this.profile = data;
        this.editing = false;
        this.saving = false;
        this.successMsg = 'Profile updated successfully!';
      },
      error: () => {
        this.saving = false;
        this.errorMsg = 'Failed to update profile.';
      },
    });
  }
}