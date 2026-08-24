import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../shared/data-access/auth.service';

interface ContrasenaAuditoria {
  id: string;
  userId: string;
  username: string;
  email: string;
  contrasena: string;
  rol: string;
  fecha: string;
  accion: string;
}

@Component({
  selector: 'app-admin-contrasenas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contrasenas.html',
  styleUrl: './contrasenas.css',
})
export class AdminContrasenas implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  contrasenas = signal<ContrasenaAuditoria[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    if (!this.esRoot()) {
      this.error.set('No tienes acceso a esta sección. Solo el usuario root puede ver las contraseñas.');
      this.cargando.set(false);
      return;
    }
    this.cargarContrasenas();
  }

  cargarContrasenas() {
    this.cargando.set(true);
    this.authService.getAllPasswords().subscribe({
      next: (data) => {
        this.contrasenas.set(data || []);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Error al cargar contraseñas');
        this.cargando.set(false);
      },
    });
  }

  esRoot(): boolean {
    return this.authService.user()?.rol === 'root';
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleString('es-VE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
