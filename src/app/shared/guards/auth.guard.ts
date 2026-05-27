import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../data-access/auth.service';

function isValidJWTToken(token: string | null): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    if (!parts[0] || !parts[1] || !parts[2]) return false;
    atob(parts[1]);
    return true;
  } catch {
    return false;
  }
}

function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload || !payload.exp) return true;
    const expDate = new Date(payload.exp * 1000);
    const now = new Date();
    return expDate <= now;
  } catch {
    return true;
  }
}

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.user();
  
  if (!user) {
    router.navigate(['/login']);
    return false;
  }
  
  // Repartidores deben ir al admin, no al panel de usuario
  if (user.rol === 'repartidor') {
    router.navigate(['/admin/repartidor']);
    return false;
  }
  
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!accessToken && !refreshToken) {
    router.navigate(['/login']);
    return false;
  }
  
  if (!accessToken && (!refreshToken || !isValidJWTToken(refreshToken) || isTokenExpired(refreshToken))) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.navigate(['/login']);
    return false;
  }
  
  if (!accessToken || !isValidJWTToken(accessToken)) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.navigate(['/login']);
    return false;
  }
  
  if (isTokenExpired(accessToken) && (!refreshToken || !isValidJWTToken(refreshToken) || isTokenExpired(refreshToken))) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.navigate(['/login']);
    return false;
  }

  return true;
};