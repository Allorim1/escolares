import { HttpInterceptorFn, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, throwError, switchMap, from } from 'rxjs';

let isRefreshing = false;

const publicEndpointsWithoutAuth = [
  '/api/tasas',
  '/api/settings/tasas-status',
  '/api/costos',
  '/api/facturas',
  '/api/proveedores',
];

function isPublicEndpoint(url: string): boolean {
  // Check for exact public endpoints
  if (publicEndpointsWithoutAuth.some(endpoint => url.includes(endpoint))) {
    return true;
  }
  // Only /api/noticias (without path) is public, not /api/noticias/admin or /api/noticias/user-notifications
  const noticiasMatch = url.match(/\/api\/noticias(\?|$)/);
  if (noticiasMatch && !url.includes('/admin') && !url.includes('/user-')) {
    return true;
  }
  return false;
}

function isValidJWTToken(token: string | null): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  if (!parts[0] || !parts[1] || !parts[2]) return false;
  try {
    atob(parts[1]);
    return true;
  } catch {
    return false;
  }
}

function decodeToken(token: string | null): any {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string | null): boolean {
  if (!token || !isValidJWTToken(token)) return true;
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;
  const expDate = new Date(payload.exp * 1000);
  const now = new Date();
  return expDate <= now;
}

async function refreshToken(): Promise<{ accessToken?: string; refreshToken?: string; error?: string }> {
  const refreshTokenValue = localStorage.getItem('refreshToken');
  if (!refreshTokenValue) return { error: 'No refresh token' };

  if (!isValidJWTToken(refreshTokenValue)) {
    return { error: 'Invalid refresh token format' };
  }

  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshTokenValue })
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.error || 'Refresh failed' };
    }
    return data;
  } catch (e) {
    return { error: 'Refresh failed' };
  }
}

export const withCredentialsInterceptor: HttpInterceptorFn = (req, next) => {
   const router = inject(Router);

   // Skip all auth logic for public endpoints
   if (isPublicEndpoint(req.url)) {
     return next(req);
   }

if (typeof window !== 'undefined' && window.localStorage) {
    const token = localStorage.getItem('accessToken');
    const refreshTokenValue = localStorage.getItem('refreshToken');

    // Check if we have any token at all
    if (!token && !refreshTokenValue) {
      return next(req);
    }

    // If only refresh token exists (no access token), validate it
    if (!token && (!refreshTokenValue || !isValidJWTToken(refreshTokenValue) || isTokenExpired(refreshTokenValue))) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      router.navigate(['/login']);
      return next(req);
    }

    // Validate token format
    if (!isValidJWTToken(token)) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      router.navigate(['/login']);
      return next(req);
    }

    // If access token is expired or expiring soon, try to refresh
    if (isTokenExpired(token)) {
      if (!refreshTokenValue || !isValidJWTToken(refreshTokenValue) || isTokenExpired(refreshTokenValue)) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.navigate(['/login']);
        return next(req);
      }
      // Refresh token is valid, proceed to refresh
      if (!isRefreshing) {
        isRefreshing = true;
        return from(refreshToken()).pipe(
          switchMap((data: any) => {
            isRefreshing = false;
            if (data.accessToken) {
              localStorage.setItem('accessToken', data.accessToken);
              if (data.refreshToken) {
                localStorage.setItem('refreshToken', data.refreshToken);
              }
              const clonedReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${data.accessToken}`,
                },
              });
              return next(clonedReq);
            } else {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              router.navigate(['/login']);
              return throwError(() => new Error(data.error || 'Token expirado'));
            }
          }),
          catchError((error: any) => {
            isRefreshing = false;
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            router.navigate(['/login']);
            return throwError(() => new Error('Sesión expirada'));
          })
        );
      }
      // If already refreshing, wait for it
      return new Observable<HttpEvent<unknown>>(subscriber => {
        const checkRefresh = () => {
          if (!isRefreshing) {
            const newToken = localStorage.getItem('accessToken');
            if (newToken && isValidJWTToken(newToken)) {
              req = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`,
                },
              });
            }
            next(req).subscribe({
              next: event => subscriber.next(event),
              error: err => subscriber.error(err),
              complete: () => subscriber.complete()
            });
          } else {
            setTimeout(checkRefresh, 100);
          }
        };
        checkRefresh();
      });
    }

    // Add Authorization header with valid token
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        const storedRefreshToken = localStorage.getItem('refreshToken');
        if (!storedRefreshToken || !isValidJWTToken(storedRefreshToken) || isTokenExpired(storedRefreshToken)) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          router.navigate(['/login']);
          return throwError(() => new Error('Sesión expirada'));
        }
        return from(refreshToken()).pipe(
          switchMap((data: any) => {
            if (data.accessToken) {
              localStorage.setItem('accessToken', data.accessToken);
              if (data.refreshToken) {
                localStorage.setItem('refreshToken', data.refreshToken);
              }
              const clonedReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${data.accessToken}`,
                },
              });
              return next(clonedReq);
            } else {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              router.navigate(['/login']);
              return throwError(() => new Error(data.error || 'Token expirado'));
            }
          }),
          catchError(() => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            router.navigate(['/login']);
            return throwError(() => new Error('Sesión expirada'));
          })
        );
      }
      return throwError(() => error);
    }),
  );
};