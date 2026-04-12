import { Component } from '@angular/core';
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
  loading = false;

  bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
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

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMsg = '';

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
        this.errorMsg =
          err.error?.username?.[0] ||
          err.error?.email?.[0] ||
          err.error?.profile?.phone_number?.[0] ||
          err.error?.detail ||
          'Registration failed. Please try again.';
      },
    });
  }
}