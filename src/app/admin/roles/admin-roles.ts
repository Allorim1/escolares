import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { RolesBackend, Rol, Permiso } from '../../backend/data-access/roles.backend';

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [FormsModule, TitleCasePipe],
  templateUrl: './admin-roles.html',
  styleUrl: './admin-roles.css',
})
export class AdminRoles implements OnInit {
  private rolesBackend = inject(RolesBackend);

  roles = signal<Rol[]>([]);
  permisos = signal<Permiso[]>([]);
  loading = signal(true);
  
  showModal = signal(false);
  isEditing = signal(false);
  editingRolId = signal<string | null>(null);
  
  formNombre = '';
  formDescripcion = '';
  formPermisos: string[] = [];
  formEsDefault = false;
  formEsVendedor = false;
  formComision = 0;

  permisosPorModulo = signal<{ modulo: string; permisos: Permiso[] }[]>([]);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.rolesBackend.getPermisos().subscribe({
      next: (permisos) => {
        this.permisos.set(permisos);
        
        const grouped = permisos.reduce((acc, p) => {
          if (!acc[p.modulo]) {
            acc[p.modulo] = [];
          }
          acc[p.modulo].push(p);
          return acc;
        }, {} as Record<string, Permiso[]>);
        
        this.permisosPorModulo.set(
          Object.entries(grouped).map(([modulo, perms]) => ({
            modulo,
            permisos: perms
          }))
        );
      }
    });

    this.rolesBackend.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  openAddModal() {
    this.isEditing.set(false);
    this.editingRolId.set(null);
    this.formNombre = '';
    this.formDescripcion = '';
    this.formPermisos = [];
    this.formEsDefault = false;
    this.formEsVendedor = false;
    this.formComision = 0;
    this.showModal.set(true);
  }

  openEditModal(rol: Rol) {
    this.isEditing.set(true);
    this.editingRolId.set(rol.id);
    this.formNombre = rol.nombre;
    this.formDescripcion = rol.descripcion;
    this.formPermisos = [...rol.permisos];
    this.formEsDefault = rol.esDefault;
    this.formEsVendedor = rol.esVendedor || false;
    this.formComision = rol.comision || 0;
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.isEditing.set(false);
    this.editingRolId.set(null);
  }

  togglePermiso(permisoId: string) {
    if (this.formPermisos.includes(permisoId)) {
      this.formPermisos = this.formPermisos.filter(p => p !== permisoId);
    } else {
      this.formPermisos = [...this.formPermisos, permisoId];
    }
  }

  selectAllInModulo(modulo: string) {
    const permisosModulo = this.permisos().filter(p => p.modulo === modulo).map(p => p.id);
    const nuevosPermisos = [...new Set([...this.formPermisos, ...permisosModulo])];
    this.formPermisos = nuevosPermisos;
  }

  deselectAllInModulo(modulo: string) {
    const permisosModulo = this.permisos().filter(p => p.modulo === modulo).map(p => p.id);
    this.formPermisos = this.formPermisos.filter(p => !permisosModulo.includes(p));
  }

  saveRol() {
    if (!this.formNombre.trim()) {
      alert('Por favor ingresa el nombre del rol');
      return;
    }

    const rolData = {
      nombre: this.formNombre,
      descripcion: this.formDescripcion,
      permisos: this.formPermisos,
      esDefault: this.formEsDefault,
      esVendedor: this.formEsVendedor,
      comision: this.formEsVendedor ? this.formComision : 0
    };

    if (this.isEditing() && this.editingRolId()) {
      this.rolesBackend.updateRol(this.editingRolId()!, rolData).subscribe({
        next: () => {
          this.loadData();
          this.closeModal();
          alert('Rol actualizado correctamente');
        },
        error: (err) => {
          alert(err.error?.error || 'Error al actualizar rol');
        }
      });
    } else {
      this.rolesBackend.createRol(rolData).subscribe({
        next: () => {
          this.loadData();
          this.closeModal();
          alert('Rol creado correctamente');
        },
        error: (err) => {
          alert(err.error?.error || 'Error al crear rol');
        }
      });
    }
  }

  deleteRol(id: string, nombre: string) {
    if (!confirm(`¿Estás seguro de eliminar el rol "${nombre}"?`)) {
      return;
    }

    this.rolesBackend.deleteRol(id).subscribe({
      next: () => {
        this.loadData();
        alert('Rol eliminado correctamente');
      },
      error: (err) => {
        alert(err.error?.error || 'Error al eliminar rol');
      }
    });
  }

  getPermisoNombre(id: string): string {
    const permiso = this.permisos().find(p => p.id === id);
    return permiso?.nombre || id;
  }
}
