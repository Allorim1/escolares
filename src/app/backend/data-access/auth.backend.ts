import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { User } from '../models';

@Injectable({
  providedIn: 'root',
})
export class AuthBackend {
  private readonly API_URL = '/api/auth';
  private readonly STORAGE_KEY_SESSION = 'user';

  currentUser = signal<User | null>(null);
  isLoggedIn = signal(false);
  isAdmin = signal(false);

  registerError = signal<string | null>(null);
  registerSuccess = signal<boolean>(false);
  loginError = signal<string | null>(null);
  loginLoading = signal(false);

  private readonly ADMIN_USER: User = {
    id: 'admin-001',
    username: 'admin',
    email: 'admin@escolares.com',
    isAdmin: true,
  };

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(this.STORAGE_KEY_SESSION);
      if (stored) {
        const user = JSON.parse(stored);
        this.currentUser.set(user);
        this.isLoggedIn.set(true);
        this.isAdmin.set(user.isAdmin || user.rol === 'admin' || user.rol === 'owner');
      }
    }
  }

  register(username: string, email: string, password: string) {
    this.registerError.set(null);
    this.registerSuccess.set(false);

    this.http.post<any>(`${this.API_URL}/register`, { username, email, password }).subscribe({
      next: (response) => {
        this.registerSuccess.set(true);
      },
      error: (error) => {
        this.registerError.set(error.error?.error || 'Error al registrar usuario');
      },
    });
  }

  login(usernameOrEmail: string, password: string) {
    this.loginError.set(null);
    this.loginLoading.set(true);

    const isEmail = usernameOrEmail.includes('@');
    const payload = isEmail
      ? { email: usernameOrEmail, password }
      : { username: usernameOrEmail, password };

    this.http.post<any>(`${this.API_URL}/login`, payload).subscribe({
      next: (response) => {
        this.currentUser.set(response);
        this.isLoggedIn.set(true);
        this.isAdmin.set(response.isAdmin || response.rol === 'admin' || response.rol === 'owner');
        this.saveToStorage(response);
        if (response.accessToken) {
          this.saveToken(response.accessToken);
          if (response.refreshToken) {
            localStorage.setItem('refreshToken', response.refreshToken);
          }
        }
        this.loginLoading.set(false);
        if (response.isAdmin || response.rol === 'admin' || response.rol === 'owner') {
          this.router.navigate(['/admin/inicio']);
        } else {
          this.router.navigate(['/panel/perfil']);
        }
      },
      error: () => {
        this.loginLoading.set(false);
        this.loginError.set('Credenciales inválidas');
      },
    });
  }

  logout() {
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    this.isAdmin.set(false);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.STORAGE_KEY_SESSION);
      localStorage.removeItem('refreshToken');
    }
  }

  updateProfile(profileData: Partial<User>) {
    const userId = this.currentUser()?.id;
    if (!userId) return;

    return this.http.put<any>(`${this.API_URL}/profile`, { ...profileData }).pipe(
      tap({
        next: (response) => {
          this.currentUser.set(response);
          this.saveToStorage(response);
        },
        error: (error) => {
          console.error('Error al actualizar perfil:', error);
        },
      }),
    );
  }

  getAllUsers() {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return this.http.get<any[]>(`${this.API_URL}/users`, { headers });
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('accessToken');
    }
    return null;
  }

  private saveToken(token: string) {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('accessToken', token);
    }
  }

  updateUserRol(targetUserId: string, rol: 'admin' | 'empleado' | 'usuario') {
    return this.http.put<any>(`${this.API_URL}/users/rol`, { targetUserId, rol });
  }

  private saveToStorage(user: User) {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.STORAGE_KEY_SESSION, JSON.stringify(user));
    }
  }
}
