import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/data-access/auth.service';
import { MetodoPago } from '../../backend/models';

type MetodoPagoTipo = MetodoPago['tipo'];

@Component({
  selector: 'app-metodos-pago',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './metodos-pago.html',
  styleUrls: ['./metodos-pago.css'],
})
export class MetodosPago {
  authService = inject(AuthService);

  metodos = signal<MetodoPago[]>([]);
  editando = signal(false);
  editandoId = signal<string | null>(null);
  guardando = signal(false);
  error = signal('');

  formAlias = signal('');
  formTipo = signal<MetodoPagoTipo>('pago_movil');
  formTitular = signal('');
  formBanco = signal('');
  formTelefono = signal('');
  formReferencia = signal('');
  formPrincipal = signal(false);

  tiposDisponibles: { value: MetodoPagoTipo; label: string }[] = [
    { value: 'zelle', label: 'Zelle' },
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'pago_movil', label: 'Pago Móvil' },
  ];

  constructor() {
    this.cargarDesdeUsuario();
  }

  private cargarDesdeUsuario() {
    const metodos = this.authService.user()?.metodosPago || [];
    const normalizados = this.normalizarPrincipal([...metodos]);
    this.metodos.set(normalizados);
  }

  nuevoMetodo() {
    this.editando.set(true);
    this.editandoId.set(null);
    this.limpiarFormulario();
    this.error.set('');
  }

  editarMetodo(metodo: MetodoPago) {
    this.editando.set(true);
    this.editandoId.set(metodo.id);
    this.formAlias.set(metodo.alias || '');
    this.formTipo.set(metodo.tipo);
    this.formTitular.set(metodo.titular || '');
    this.formBanco.set(metodo.banco || '');
    this.formTelefono.set(metodo.telefono || '');
    this.formReferencia.set(metodo.referencia || '');
    this.formPrincipal.set(!!metodo.principal);
    this.error.set('');
  }

  eliminarMetodo(id: string) {
    if (!confirm('¿Seguro que deseas eliminar este método de pago?')) return;
    const updated = this.normalizarPrincipal(this.metodos().filter((m) => m.id !== id));
    this.persistirMetodos(updated, 'Método de pago eliminado');
  }

  establecerPrincipal(id: string) {
    const updated = this.metodos().map((m) => ({ ...m, principal: m.id === id }));
    this.persistirMetodos(updated, 'Método principal actualizado');
  }

  guardarMetodo() {
    const alias = this.formAlias().trim();
    const tipo = this.formTipo();
    if (!alias) {
      this.error.set('El alias es obligatorio.');
      return;
    }

    const validacion = this.validarPorTipo();
    if (!validacion.ok) {
      this.error.set(validacion.message);
      return;
    }

    const metodo: MetodoPago = {
      id: this.editandoId() || Date.now().toString(),
      alias,
      tipo,
      titular: this.formTitular().trim(),
      banco: this.formBanco().trim(),
      telefono: this.formTelefono().trim(),
      referencia: this.formReferencia().trim(),
      principal: this.formPrincipal(),
    };

    let updated: MetodoPago[];
    if (this.editandoId()) {
      updated = this.metodos().map((m) => (m.id === metodo.id ? metodo : m));
    } else {
      updated = [...this.metodos(), metodo];
    }

    this.persistirMetodos(this.normalizarPrincipal(updated), this.editandoId() ? 'Método actualizado' : 'Método guardado');
  }

  cancelarEdicion() {
    this.editando.set(false);
    this.editandoId.set(null);
    this.limpiarFormulario();
    this.error.set('');
  }

  getTipoLabel(tipo: MetodoPagoTipo): string {
    return this.tiposDisponibles.find((t) => t.value === tipo)?.label || tipo;
  }

  private validarPorTipo(): { ok: boolean; message: string } {
    const tipo = this.formTipo();
    const titular = this.formTitular().trim();
    const banco = this.formBanco().trim();
    const telefono = this.formTelefono().trim();
    const referencia = this.formReferencia().trim();

    if (tipo === 'pago_movil') {
      if (!titular || !banco || !telefono || !referencia) {
        return { ok: false, message: 'Para Pago Móvil debes indicar titular, banco, teléfono y referencia.' };
      }
    }

    if (tipo === 'transferencia') {
      if (!titular || !banco || !referencia) {
        return { ok: false, message: 'Para Transferencia debes indicar titular, banco y referencia.' };
      }
    }

    if (tipo === 'zelle') {
      if (!titular || !referencia) {
        return { ok: false, message: 'Para Zelle debes indicar titular y referencia.' };
      }
    }

    if (tipo === 'efectivo') {
      // Efectivo: referencia no es obligatoria.
      return { ok: true, message: '' };
    }

    return { ok: true, message: '' };
  }

  private persistirMetodos(metodos: MetodoPago[], successMessage?: string) {
    this.guardando.set(true);
    const req = this.authService.updateProfile({ metodosPago: metodos });
    if (!req) {
      this.guardando.set(false);
      this.error.set('No se pudo actualizar tu perfil. Intenta iniciar sesión nuevamente.');
      return;
    }

    req.subscribe({
      next: () => {
        this.metodos.set(metodos);
        this.cancelarEdicion();
        this.cargarDesdeUsuario();
        if (successMessage) alert(successMessage);
      },
      error: () => {
        this.error.set('No se pudieron guardar los métodos de pago.');
      },
      complete: () => {
        this.guardando.set(false);
      },
    });
  }

  private normalizarPrincipal(metodos: MetodoPago[]): MetodoPago[] {
    if (!metodos.length) return [];
    if (metodos.some((m) => m.principal)) {
      const principalId = metodos.find((m) => m.principal)?.id;
      return metodos.map((m) => ({ ...m, principal: m.id === principalId }));
    }
    return metodos.map((m, i) => ({ ...m, principal: i === 0 }));
  }

  private limpiarFormulario() {
    this.formAlias.set('');
    this.formTipo.set('pago_movil');
    this.formTitular.set('');
    this.formBanco.set('');
    this.formTelefono.set('');
    this.formReferencia.set('');
    this.formPrincipal.set(false);
  }
}
