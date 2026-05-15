import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/data-access/auth.service';
import { User } from '../../backend/models';
import { RolesBackend, Rol } from '../../backend/data-access/roles.backend';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';

interface UserWithRol extends User {
  rolName?: string;
}

interface NewUser {
  username: string;
  email: string;
  nombreCompleto: string;
  apellido: string;
  telefono: string;
  direccion: string;
  comentarios: string;
  password: string;
  tipoDocumento: 'cedula' | 'rif' | 'pasaporte' | 'extranjero' | 'gobierno' | 'rif_personal_natural' | 'rif_v' | 'rif_e';
  numeroDocumento: string;
  genero: 'hombre' | 'mujer' | 'no_especificado';
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
  private notificationModal = inject(NotificationModalService);

  usuarios = signal<UserWithRol[]>([]);
  roles = signal<Rol[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  selectedUser = signal<UserWithRol | null>(null);
  editingUser = signal<UserWithRol | null>(null);
  newComentario = '';
  
  showCreateModal = signal(false);
  newUser: NewUser = {
    username: '',
    email: '',
    nombreCompleto: '',
    apellido: '',
    telefono: '',
    direccion: '',
    comentarios: '',
    password: '',
    tipoDocumento: 'cedula',
    numeroDocumento: '',
    genero: 'no_especificado'
  };

  userDetailsTab = signal<'info' | 'rol' | 'password'>('info');
  selectedUserRolData = '';
  newPassword = '';

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

  esOwner(): boolean {
    return this.authService.user()?.rol === 'owner' || this.authService.user()?.rol === 'root';
  }

  esRoot(): boolean {
    return this.authService.user()?.rol === 'root';
  }

  esAdmin(): boolean {
    return this.esOwner();
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
    this.userDetailsTab.set('info');
    this.selectedUserRolData = user.rol || 'usuario';
    this.newPassword = '';
  }

  closeUserDetails() {
    this.selectedUser.set(null);
    this.editingUser.set(null);
    this.userDetailsTab.set('info');
  }

  getSelectedRolFromId(): Rol | undefined {
    if (this.selectedUserRolData.startsWith('usuario:')) {
      const rolId = this.selectedUserRolData.split(':')[1];
      return this.roles().find(r => r.id === rolId);
    }
    return undefined;
  }

  saveUserRoleFromDetails() {
    const user = this.selectedUser();
    if (!user) return;

    const rolParts = this.selectedUserRolData.split(':');
    const rol = rolParts[0] as 'owner' | 'usuario';
    const rolId = rolParts[1] || undefined;

    this.authService.updateUserRol(user.id, rol, rolId).subscribe({
      next: () => {
        this.cargarUsuarios();
        this.notificationModal.success('Rol actualizado correctamente');
      },
      error: () => {
        this.error.set('Error al cambiar rol');
      },
    });
  }

  changePasswordFromDetails() {
    const user = this.selectedUser();
    if (!user || !this.newPassword) {
      this.error.set('La contraseña es requerida');
      return;
    }

    this.http.put(`/api/auth/users/${user.id}/password`, {
      newPassword: this.newPassword,
    }).subscribe({
      next: () => {
        this.newPassword = '';
        this.userDetailsTab.set('info');
        this.notificationModal.success('Contraseña actualizada correctamente');
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Error al cambiar contraseña');
      },
    });
  }

  confirmDeleteUserFromDetails() {
    const user = this.selectedUser();
    if (!user) return;

    if (confirm(`¿Estás seguro de eliminar al usuario "${user.username}"?`)) {
      this.http.delete(`/api/auth/users/${user.id}`).subscribe({
        next: () => {
          this.closeUserDetails();
          this.cargarUsuarios();
          this.notificationModal.success('Usuario eliminado correctamente');
        },
        error: (err) => {
          this.error.set(err.error?.error || 'Error al eliminar usuario');
        },
      });
    }
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
        this.notificationModal.success('Usuario guardado correctamente');
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
        this.notificationModal.success('Comentario agregado correctamente');
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Error al agregar comentario');
      },
    });
  }

  openCreateUser() {
    this.showCreateModal.set(true);
    this.newUser = {
      username: '',
      email: '',
      nombreCompleto: '',
      apellido: '',
      telefono: '',
      direccion: '',
      comentarios: '',
      password: '',
      tipoDocumento: 'cedula',
      numeroDocumento: '',
      genero: 'no_especificado'
    };
  }

  closeCreateUser() {
    this.showCreateModal.set(false);
  }

  createUser() {
    const userData = this.newUser;
    if (!userData.username || !userData.password || !userData.email) {
      this.error.set('Usuario, email y contraseña son requeridos');
      return;
    }

    // Construir el documento completo según el tipo
    let documentoCompleto = '';
    const tipo = userData.tipoDocumento;
    const numero = userData.numeroDocumento;

    switch (tipo) {
      case 'cedula':
        documentoCompleto = 'V-' + numero;
        break;
      case 'rif':
        // Para RIF en creación de usuarios, asumimos V- (natural) por defecto
        documentoCompleto = 'V-' + numero;
        break;
      case 'rif_personal_natural':
        documentoCompleto = 'V-' + numero;
        break;
      case 'rif_v':
        documentoCompleto = 'V-' + numero;
        break;
      case 'rif_e':
        documentoCompleto = 'E-' + numero;
        break;
      case 'pasaporte':
        documentoCompleto = numero;
        break;
      case 'extranjero':
        documentoCompleto = 'E-' + numero;
        break;
      case 'gobierno':
        documentoCompleto = 'G-' + numero;
        break;
      default:
        documentoCompleto = numero;
    }

    this.http.post('/api/auth/register-simple', {
      username: userData.username,
      email: userData.email,
      password: userData.password,
      nombreCompleto: userData.nombreCompleto,
      apellido: userData.apellido,
      telefono: userData.telefono,
      direccion: userData.direccion,
      comentarios: userData.comentarios,
      rif: documentoCompleto,
      tipoDocumento: tipo,
      numeroDocumento: numero,
      genero: userData.genero,
    }).subscribe({
      next: () => {
        this.cargarUsuarios();
        this.closeCreateUser();
        this.notificationModal.success('Usuario creado correctamente');
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Error al crear usuario');
      },
    });
  }
}
