import { Component, inject, signal, ViewChild } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../shared/data-access/auth.service';
import { HttpClient } from '@angular/common/http';
import { Turnstile } from '../shared/ui/turnstile/turnstile';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, Turnstile],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  authService = inject(AuthService);
  private http = inject(HttpClient);

  @ViewChild(Turnstile) turnstile?: Turnstile;

  username = signal('');
  password = signal('');
  showPassword = signal(false);
  turnstileToken = signal('');

  // Recovery signals
  recoveryMode = signal<'username' | 'password' | null>(null);
  recoveryEmail = signal('');
  recoveryIdentifier = signal(''); // Store the identifier used for OTP
  otp = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  recoveryStep = signal<'email' | 'otp' | 'reset' | 'success'>('email');
  recoveryError = signal<string | null>(null);
  recoverySuccess = signal<string | null>(null);
  recoveryLoading = signal(false);

  get error() {
    return this.authService.loginError;
  }

  onSubmit() {
    if (this.authService.loginLoading()) return;
    this.authService.loginError.set(null);

    const user = this.username().trim();
    const pass = this.password();
    const token = this.turnstileToken();

    if (!user || !pass) {
      this.authService.loginError.set('Por favor ingresa usuario y contraseña');
      return;
    }

    if (!token) {
      this.authService.loginError.set('Por favor completa la verificación de seguridad');
      return;
    }

    this.turnstileToken.set('');
    this.authService.login(user, pass, token);
    this.turnstile?.reset();
  }

  openRecovery(mode: 'username' | 'password') {
    this.recoveryMode.set(mode);
    this.recoveryError.set(null);
    this.recoverySuccess.set(null);
    this.recoveryStep.set('email');
    this.recoveryEmail.set('');
    this.recoveryIdentifier.set('');
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
    this.recoveryIdentifier.set(identifier); // Store the identifier for later use

    if (mode === 'username') {
      this.http
        .post<{
          username: string;
          message: string;
        }>('/api/auth/recover-username', { email: identifier })
        .subscribe({
          next: (res) => {
            this.recoverySuccess.set(
              `Tu usuario es: ${res.username}. Se envió a tu correo registrado.`,
            );
            this.recoveryLoading.set(false);
          },
          error: (err) => {
            this.recoveryError.set(err.error?.error || 'Error al recuperar usuario');
            this.recoveryLoading.set(false);
          },
        });
    } else {
      this.http
        .post<{ message: string }>('/api/auth/send-otp', { usernameOrEmail: identifier })
        .subscribe({
          next: () => {
            this.recoveryStep.set('otp');
            this.recoveryLoading.set(false);
          },
          error: (err) => {
            this.recoveryError.set(err.error?.error || 'Error al enviar OTP');
            this.recoveryLoading.set(false);
          },
        });
    }
  }

  verifyOtp() {
    const identifier = this.recoveryIdentifier(); // Use stored identifier
    const otpValue = this.otp();
    const newPass = this.newPassword();
    const confirmPass = this.confirmPassword();

    if (!identifier) {
      this.recoveryError.set(
        'Error: No se ha proporcionado el identificador. Por favor, reinicia el proceso de recuperación.',
      );
      return;
    }

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

    this.http
      .post(
        '/api/auth/reset-password',
        { usernameOrEmail: identifier, otp: otpValue, newPassword: newPass },
        { withCredentials: true },
      )
      .subscribe({
        next: () => {
          this.recoveryStep.set('success');
          this.recoverySuccess.set('Contraseña actualizada correctamente. Ya puedes iniciar sesión.');
          this.recoveryLoading.set(false);
        },
        error: (err) => {
          this.recoveryLoading.set(false);
        },
      });
  }
}
