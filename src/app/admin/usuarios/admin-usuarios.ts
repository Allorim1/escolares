import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/data-access/auth.service';

interface UserWithRol {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  rol?: 'owner' | 'admin' | 'empleado' | 'usuario';
}

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-usuarios.html',
  styleUrl: './admin-usuarios.css',
})
export class AdminUsuarios implements OnInit {
  authService = inject(AuthService);

  usuarios = signal<UserWithRol[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.cargando.set(true);
    this.authService.getAllUsers().subscribe({
      next: (users) => {
        this.usuarios.set(users);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar usuarios');
        this.cargando.set(false);
      },
    });
  }

  cambiarRol(usuario: UserWithRol, nuevoRol: 'admin' | 'empleado' | 'usuario') {
    this.authService.updateUserRol(usuario.id, nuevoRol).subscribe({
      next: () => {
        this.cargarUsuarios();
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Error al cambiar rol');
      },
    });
  }

  esOwner(): boolean {
    return this.authService.user()?.rol === 'owner';
  }

  esAdmin(): boolean {
    return this.authService.user()?.rol === 'admin' || this.esOwner();
  }

  getRolLabel(rol?: string): string {
    switch (rol) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      case 'empleado':
        return 'Empleado';
      case 'usuario':
        return 'Usuario';
      default:
        return 'Usuario';
    }
  }
}
