import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/data-access/auth.service';

interface Direccion {
  id: number;
  alias: string;
  direccion: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  principal: boolean;
}

@Component({
  selector: 'app-direcciones',
  templateUrl: './direcciones.html',
  styleUrls: ['./direcciones.css'],
  imports: [FormsModule]
})
export class Direcciones {
  authService = AuthService;
  
  // Mock data - in a real app this would come from a service
  direcciones = signal<Direccion[]>([
    {
      id: 1,
      alias: 'Casa',
      direccion: 'Calle Principal #123, Urb. Los Andes',
      ciudad: 'Caracas',
      estado: 'Distrito Capital',
      codigoPostal: '1010',
      principal: true
    },
    {
      id: 2,
      alias: 'Trabajo',
      direccion: 'Av. Libertador, Edificio Empresas Piso 5',
      ciudad: 'Caracas',
      estado: 'Distrito Capital',
      codigoPostal: '1060',
      principal: false
    }
  ]);
  
  editando = signal(false);
  editandoIndex = signal<number>(-1); // -1 means creating new, >=0 means editing existing
  
  // Form fields for editing/creating
  editAlias = signal('');
  editDireccion = signal('');
  editCiudad = signal('');
  editEstado = signal('');
  editCodigoPostal = signal('');
  editPrincipal = signal(false);
  
  nuevoAlias = signal('');
  nuevaDireccionTexto = signal('');
  nuevaCiudad = signal('');
  nuevoEstado = signal('');
  nuevoCodigoPostal = signal('');
  nuevoPrincipal = signal(false);
  
  guardando = signal(false);

  nuevaDireccion() {
    this.editando.set(true);
    this.editandoIndex.set(-1); // -1 indicates creating new
    this.limpiarFormularioNuevo();
  }

  editarDireccion(dir: Direccion) {
    this.editando.set(true);
    this.editandoIndex.set(dir.id);
    this.cargarFormularioEdicion(dir);
  }

  eliminarDireccion(id: number) {
    if (confirm('¿Estás seguro de que deseas eliminar esta dirección?')) {
      this.direcciones.update(dirs => dirs.filter(d => d.id !== id));
      
      // If we deleted the principal address, make another one principal if exists
      const remaining = this.direcciones();
      if (remaining.length > 0 && !remaining.some(d => d.principal)) {
        this.direcciones.set([
          ...remaining.slice(0, 1).map(d => ({ ...d, principal: true })),
          ...remaining.slice(1)
        ]);
      }
    }
  }

  establecerPrincipal(id: number) {
    this.direcciones.update(dirs =>
      dirs.map(d => ({
        ...d,
        principal: d.id === id
      }))
    );
  }

  crearDireccion() {
    this.guardando.set(true);
    // Simulate API call
    setTimeout(() => {
      const nuevaDir: Direccion = {
        id: Date.now(), // Temporary ID - in real app would come from backend
        alias: this.nuevoAlias(),
        direccion: this.nuevaDireccionTexto(),
        ciudad: this.nuevaCiudad(),
        estado: this.nuevoEstado(),
        codigoPostal: this.nuevoCodigoPostal(),
        principal: this.nuevoPrincipal()
      };
      
      this.direcciones.update(dirs => [...dirs, nuevaDir]);
      this.cancelarNuevaDireccion();
      this.guardando.set(false);
    }, 1000);
  }

  actualizarDireccion() {
    this.guardando.set(true);
    // Simulate API call
    setTimeout(() => {
      const dirActualizada: Direccion = {
        id: this.editandoIndex(),
        alias: this.editAlias(),
        direccion: this.editDireccion(),
        ciudad: this.editCiudad(),
        estado: this.editEstado(),
        codigoPostal: this.editCodigoPostal(),
        principal: this.editPrincipal()
      };
      
      this.direcciones.update(dirs =>
        dirs.map(d => d.id === dirActualizada.id ? dirActualizada : d)
      );
      this.cancelarEdicion();
      this.guardando.set(false);
    }, 1000);
  }

  cancelarEdicion() {
    this.editando.set(false);
    this.editandoIndex.set(-1);
    this.limpiarFormularioEdicion();
  }

  cancelarNuevaDireccion() {
    this.editando.set(false);
    this.editandoIndex.set(-1);
    this.limpiarFormularioNuevo();
  }

  private cargarFormularioEdicion(dir: Direccion) {
    this.editAlias.set(dir.alias);
    this.editDireccion.set(dir.direccion);
    this.editCiudad.set(dir.ciudad);
    this.editEstado.set(dir.estado);
    this.editCodigoPostal.set(dir.codigoPostal);
    this.editPrincipal.set(dir.principal);
  }

  private limpiarFormularioEdicion() {
    this.editAlias.set('');
    this.editDireccion.set('');
    this.editCiudad.set('');
    this.editEstado.set('');
    this.editCodigoPostal.set('');
    this.editPrincipal.set(false);
  }

  private limpiarFormularioNuevo() {
    this.nuevoAlias.set('');
    this.nuevaDireccionTexto.set('');
    this.nuevaCiudad.set('');
    this.nuevoEstado.set('');
    this.nuevoCodigoPostal.set('');
    this.nuevoPrincipal.set(false);
  }
}