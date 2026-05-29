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

export const noAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.user();
  
  // Check if user is already logged in with valid tokens
  if (user) {
    const accessToken = localStorage.getItem('accessToken');
    
    // If access token is valid, redirect to profile
    if (accessToken && isValidJWTToken(accessToken) && !isTokenExpired(accessToken)) {
      router.navigate(['/panel/perfil']);
      return false;
    }
  }
  
  // User not logged in or tokens expired, allow access to login
  return true;
};