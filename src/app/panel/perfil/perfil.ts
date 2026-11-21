import { Component, inject, signal, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/data-access/auth.service';
import { User } from '../../backend/models';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';

@Component({
  selector: 'app-perfil',
  imports: [FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {
  authService = inject(AuthService);
  private notificationModal = inject(NotificationModalService);

  editando = signal(false);
  guardando = signal(false);

  nombreCompleto = signal('');
  direccion = signal('');
  telefono = signal('');
  cedula = signal('');
  tipoPersona = signal<'natural' | 'juridica'>('natural');
  comentarios = signal('');
  supervisorKey = signal('');
  showSupervisorKey = signal(false);
  isAdmin = signal(false);

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    const user = this.authService.currentUser();
    if (user) {
      this.nombreCompleto.set(user.nombreCompleto || '');
      this.direccion.set(user.direccion || '');
      this.telefono.set(user.telefono || '');
      this.cedula.set(user.cedula || '');
      this.tipoPersona.set(user.tipoPersona || 'natural');
      this.comentarios.set(user.comentarios || '');
      this.supervisorKey.set(user.supervisorKey || '');
      // Determinar si el usuario tiene permisos de admin (basado en roles o permisos)
      this.isAdmin.set(this.tienePermisosAdmin(user));
    }
  }

  tienePermisosAdmin(user: User | null): boolean {
    if (!user) return false;
    if (user.rol === 'root' || user.isAdmin) {
      return true;
    }

    // Verificar permisos específicos que otorgan acceso al panel admin
    // Estos son los permisos que aparecen en el menú del Panel Admin
    const permisosAdmin = [
      'pedidos_ver',
      'tasas_gestionar',
      'tasas_ver',
      'facturas_registrar',
      'chat_ver',
    ];

    // También incluir permisos de Panel Web que son parte del panel administrativo
    const permisosAdminExtra = [
      'inicio_gestionar',
      'productos_gestionar',
      'marcas_ver',
      'lineas_ver',
      'ofertas_ver',
      'usuarios_gestionar',
      'roles_gestionar',
      'manuales_ver',
    ];

    const todosPermisosAdmin = [...permisosAdmin, ...permisosAdminExtra];

    if (user.permisos && Array.isArray(user.permisos)) {
      return user.permisos.some((p: string) => todosPermisosAdmin.includes(p));
    }

    return false;
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
    this.authService
      .updateProfile({
        nombreCompleto: this.nombreCompleto(),
        direccion: this.direccion(),
        telefono: this.telefono(),
        cedula: this.cedula(),
        tipoPersona: this.tipoPersona(),
        comentarios: this.comentarios(),
        supervisorKey: this.supervisorKey(),
      })
      ?.subscribe({
        next: () => {
          this.guardando.set(false);
          this.editando.set(false);
          this.notificationModal.success('Perfil actualizado correctamente');
        },
        error: (err) => {
          this.guardando.set(false);
          console.error('Error guardando perfil:', err);
          this.notificationModal.error('Error al guardar el perfil');
        },
      });
  }
}
