import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../data-access/auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.user();
  if (user && (user.isAdmin || user.rol === 'admin' || user.rol === 'owner')) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
