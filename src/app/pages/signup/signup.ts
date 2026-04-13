import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class SignupComponent {
  form: FormGroup;
  errorMsg = '';
  fieldErrors: Record<string, string> = {};
  loading = false;
  showPassword = false;

  bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      date_of_birth: ['', Validators.required],
      gender: ['', Validators.required],
      phone_number: ['', Validators.required],
      height: [null, [Validators.required, Validators.min(1)]],
      weight: [null, [Validators.required, Validators.min(1)]],
      blood_type: [''],
      allergies: [''],
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  getFieldError(field: string): string {
    return this.fieldErrors[field] || '';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.fieldErrors = {};
    this.cdr.detectChanges();

    const v = this.form.value;
    const payload = {
      username: v.username,
      password: v.password,
      email: v.email,
      first_name: v.first_name,
      last_name: v.last_name,
      profile: {
        date_of_birth: v.date_of_birth,
        gender: v.gender,
        phone_number: v.phone_number,
        height: v.height,
        weight: v.weight,
        blood_type: v.blood_type || '',
        allergies: v.allergies || '',
      },
    };

    this.auth.register(payload).subscribe({
      next: () => {
        this.router.navigate(['/login'], { queryParams: { registered: 'true' } });
      },
      error: (err) => {
        this.loading = false;

        // Parse field-level errors from backend
        if (err.error) {
          const e = err.error;

          // Top-level field errors
          if (e.username) this.fieldErrors['username'] = Array.isArray(e.username) ? e.username[0] : e.username;
          if (e.email) this.fieldErrors['email'] = Array.isArray(e.email) ? e.email[0] : e.email;
          if (e.password) this.fieldErrors['password'] = Array.isArray(e.password) ? e.password[0] : e.password;
          if (e.first_name) this.fieldErrors['first_name'] = Array.isArray(e.first_name) ? e.first_name[0] : e.first_name;
          if (e.last_name) this.fieldErrors['last_name'] = Array.isArray(e.last_name) ? e.last_name[0] : e.last_name;

          // Profile nested errors
          if (e.profile) {
            const p = e.profile;
            if (p.date_of_birth) this.fieldErrors['date_of_birth'] = Array.isArray(p.date_of_birth) ? p.date_of_birth[0] : p.date_of_birth;
            if (p.gender) this.fieldErrors['gender'] = Array.isArray(p.gender) ? p.gender[0] : p.gender;
            if (p.phone_number) this.fieldErrors['phone_number'] = Array.isArray(p.phone_number) ? p.phone_number[0] : p.phone_number;
            if (p.height) this.fieldErrors['height'] = Array.isArray(p.height) ? p.height[0] : p.height;
            if (p.weight) this.fieldErrors['weight'] = Array.isArray(p.weight) ? p.weight[0] : p.weight;
            if (p.blood_type) this.fieldErrors['blood_type'] = Array.isArray(p.blood_type) ? p.blood_type[0] : p.blood_type;
          }

          // General error message
          if (Object.keys(this.fieldErrors).length > 0) {
            this.errorMsg = 'Please fix the errors below.';
          } else {
            this.errorMsg = e.detail || e.message || 'Registration failed. Please try again.';
          }
        } else {
          this.errorMsg = 'Registration failed. Please try again.';
        }

        this.cdr.detectChanges();
      },
    });
  }
}