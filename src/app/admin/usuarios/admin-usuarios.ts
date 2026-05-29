import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/data-access/auth.service';
import { User } from '../../backend/models';
import { RolesBackend, Rol, Permiso } from '../../backend/data-access/roles.backend';
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
   rol: 'owner' | 'usuario' | 'repartidor';
   rolId?: string;
 }

interface EditRolPermisosState {
  show: boolean;
  rol?: Rol;
  permisosSeleccionados: string[];
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

  filtrarUsuarios() {
    let resultado = this.usuarios();
    const texto = this.filtroTexto.toLowerCase().trim();
    const tipo = this.filtroTipo;

    if (texto) {
      resultado = resultado.filter(u =>
        (u.username?.toLowerCase().includes(texto)) ||
        (u.nombreCompleto?.toLowerCase().includes(texto)) ||
        (u.cedula?.toLowerCase().includes(texto)) ||
        (u.email?.toLowerCase().includes(texto))
      );
    }

    if (tipo === 'admin') {
      resultado = resultado.filter(u => {
        if (u.rol === 'root' || u.rol === 'owner') return true;
        if (u.rolId) {
          const rol = this.roles().find(r => r.id === u.rolId);
          if (rol && rol.permisos && rol.permisos.length > 0) return true;
        }
        return false;
      });
    } else if (tipo === 'comun') {
      resultado = resultado.filter(u => {
        if (u.rol === 'root' || u.rol === 'owner') return false;
        if (!u.rolId) return true;
        const rol = this.roles().find(r => r.id === u.rolId);
        if (!rol || !rol.permisos || rol.permisos.length === 0) return true;
        return false;
      });
    }

    return resultado;
  }

  onFiltroTextoChange(valor: string) {
    this.filtroTexto = valor;
  }

  onFiltroTipoChange(valor: 'todos' | 'admin' | 'comun') {
    this.filtroTipo = valor;
  }

  get usuariosFiltrados(): UserWithRol[] {
    return this.filtrarUsuarios();
  }

  usuarios = signal<UserWithRol[]>([]);
  roles = signal<Rol[]>([]);
  permisos = signal<Permiso[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  filtroTexto = '';
  filtroTipo: 'todos' | 'admin' | 'comun' = 'todos';

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
    genero: 'no_especificado',
    rol: 'usuario',
    rolId: undefined
  };

  userDetailsTab = signal<'info' | 'rol' | 'password'>('info');
  selectedUserRolData = '';
  newPassword = '';
  
  editRolPermisosState = signal<EditRolPermisosState>({
    show: false,
    permisosSeleccionados: []
  });

  ngOnInit() {
    if (!this.esRoot()) {
      this.router.navigate(['/admin/inicio']);
      return;
    }
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando.set(true);
    
    this.rolesBackend.getPermisos().subscribe({
      next: (permisos) => {
        this.permisos.set(permisos);
        this.rolesBackend.getRoles().subscribe({
          next: (roles) => {
            this.roles.set(roles);
            this.cargarUsuarios();
          },
          error: () => {
            this.cargarUsuarios();
          }
        });
      },
      error: () => {
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
      error: () => {
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
      case 'repartidor':
        return 'Repartidor';
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

  getPermisosDelRol(): Permiso[] {
    const rol = this.getSelectedRolFromId();
    if (!rol) return [];
    return this.permisos().filter(p => rol.permisos.includes(p.id));
  }

  getPermisosCount(): number {
    return this.getSelectedRolFromId()?.permisos?.length || 0;
  }

  openEditPermisos(rol?: Rol) {
    const rolToEdit = rol || this.getSelectedRolFromId();
    if (!rolToEdit) return;
    
    this.editRolPermisosState.set({
      show: true,
      rol: rolToEdit,
      permisosSeleccionados: [...(rolToEdit.permisos || [])]
    });
  }

  closeEditPermisos() {
    this.editRolPermisosState.set({
      show: false,
      permisosSeleccionados: []
    });
  }

  togglePermiso(permisoId: string) {
    const currentState = this.editRolPermisosState();
    const index = currentState.permisosSeleccionados.indexOf(permisoId);
    
    if (index >= 0) {
      this.editRolPermisosState.set({
        ...currentState,
        permisosSeleccionados: currentState.permisosSeleccionados.filter(p => p !== permisoId)
      });
    } else {
      this.editRolPermisosState.set({
        ...currentState,
        permisosSeleccionados: [...currentState.permisosSeleccionados, permisoId]
      });
    }
  }

  isPermisoSelected(permisoId: string): boolean {
    return this.editRolPermisosState().permisosSeleccionados.includes(permisoId);
  }

  saveRolPermisos() {
    const state = this.editRolPermisosState();
    if (!state.rol) return;

    this.rolesBackend.updateRol(state.rol.id, { permisos: state.permisosSeleccionados }).subscribe({
      next: () => {
        this.rolesBackend.getRoles().subscribe({
          next: (roles) => this.roles.set(roles)
        });
        this.closeEditPermisos();
        this.notificationModal.success('Permisos del rol actualizados correctamente');
      },
      error: () => {
        this.error.set('Error al actualizar permisos del rol');
      }
    });
  }

  getModulos(): string[] {
    return Array.from(new Set(this.permisos().map(p => p.modulo)));
  }

  getPermisosPorModulo(modulo: string): Permiso[] {
    return this.permisos().filter(p => p.modulo === modulo);
  }

  saveUserRoleFromDetails() {
    const user = this.selectedUser();
    if (!user) return;

    const rolParts = this.selectedUserRolData.split(':');
    const rol = rolParts[0] as 'owner' | 'usuario' | 'repartidor';
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
      genero: 'no_especificado',
      rol: 'usuario',
      rolId: undefined
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
      rol: userData.rol,
      rolId: userData.rolId,
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
