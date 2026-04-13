import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  form: FormGroup;
  errorMsg = '';
  successMsg = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });

    if (this.route.snapshot.queryParams['registered']) {
      this.successMsg = 'Account created successfully! Please login.';
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMsg = '';

    this.auth.login(this.form.value).subscribe({
      next: (res) => {
        let returnUrl = this.route.snapshot.queryParams['returnUrl'];
        try {
          const payloadStr = atob(res.access.split('.')[1]);
          const payload = JSON.parse(payloadStr);
          const role = (payload.role || '').toUpperCase();

          if (!returnUrl) {
            switch (role) {
              case 'ADMIN':
                returnUrl = '/admin-dashboard';
                break;
              case 'DOCTOR':
                returnUrl = '/doctor-dashboard';
                break;
              case 'RECEPTIONIST':
                returnUrl = '/receptionist';
                break;
              case 'PATIENT':
              default:
                returnUrl = '/dashboard';
            }
          }
        } catch (e) {
          console.warn('Error parsing token payload:', e);
        }
        
        // Ensure returning users fallback to root if empty
        if (!returnUrl) returnUrl = '/dashboard';
        
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.detail || 'Invalid username or password.';
      },
    });
  }
}