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

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.user();
  
  // Check if user is valid admin
  if (user && (user.isAdmin || user.rol === 'owner' || user.rol === 'root')) {
    // Also validate that the access token is valid and not expired
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    
    // If no tokens at all, user needs to login again
    if (!accessToken && !refreshToken) {
      router.navigate(['/login']);
      return false;
    }
    
    // If access token is invalid or expired, check refresh token
    if (!accessToken || isTokenExpired(accessToken)) {
      if (!refreshToken || !isValidJWTToken(refreshToken) || isTokenExpired(refreshToken)) {
        // Both tokens are invalid/expired, need to login again
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.navigate(['/login']);
        return false;
      }
      // Refresh token is valid, allow access (interceptor will refresh)
      return true;
    }
    
    return true;
  }

  router.navigate(['/login']);
  return false;
};
