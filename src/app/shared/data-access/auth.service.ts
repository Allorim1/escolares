import { Injectable, signal } from '@angular/core';

export interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUser = signal<User | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = signal(false);
  readonly isAdmin = signal(false);

  private readonly ADMIN_USER: User = {
    id: 'admin-001',
    username: 'admin',
    email: 'admin@escolares.com',
    isAdmin: true,
  };

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        this.currentUser.set(user);
        this.isLoggedIn.set(true);
        this.isAdmin.set(user.isAdmin || false);
      }
    }
  }

  login(username: string, password: string): boolean {
    if (username === 'admin' && password === 'admin123') {
      const user = this.ADMIN_USER;
      this.currentUser.set(user);
      this.isLoggedIn.set(true);
      this.isAdmin.set(true);
      this.saveToStorage(user);
      return true;
    }
    return false;
  }

  logout() {
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    this.isAdmin.set(false);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('user');
    }
  }

  private saveToStorage(user: User) {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }
}
