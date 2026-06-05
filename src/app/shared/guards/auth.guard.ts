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
  
  // Repartidores van a su panel específico
  if (user.rol === 'repartidor') {
    router.navigate(['/repartidor']);
    return false;
  }
  
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!accessToken && !refreshToken) {
    router.navigate(['/login']);
    return false;
  }
  
  // With HTTP-only cookies, tokens may be on server but not in localStorage
  // So we allow access if user exists and has valid token OR if user exists (cookies exist)
  if (!accessToken && refreshToken && !isValidJWTToken(refreshToken)) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.navigate(['/login']);
    return false;
  }
  
  if (!accessToken && !isValidJWTToken(refreshToken)) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.navigate(['/login']);
    return false;
  }
  
  if (!accessToken || !isValidJWTToken(accessToken)) {
    // No access token - could be HTTP-only cookie, allow passage
    // Server will validate cookie on API calls
    return true;
  }
  
  if (isTokenExpired(accessToken) && !refreshToken) {
    // Token expired but no refresh - could be cookies, allow
    return true;
  }

  return true;
};