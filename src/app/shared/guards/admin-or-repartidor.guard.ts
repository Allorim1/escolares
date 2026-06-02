import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../data-access/auth.service';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';

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

async function renewAccessToken(http: HttpClient): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const res = await firstValueFrom(
      http.post<any>('/api/auth/refresh', { refreshToken }, { withCredentials: true })
    );
    if (res.accessToken) {
      localStorage.setItem('accessToken', res.accessToken);
      if (res.refreshToken) {
        localStorage.setItem('refreshToken', res.refreshToken);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const adminOrRepartidorGuard: CanActivateFn = async () => {
   const authService = inject(AuthService);
   const router = inject(Router);
   const http = inject(HttpClient);

   const user = authService.user();
   console.log('adminOrRepartidorGuard - user:', user);
   
   const hasAccess = user && (user.isAdmin || user.rol === 'owner' || user.rol === 'root' || user.rol === 'repartidor');
   console.log('adminOrRepartidorGuard - hasAccess:', hasAccess, 'rol:', user?.rol, 'isAdmin:', user?.isAdmin);
   
   if (hasAccess) {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!accessToken && !refreshToken) {
      router.navigate(['/login']);
      return false;
    }
    
// If only refresh token exists, validate it
     if (!accessToken && refreshToken && (!isValidJWTToken(refreshToken) || isTokenExpired(refreshToken))) {
       localStorage.removeItem('accessToken');
       localStorage.removeItem('refreshToken');
       localStorage.removeItem('user');
       router.navigate(['/login']);
       return false;
     }

// Validate access token format
      if (!accessToken || !isValidJWTToken(accessToken)) {
        // Try to refresh with valid refresh token
        if (refreshToken && isValidJWTToken(refreshToken) && !isTokenExpired(refreshToken)) {
          const renewed = await renewAccessToken(http);
          if (!renewed) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            router.navigate(['/login']);
            return false;
          }
        } else {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          router.navigate(['/login']);
          return false;
        }
      } else if (isTokenExpired(accessToken)) {
        // Access token is expired, try to refresh with valid refresh token
        if (!refreshToken || !isValidJWTToken(refreshToken) || isTokenExpired(refreshToken)) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          router.navigate(['/login']);
          return false;
        }
        // Refresh token is valid, try to renew the access token
        const renewed = await renewAccessToken(http);
        if (!renewed) {
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