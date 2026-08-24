import { Injectable, inject } from '@angular/core';
import { AuthBackend } from '../../backend/data-access/auth.backend';
import { Observable } from 'rxjs';
import { User, Direccion, UserSession } from '../../backend/models';

export type { User, Direccion, UserSession };


@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private backend = inject(AuthBackend);

  user = this.backend.currentUser.asReadonly();
  isLoggedIn = this.backend.isLoggedIn;
  isAdmin = this.backend.isAdmin;
  loginLoading = this.backend.loginLoading;

  register(username: string, email: string, password: string, extraData?: { 
    rif?: string; 
    telefono?: string; 
    direccion?: string; 
    tipoPersona?: string; 
    nombreCompleto?: string; 
    genero?: string;
    tipoDocumento?: string;
    numeroDocumento?: string;
  }) {
    this.backend.register(username, email, password, extraData);
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

  getAllSessions() {
    return this.backend.getAllSessions();
  }

  getMySessions() {
    return this.backend.getMySessions();
  }

  terminateSession(sessionId: string) {
    return this.backend.terminateSession(sessionId);
  }

  terminateAllUserSessions(userId: string) {
    return this.backend.terminateAllUserSessions(userId);
  }

  getAllPasswords() {
    return this.backend.getAllPasswords();
  }

  updateUserRol(targetUserId: string, rol: 'usuario' | 'repartidor', rolId?: string) {
    return this.backend.updateUserRol(targetUserId, rol, rolId);
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
