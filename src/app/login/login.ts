import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../shared/data-access/auth.service';
import { HttpClient } from '@angular/common/http';

 @Component({
   selector: 'app-login',
   standalone: true,
   imports: [CommonModule, FormsModule, RouterLink],
   templateUrl: './login.html',
   styleUrl: './login.css',
 })
 export class Login {
   authService = inject(AuthService);
   private http = inject(HttpClient);
 
   username = signal('');
   password = signal('');
   showPassword = signal(false);
 
// Recovery signals
    recoveryMode = signal<'username' | 'password' | null>(null);
    recoveryEmail = signal('');
    otp = signal('');
    newPassword = signal('');
    confirmPassword = signal('');
    recoveryStep = signal<'email' | 'otp' | 'reset'>('email');
    recoveryError = signal<string | null>(null);
    recoverySuccess = signal<string | null>(null);
    recoveryLoading = signal(false);
 
   get error() {
     return this.authService.loginError;
   }
 
   onSubmit() {
     this.authService.loginError.set(null);
 
     const user = this.username();
     const pass = this.password();
 
     if (!user || !pass) {
       this.authService.loginError.set('Por favor ingresa usuario y contraseña');
       return;
     }
 
     this.authService.login(user, pass);
   }
 
openRecovery(mode: 'username' | 'password') {
      this.recoveryMode.set(mode);
      this.recoveryError.set(null);
      this.recoverySuccess.set(null);
      this.recoveryStep.set('email');
      this.recoveryEmail.set('');
      this.otp.set('');
      this.newPassword.set('');
      this.confirmPassword.set('');
    }
 
   closeRecovery() {
     this.recoveryMode.set(null);
   }
 
sendRecovery() {
      const mode = this.recoveryMode();
      const identifier = this.recoveryEmail();

      if (!identifier) {
        this.recoveryError.set('Por favor ingresa tu email o usuario');
        return;
      }

      this.recoveryLoading.set(true);
      this.recoveryError.set(null);

      if (mode === 'username') {
        this.http.post<{ username: string; message: string }>('/api/auth/recover-username', { email: identifier }).subscribe({
          next: (res) => {
            this.recoverySuccess.set(`Tu usuario es: ${res.username}`);
            this.recoveryLoading.set(false);
          },
          error: (err) => {
            this.recoveryError.set(err.error?.error || 'Error al recuperar usuario');
            this.recoveryLoading.set(false);
          }
        });
      } else {
        this.http.post<{ message: string; email: string }>('/api/auth/send-otp', { usernameOrEmail: identifier }).subscribe({
          next: () => {
            this.recoveryStep.set('otp');
            this.recoveryLoading.set(false);
          },
          error: (err) => {
            this.recoveryError.set(err.error?.error || 'Error al enviar OTP');
            this.recoveryLoading.set(false);
          }
        });
      }
    }

    verifyOtp() {
      const identifier = this.recoveryEmail();
      const otpValue = this.otp();
      const newPass = this.newPassword();
      const confirmPass = this.confirmPassword();

      if (!otpValue) {
        this.recoveryError.set('Por favor ingresa el OTP');
        return;
      }

      if (!newPass || !confirmPass) {
        this.recoveryError.set('Por favor completa ambos campos de contraseña');
        return;
      }

      if (newPass !== confirmPass) {
        this.recoveryError.set('Las contraseñas no coinciden');
        return;
      }

      this.recoveryLoading.set(true);
      this.recoveryError.set(null);

      this.http.post('/api/auth/reset-password', { usernameOrEmail: identifier, otp: otpValue, newPassword: newPass }).subscribe({
        next: () => {
          this.recoveryStep.set('email');
          this.recoveryMode.set(null);
          this.recoverySuccess.set('Contraseña actualizada correctamente');
          this.recoveryLoading.set(false);
        },
        error: (err) => {
          this.recoveryError.set(err.error?.error || 'Error al verificar OTP');
          this.recoveryLoading.set(false);
        }
      });
    }
 }