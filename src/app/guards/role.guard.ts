import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

interface JwtPayload {
  role?: string;
  user_role?: string;
  userType?: string;
  type?: string;
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return atob(padded);
}

function decodeTokenRole(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    const payloadStr = decodeBase64Url(parts[1]);
    const payload = JSON.parse(payloadStr) as JwtPayload;
    const role = payload.role || payload.user_role || payload.userType || payload.type;

    return role ? role.toUpperCase() : null;
  } catch {
    return null;
  }
}

export const roleGuard = (allowedRoles: string[]): CanActivateFn => (_route, _state) => {
  const router = inject(Router);
  const token = localStorage.getItem('access_token');

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  const userRole = decodeTokenRole(token);
  const allowed = allowedRoles.map((role) => role.toUpperCase());

  if (userRole && allowed.includes(userRole)) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
