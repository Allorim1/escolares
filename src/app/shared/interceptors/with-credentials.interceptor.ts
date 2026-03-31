import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap, from } from 'rxjs';

let isRefreshing = false;

function isValidJWTToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  // Verify the parts are non-empty base64 strings
  if (!parts[0] || !parts[1] || !parts[2]) return false;
  // Try to decode the payload to verify it's valid base64 JSON
  try {
    atob(parts[1]);
    return true;
  } catch {
    return false;
  }
}

function decodeToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

function isTokenExpiringSoon(token: string): boolean {
  // First validate the token format
  if (!isValidJWTToken(token)) return false; // Invalid tokens are not "expiring soon"
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;
  const expDate = new Date(payload.exp * 1000);
  const now = new Date();
  const diffMinutes = (expDate.getTime() - now.getTime()) / (1000 * 60);
  return diffMinutes < 5;
}

async function refreshToken(): Promise<{ accessToken?: string; refreshToken?: string; error?: string }> {
  const refreshTokenValue = localStorage.getItem('refreshToken');
  if (!refreshTokenValue) return { error: 'No refresh token' };

  // Validate refresh token format before trying to refresh
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

  if (typeof window !== 'undefined' && window.localStorage) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Check if token has valid JWT format
      if (!isValidJWTToken(token)) {
        // Invalid token format - clear and continue without it
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        // Don't redirect here, just continue without the invalid token
        // The backend will return 401 if auth is required, and we'll handle it there
      } else if (isTokenExpiringSoon(token)) {
        if (!isRefreshing) {
          isRefreshing = true;
          return from(refreshToken()).pipe(
            switchMap((data: any) => {
              if (data.accessToken) {
                localStorage.setItem('accessToken', data.accessToken);
                if (data.refreshToken) {
                  localStorage.setItem('refreshToken', data.refreshToken);
                }
                isRefreshing = false;
                req = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${data.accessToken}`,
                  },
                });
                return next(req);
              } else {
                isRefreshing = false;
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                router.navigate(['/login']);
                return throwError(() => new Error('Token expirado'));
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
      } else {
        req = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    }
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return from(refreshToken()).pipe(
          switchMap((data: any) => {
            if (data.accessToken) {
              localStorage.setItem('accessToken', data.accessToken);
              if (data.refreshToken) {
                localStorage.setItem('refreshToken', data.refreshToken);
              }
              req = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${data.accessToken}`,
                },
              });
              return next(req);
            } else {
              // Refresh failed - clean tokens but don't auto-redirect
              // Let the component handle the error
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              return throwError(() => new Error(data.error || 'Token expirado'));
            }
          }),
          catchError(() => {
            // Refresh failed due to network error - clean tokens but don't auto-redirect
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            return throwError(() => new Error('Sesión expirada'));
          })
        );
      }
      return throwError(() => error);
    }),
  );
};
