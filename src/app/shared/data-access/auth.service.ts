import { Injectable, inject } from '@angular/core';
import { AuthBackend } from '../../backend/data-access/auth.backend';
import { Observable } from 'rxjs';

export interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  isOwner?: boolean;
  rol?: 'owner' | 'admin' | 'empleado' | 'usuario';
  nombreCompleto?: string;
  direccion?: string;
  telefono?: string;
  cedula?: string;
  direcciones?: Direccion[];
}

export interface Direccion {
  id: string;
  nombre: string;
  direccion: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private backend = inject(AuthBackend);

  user = this.backend.currentUser.asReadonly();
  isLoggedIn = this.backend.isLoggedIn;
  isAdmin = this.backend.isAdmin;
  loginLoading = this.backend.loginLoading;

  register(username: string, email: string, password: string) {
    this.backend.register(username, email, password);
  }

  login(username: string, password: string) {
    this.backend.login(username, password);
  }

  logout() {
    this.backend.logout();
  }

  currentUser() {
    return this.backend.currentUser();
  }

  updateProfile(profileData: Partial<User>): Observable<any> | undefined {
    return this.backend.updateProfile(profileData);
  }

  getAllUsers() {
    return this.backend.getAllUsers();
  }

  updateUserRol(targetUserId: string, rol: 'admin' | 'empleado' | 'usuario') {
    return this.backend.updateUserRol(targetUserId, rol);
  }

  get registerError() {
    return this.backend.registerError;
  }

  get registerSuccess() {
    return this.backend.registerSuccess;
  }

  get loginError() {
    return this.backend.loginError;
  }
}
