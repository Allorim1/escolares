import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../data-access/auth.service';

function isValidJWTToken(token: string): boolean {
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

function isTokenExpired(token: string): boolean {
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

export const adminOrRepartidorGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.user();
  
  const hasAccess = user && (user.isAdmin || user.rol === 'owner' || user.rol === 'root' || user.rol === 'repartidor');
  
if (hasAccess) {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!accessToken && !refreshToken) {
      router.navigate(['/login']);
      return false;
    }
    
    // If only refresh token exists, validate it
    if (!accessToken && (!refreshToken || !isValidJWTToken(refreshToken) || isTokenExpired(refreshToken))) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      router.navigate(['/login']);
      return false;
    }
    
    // Validate access token format
    if (!isValidJWTToken(accessToken)) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      router.navigate(['/login']);
      return false;
    }
    
    // If access token is expired, check refresh token
    if (isTokenExpired(accessToken)) {
      if (!refreshToken || !isValidJWTToken(refreshToken) || isTokenExpired(refreshToken)) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.navigate(['/login']);
        return false;
      }
    }

    return true;
  }

  router.navigate(['/login']);
  return false;
};