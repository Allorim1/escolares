import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, Direccion } from '../../shared/data-access/auth.service';

interface DireccionUsuario extends Direccion {
  alias?: string;
  calle?: string;
  ciudad?: string;
  estado?: string;
  codigoPostal?: string;
  principal?: boolean;
}

@Component({
  selector: 'app-direcciones',
  standalone: true,
  templateUrl: './direcciones.html',
  styleUrls: ['./direcciones.css'],
  imports: [FormsModule],
})
export class Direcciones {
  authService = inject(AuthService);

  direcciones = signal<DireccionUsuario[]>([]);
  editando = signal(false);
  editandoId = signal<string | null>(null);
  guardando = signal(false);
  error = signal('');

  formAlias = signal('');
  formCalle = signal('');
  formCiudad = signal('');
  formEstado = signal('');
  formCodigoPostal = signal('');
  formPrincipal = signal(false);

  readonly estadosVenezuela = [
    'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar', 'Carabobo',
    'Cojedes', 'Delta Amacuro', 'Distrito Capital', 'Falcón', 'Guárico', 'Lara',
    'Mérida', 'Miranda', 'Monagas', 'Nueva Esparta', 'Portuguesa', 'Sucre',
    'Táchira', 'Trujillo', 'La Guaira', 'Yaracuy', 'Zulia',
  ];

  readonly ciudadesPorEstado: Record<string, string[]> = {
    'Distrito Capital': ['Caracas'],
    Miranda: ['Los Teques', 'Guarenas', 'Guatire', 'Petare', 'Charallave'],
    Carabobo: ['Valencia', 'Puerto Cabello', 'Naguanagua'],
    Zulia: ['Maracaibo', 'Cabimas', 'San Francisco'],
    Lara: ['Barquisimeto', 'Cabudare', 'Carora'],
    Aragua: ['Maracay', 'Turmero', 'La Victoria'],
    Bolívar: ['Ciudad Guayana', 'Ciudad Bolívar', 'Upata'],
  };

  aliasSugerencias = computed(() => {
    const base = ['Casa', 'Trabajo', 'Familia', 'Oficina'];
    const existentes = this.direcciones().map((d) => (d.alias || d.nombre || '').trim()).filter(Boolean) as string[];
    return Array.from(new Set([...base, ...existentes]));
  });

  estadoSugerencias = computed(() => {
    const existentes = this.direcciones().map((d) => (d.estado || '').trim()).filter(Boolean) as string[];
    return Array.from(new Set([...this.estadosVenezuela, ...existentes]));
  });

  ciudadSugerencias = computed(() => {
    const estado = this.formEstado().trim();
    const porEstado = estado ? (this.ciudadesPorEstado[estado] || []) : [];
    const existentes = this.direcciones().map((d) => (d.ciudad || '').trim()).filter(Boolean) as string[];
    return Array.from(new Set([...porEstado, ...existentes]));
  });

  calleSugerencias = computed(() => {
    const base = ['Av. Principal', 'Calle Principal', 'Av. Bolívar', 'Av. Libertador'];
    const existentes = this.direcciones().map((d) => (d.calle || '').trim()).filter(Boolean) as string[];
    return Array.from(new Set([...base, ...existentes]));
  });

  constructor() {
    this.cargarDesdeUsuario();
  }

  private cargarDesdeUsuario() {
    const direccionesUsuario = this.authService.user()?.direcciones || [];
    const normalizadas = direccionesUsuario.map((dir, index) => this.normalizarDireccion(dir, index));
    this.direcciones.set(normalizadas);
  }

  private normalizarDireccion(dir: Direccion, index: number): DireccionUsuario {
    const extendida = dir as DireccionUsuario;
    const partes = (dir.direccion || '').split(',').map((p) => p.trim()).filter(Boolean);
    const calle = extendida.calle || partes[0] || '';
    const ciudad = extendida.ciudad || partes[1] || '';
    const estado = extendida.estado || partes[2] || '';
    const alias = extendida.alias || dir.nombre || `Dirección ${index + 1}`;
    return {
      ...dir,
      alias,
      calle,
      ciudad,
      estado,
      codigoPostal: extendida.codigoPostal || '',
      principal: extendida.principal ?? index === 0,
      nombre: alias,
      direccion: this.armarDireccion(calle, ciudad, estado),
    };
  }

  private armarDireccion(calle: string, ciudad: string, estado: string): string {
    return [calle, ciudad, estado].map((v) => v.trim()).filter(Boolean).join(', ');
  }

