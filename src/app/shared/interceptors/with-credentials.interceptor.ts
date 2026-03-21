import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap, from } from 'rxjs';

let isRefreshing = false;

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
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;
  const expDate = new Date(payload.exp * 1000);
  const now = new Date();
  const diffMinutes = (expDate.getTime() - now.getTime()) / (1000 * 60);
  return diffMinutes < 5;
}

async function refreshToken(): Promise<{ accessToken?: string; refreshToken?: string; error?: string }> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return { error: 'No refresh token' };

  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    return await res.json();
  } catch (e) {
    return { error: 'Refresh failed' };
  }
}

export const withCredentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  if (typeof window !== 'undefined' && window.localStorage) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      if (isTokenExpiringSoon(token)) {
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
      }
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
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
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              router.navigate(['/login']);
              return throwError(() => new Error('Token expirado'));
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
