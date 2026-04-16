import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth';
import { SocialAuthService, GoogleSigninButtonModule } from '@abacritt/angularx-social-login';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, GoogleSigninButtonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit {
  form: FormGroup;
  errorMsg = '';
  successMsg = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private socialAuth: SocialAuthService,
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

  ngOnInit(): void {
    this.socialAuth.authState.subscribe((user) => {
      if (user && user.idToken) {
        this.onGoogleLogin(user.idToken);
      }
    });
  }

  onGoogleLogin(idToken: string): void {
    this.loading = true;
    this.errorMsg = '';
    this.auth.loginWithGoogle(idToken).subscribe({
      next: (res) => this.handleAuthSuccess(res),
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.detail || 'Google authentication failed.';
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMsg = '';

    this.auth.login(this.form.value).subscribe({
      next: (res) => this.handleAuthSuccess(res),
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.detail || 'Invalid username or password.';
      },
    });
  }

  private handleAuthSuccess(res: any): void {
    const accessToken = res.access;
    let returnUrl = this.route.snapshot.queryParams['returnUrl'];
    try {
      const payloadStr = atob(accessToken.split('.')[1]);
      const payload = JSON.parse(payloadStr);
      
      // Get role from user object in response or fallback to payload
      const role = (res.user?.role || payload.role || '').toUpperCase();

      // Check if profile completion is required (only for Patients)
      if (res.has_profile === false && role === 'PATIENT') {
        this.router.navigate(['/complete-profile']);
        return;
      }

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
    
    if (!returnUrl) returnUrl = '/dashboard';
    this.router.navigateByUrl(returnUrl);
  }
}