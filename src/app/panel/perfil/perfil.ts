import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/data-access/auth.service';

@Component({
  selector: 'app-perfil',
  imports: [CommonModule, FormsModule],
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
      this.supervisorKey.set(user.supervisorKey || '');
      // Determinar si el usuario tiene permisos de admin (basado en roles o permisos)
      this.isAdmin.set(this.tienePermisosAdmin(user));
    }
  }

  tienePermisosAdmin(user: any): boolean {
    // Si el usuario tiene rol 'root', tiene acceso total al panel admin
    if (user.rol === 'root') {
      return true;
    }
    
    // Si el usuario tiene rol 'admin', también tiene acceso
    if (user.rol === 'admin') {
      return true;
    }
    
    // Verificar permisos específicos que otorgan acceso al panel admin
    // Estos son los permisos que aparecen en el menú del Panel Admin
    const permisosAdmin = [
      'pedidos_ver', 'tasas_gestionar', 'tasas_ver', 'facturas_registrar',
      'facturas_gestionar', 'gastos_gestionar', 'nomina_ver', 'documentos_ver',
      'conversion_gestionar', 'chat_ver', 'caja_ver'
    ];
    
    // También incluir permisos de Cuentas por Pagar y Panel Web que son parte del panel administrativo
    const permisosAdminExtra = [
      'ver_proveedores', 'ver_retenciones', 'ver_libro_compras',
      'inicio_gestionar', 'productos_gestionar', 'marcas_ver', 'lineas_ver',
      'ofertas_ver', 'usuarios_gestionar', 'roles_gestionar', 'manuales_ver'
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
    this.authService.updateProfile({
      nombreCompleto: this.nombreCompleto(),
      direccion: this.direccion(),
      telefono: this.telefono(),
      cedula: this.cedula(),
      supervisorKey: this.supervisorKey(),
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
