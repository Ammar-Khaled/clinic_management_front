import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DoctorService } from '../../services/doctor';

@Component({
  selector: 'app-doctor-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './doctor-signup.html',
  styleUrl: './doctor-signup.css',
})
export class DoctorSignupComponent {
  form: FormGroup;
  errorMsg = '';
  fieldErrors: Record<string, string> = {};
  loading = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private doctorService: DoctorService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      specialization: ['', Validators.required],
      session_duration: [30, [Validators.required, Validators.min(1)]],
      buffer_time: [5, [Validators.required, Validators.min(0)]],
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

    this.doctorService.createDoctor(this.form.value).subscribe({
      next: () => {
        this.router.navigate(['/login'], { queryParams: { registered: 'true' } });
      },
      error: (err) => {
        this.loading = false;
        
        if (err.error) {
          const e = err.error;
          // Map backend errors to fields
          Object.keys(e).forEach(key => {
            if (key !== 'detail' && key !== 'message') {
              this.fieldErrors[key] = Array.isArray(e[key]) ? e[key][0] : e[key];
            }
          });

          this.errorMsg = e.detail || e.message || (Object.keys(this.fieldErrors).length > 0 ? 'Please fix the errors below.' : 'Registration failed. Please try again.');
        } else {
          this.errorMsg = 'Registration failed. Please try again.';
        }
        
        this.cdr.detectChanges();
      },
    });
  }
}
