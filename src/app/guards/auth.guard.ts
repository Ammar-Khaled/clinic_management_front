import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  if (localStorage.getItem('access_token')) {
    return true;
  }
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};