  nuevaDireccion() {
    this.editando.set(true);
    this.editandoId.set(null);
    this.limpiarFormulario();
    this.error.set('');
  }

  editarDireccion(dir: DireccionUsuario) {
    this.editando.set(true);
    this.editandoId.set(dir.id);
    this.formAlias.set(dir.alias || dir.nombre || '');
    this.formCalle.set(dir.calle || '');
    this.formCiudad.set(dir.ciudad || '');
    this.formEstado.set(dir.estado || '');
    this.formCodigoPostal.set(dir.codigoPostal || '');
    this.formPrincipal.set(!!dir.principal);
    this.error.set('');
  }

  eliminarDireccion(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar esta dirección?')) {
      const remaining = this.direcciones().filter((d) => d.id !== id);
      const normalized = this.normalizarPrincipal(remaining);
      this.persistirDirecciones(normalized, 'Dirección eliminada correctamente');
    }
  }

  establecerPrincipal(id: string) {
    const updated = this.direcciones().map((d) => ({ ...d, principal: d.id === id }));
    this.persistirDirecciones(updated, 'Dirección principal actualizada');
  }

  guardarDireccion() {
    const alias = this.formAlias().trim();
    const calle = this.formCalle().trim();
    const ciudad = this.formCiudad().trim();
    const estado = this.formEstado().trim();
    const codigoPostal = this.formCodigoPostal().trim();
    const principal = this.formPrincipal();

    if (!alias || !calle || !ciudad || !estado) {
      this.error.set('Alias, calle, ciudad y estado son obligatorios.');
      return;
    }

    this.error.set('');
    const id = this.editandoId() || Date.now().toString();
    const nueva: DireccionUsuario = {
      id,
      alias,
      nombre: alias,
      calle,
      ciudad,
      estado,
      codigoPostal,
      principal,
      direccion: this.armarDireccion(calle, ciudad, estado),
    };

    let updated: DireccionUsuario[];
    if (this.editandoId()) {
      updated = this.direcciones().map((d) => (d.id === id ? nueva : d));
    } else {
      updated = [...this.direcciones(), nueva];
    }

    const normalized = this.normalizarPrincipal(updated);
    this.persistirDirecciones(normalized, this.editandoId() ? 'Dirección actualizada correctamente' : 'Dirección creada correctamente');
  }

  private normalizarPrincipal(direcciones: DireccionUsuario[]): DireccionUsuario[] {
    if (direcciones.length === 0) return [];
    if (direcciones.some((d) => d.principal)) {
      const idPrincipal = direcciones.find((d) => d.principal)?.id;
      return direcciones.map((d) => ({ ...d, principal: d.id === idPrincipal }));
    }
    return direcciones.map((d, index) => ({ ...d, principal: index === 0 }));
  }

  private persistirDirecciones(direcciones: DireccionUsuario[], successMessage?: string) {
    this.guardando.set(true);
    const payload = direcciones.map((d) => ({
      id: d.id,
      nombre: d.alias || d.nombre || '',
      direccion: d.direccion,
      alias: d.alias || '',
      calle: d.calle || '',
      ciudad: d.ciudad || '',
      estado: d.estado || '',
      codigoPostal: d.codigoPostal || '',
      principal: !!d.principal,
    }));

    const req = this.authService.updateProfile({ direcciones: payload as any });
    if (!req) {
      this.guardando.set(false);
      this.error.set('No se pudo actualizar tu perfil. Inicia sesión nuevamente.');
      return;
    }

    req.subscribe({
      next: () => {
        this.direcciones.set(direcciones);
        this.cancelarEdicion();
        this.cargarDesdeUsuario();
        if (successMessage) {
          alert(successMessage);
        }
      },
      error: () => {
        this.error.set('Error guardando direcciones. Intenta de nuevo.');
      },
      complete: () => {
        this.guardando.set(false);
      },
    });
  }

  cancelarEdicion() {
    this.editando.set(false);
    this.editandoId.set(null);
    this.limpiarFormulario();
    this.error.set('');
  }

  private limpiarFormulario() {
    this.formAlias.set('');
    this.formCalle.set('');
    this.formCiudad.set('');
    this.formEstado.set('');
    this.formCodigoPostal.set('');
    this.formPrincipal.set(false);
  }

  getTituloDireccion(dir: DireccionUsuario, index: number): string {
    return (dir.alias || dir.nombre || `Dirección ${index + 1}`).trim();
  }
}