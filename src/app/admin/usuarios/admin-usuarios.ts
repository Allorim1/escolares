import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
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
  private http = inject(HttpClient);
  private router = inject(Router);

  usuarios = signal<UserWithRol[]>([]);
  roles = signal<Rol[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  selectedUserRol = signal<{userId: string, rol: string, rolId: string} | null>(null);
  selectedUser = signal<UserWithRol | null>(null);
  editingUser = signal<UserWithRol | null>(null);
  newComentario = '';

  ngOnInit() {
    if (!this.esRoot()) {
      this.router.navigate(['/admin/inicio']);
      return;
    }
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

  openUserDetails(user: UserWithRol) {
    this.selectedUser.set(user);
    this.editingUser.set({ ...user });
  }

  closeUserDetails() {
    this.selectedUser.set(null);
    this.editingUser.set(null);
  }

  saveUserDetails() {
    const user = this.editingUser();
    if (!user) return;

    this.http.put(`/api/auth/users/${user.id}`, {
      username: user.username,
      email: user.email,
      nombreCompleto: user.nombreCompleto,
      telefono: user.telefono,
      direccion: user.direccion,
      cedula: user.cedula,
      tipoPersona: user.tipoPersona,
      comentarios: user.comentarios,
    }).subscribe({
      next: () => {
        this.cargarUsuarios();
        this.closeUserDetails();
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Error al guardar usuario');
      },
    });
  }

  agregarComentario() {
    const user = this.editingUser();
    const comentario = this.newComentario.trim();
    if (!user || !comentario) return;

    const comentariosActuales = user.comentarios || '';
    const nuevoComentario = comentariosActuales 
      ? `${comentariosActuales}\n${new Date().toLocaleDateString('es-VE')}: ${comentario}`
      : `${new Date().toLocaleDateString('es-VE')}: ${comentario}`;

    this.http.put(`/api/auth/users/${user.id}`, {
      comentarios: nuevoComentario,
    }).subscribe({
      next: () => {
        this.cargarUsuarios();
        const updatedUser = this.usuarios().find(u => u.id === user.id);
        if (updatedUser) {
          this.editingUser.set({ ...updatedUser, comentarios: nuevoComentario });
        }
        this.newComentario = '';
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Error al agregar comentario');
      },
    });
  }
}
