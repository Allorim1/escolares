import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../shared/data-access/auth.service';
import { RolesBackend, Rol } from '../../backend/data-access/roles.backend';

interface UserWithRol extends User {
  rolName?: string;
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
  private rolesBackend = inject(RolesBackend);

  usuarios = signal<UserWithRol[]>([]);
  roles = signal<Rol[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  selectedUserRol = signal<{userId: string, rol: string, rolId: string} | null>(null);

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando.set(true);
    
    this.rolesBackend.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.cargarUsuarios();
      },
      error: () => {
        this.cargarUsuarios();
      }
    });
  }

  cargarUsuarios() {
    this.authService.getAllUsers().subscribe({
      next: (users) => {
        const usersWithRoles: UserWithRol[] = users.map(u => {
          const rolName = this.getRolName(u);
          return { ...u, rolName };
        });
        this.usuarios.set(usersWithRoles);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar usuarios');
        this.cargando.set(false);
      },
    });
  }

  getRolName(user: User): string {
    if (user.rolId) {
      const rol = this.roles().find(r => r.id === user.rolId);
      if (rol) return rol.nombre;
    }
    return this.getRolLabel(user.rol);
  }

  openAssignRole(user: UserWithRol) {
    this.selectedUserRol.set({
      userId: user.id,
      rol: user.rol || 'usuario',
      rolId: user.rolId || ''
    });
  }

  closeAssignRole() {
    this.selectedUserRol.set(null);
  }

  saveUserRole() {
    const data = this.selectedUserRol();
    if (!data) return;

    const rolParts = data.rol.split(':');
    const rol = rolParts[0] as 'owner' | 'usuario';
    const rolId = rolParts[1] || undefined;

    this.authService.updateUserRol(data.userId, rol, rolId).subscribe({
      next: () => {
        this.cargarUsuarios();
        this.closeAssignRole();
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Error al cambiar rol');
      },
    });
  }

  cambiarRol(usuario: UserWithRol, nuevoRol: 'owner' | 'usuario') {
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
    return this.authService.user()?.rol === 'owner' || this.authService.user()?.rol === 'root';
  }

  esRoot(): boolean {
    return this.authService.user()?.rol === 'root';
  }

  esAdmin(): boolean {
    return this.esOwner();
  }

  getSelectedRol(): Rol | undefined {
    const data = this.selectedUserRol();
    if (data && data.rol.startsWith('usuario:')) {
      const rolId = data.rol.split(':')[1];
      return this.roles().find(r => r.id === rolId);
    }
    return undefined;
  }

  getRolLabel(rol?: string): string {
    switch (rol) {
      case 'root':
        return 'Root';
      case 'owner':
        return 'Owner';
      case 'usuario':
        return 'Usuario';
      default:
        return 'Usuario';
    }
  }
}
