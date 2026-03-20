import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../shared/data-access/auth.service';

@Component({
  selector: 'app-ajustes',
  imports: [FormsModule],
  templateUrl: './ajustes.html',
  styleUrl: './ajustes.css',
})
export class Ajustes {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  email = signal('');
  emailPassword = signal('');
  
  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');

  guardando = signal(false);
  mensaje = signal('');
  tipoMensaje = signal<'success' | 'error'>('success');

  constructor() {
    this.cargarEmail();
  }

  cargarEmail() {
    const user = this.authService.currentUser();
    if (user) {
      this.email.set(user.email || '');
    }
  }

  guardarEmail() {
    const nuevoEmail = this.email().trim();
    if (!nuevoEmail) {
      this.mensaje.set('El correo es requerido');
      this.tipoMensaje.set('error');
      return;
    }
    if (!this.emailPassword()) {
      this.mensaje.set('Ingresa tu contraseña actual');
      this.tipoMensaje.set('error');
      return;
    }

    this.guardando.set(true);
    this.http.put('/api/auth/users/update-email', {
      email: nuevoEmail,
      password: this.emailPassword()
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.emailPassword.set('');
        this.email.set(nuevoEmail);
        this.mensaje.set('Correo actualizado correctamente');
        this.tipoMensaje.set('success');
      },
      error: (err) => {
        this.guardando.set(false);
        this.mensaje.set(err.error?.error || 'Error al actualizar el correo');
        this.tipoMensaje.set('error');
      }
    });
  }

  cambiarContrasena() {
    if (!this.currentPassword()) {
      this.mensaje.set('Ingresa tu contraseña actual');
      this.tipoMensaje.set('error');
      return;
    }
    if (!this.newPassword()) {
      this.mensaje.set('Ingresa la nueva contraseña');
      this.tipoMensaje.set('error');
      return;
    }
    if (this.newPassword().length < 6) {
      this.mensaje.set('La contraseña debe tener al menos 6 caracteres');
      this.tipoMensaje.set('error');
      return;
    }
    if (this.newPassword() !== this.confirmPassword()) {
      this.mensaje.set('Las contraseñas no coinciden');
      this.tipoMensaje.set('error');
      return;
    }

    this.guardando.set(true);
    this.http.put('/api/auth/users/update-password', {
      currentPassword: this.currentPassword(),
      newPassword: this.newPassword()
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
        this.mensaje.set('Contraseña cambiada correctamente');
        this.tipoMensaje.set('success');
      },
      error: (err) => {
        this.guardando.set(false);
        this.mensaje.set(err.error?.error || 'Error al cambiar la contraseña');
        this.tipoMensaje.set('error');
      }
    });
  }
}
