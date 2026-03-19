import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/data-access/auth.service';

@Component({
  selector: 'app-perfil',
  imports: [FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil {
  authService = inject(AuthService);

  editando = signal(false);
  guardando = signal(false);

  nombreCompleto = signal('');
  direccion = signal('');
  telefono = signal('');
  cedula = signal('');

  constructor() {
    this.cargarDatos();
  }

  cargarDatos() {
    const user = this.authService.currentUser();
    if (user) {
      this.nombreCompleto.set(user.nombreCompleto || '');
      this.direccion.set(user.direccion || '');
      this.telefono.set(user.telefono || '');
      this.cedula.set(user.cedula || '');
    }
  }

  editar() {
    this.editando.set(true);
  }

  cancelar() {
    this.cargarDatos();
    this.editando.set(false);
  }

  guardar() {
    this.guardando.set(true);
    this.authService.updateProfile({
      nombreCompleto: this.nombreCompleto(),
      direccion: this.direccion(),
      telefono: this.telefono(),
      cedula: this.cedula(),
    })?.subscribe({
      next: (user) => {
        this.guardando.set(false);
        this.editando.set(false);
        alert('Perfil actualizado correctamente');
      },
      error: (err) => {
        this.guardando.set(false);
        console.error('Error guardando perfil:', err);
        alert('Error al guardar el perfil');
      }
    });
  }
}
