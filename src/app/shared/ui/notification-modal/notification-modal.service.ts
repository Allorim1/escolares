import { Injectable, signal } from '@angular/core';

export interface NotificationOptions {
  titulo?: string;
  mensaje: string;
  tipo?: 'success' | 'error' | 'warning' | 'info';
  duracion?: number;
  detalles?: string[];
}

export interface ConfirmOptions {
  titulo?: string;
  mensaje: string;
  confirmarTexto?: string;
  cancelarTexto?: string;
  tipo?: 'warning' | 'danger' | 'info';
  detalles?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class NotificationModalService {
  private _mostrar = signal(false);
  private _titulo = signal('Éxito');
  private _mensaje = signal('');
  private _tipo = signal<'success' | 'error' | 'warning' | 'info'>('success');
  private _duracion = signal(3500);
  private _detalles = signal<string[]>([]);
  private _modo = signal<'notification' | 'confirm'>('notification');
  private _confirmarTexto = signal('Confirmar');
  private _cancelarTexto = signal('Cancelar');
  private _confirmResolver: ((value: boolean) => void) | null = null;

  mostrar = this._mostrar.asReadonly();
  titulo = this._titulo.asReadonly();
  mensaje = this._mensaje.asReadonly();
  tipo = this._tipo.asReadonly();
  duracion = this._duracion.asReadonly();
  detalles = this._detalles.asReadonly();
  modo = this._modo.asReadonly();
  confirmarTexto = this._confirmarTexto.asReadonly();
  cancelarTexto = this._cancelarTexto.asReadonly();

  success(mensaje: string, titulo = 'Éxito') {
    this.mostrarNotificacion(mensaje, titulo, 'success');
  }

  error(mensaje: string, titulo = 'Error', detalles: string[] = []) {
    this.mostrarNotificacion(mensaje, titulo, 'error', 5000, detalles);
  }

  warning(mensaje: string, titulo = 'Advertencia') {
    this.mostrarNotificacion(mensaje, titulo, 'warning');
  }

  info(mensaje: string, titulo = 'Información') {
    this.mostrarNotificacion(mensaje, titulo, 'info');
  }

  fromHttpError(err: any, fallback = 'Ocurrió un error inesperado', titulo = 'Error') {
    const msg = err?.error?.error || err?.message || fallback;
    const details = Array.isArray(err?.error?.details) ? err.error.details.filter((d: any) => typeof d === 'string') : [];
    this.error(msg, titulo, details);
  }

  confirm(options: ConfirmOptions | string, mensaje?: string): Promise<boolean> {
    const opts: ConfirmOptions = typeof options === 'string'
      ? { titulo: 'Confirmar acción', mensaje: options, confirmarTexto: mensaje }
      : options;
    if (this._confirmResolver) this._confirmResolver(false);
    this._titulo.set(opts.titulo ?? 'Confirmar acción');
    this._mensaje.set(opts.mensaje);
    this._tipo.set(opts.tipo === 'danger' ? 'error' : opts.tipo === 'info' ? 'info' : 'warning');
    this._detalles.set(opts.detalles ?? []);
    this._confirmarTexto.set(opts.confirmarTexto ?? 'Confirmar');
    this._cancelarTexto.set(opts.cancelarTexto ?? 'Cancelar');
    this._modo.set('confirm');
    this._mostrar.set(true);
    return new Promise<boolean>((resolve) => { this._confirmResolver = resolve; });
  }

  confirmar() {
    this.resolveConfirm(true);
  }

  cancelar() {
    this.resolveConfirm(false);
  }

  private resolveConfirm(value: boolean) {
    const resolve = this._confirmResolver;
    this._confirmResolver = null;
    this._mostrar.set(false);
    this._modo.set('notification');
    this._detalles.set([]);
    resolve?.(value);
  }

  private mostrarNotificacion(
    mensaje: string,
    titulo: string,
    tipo: 'success' | 'error' | 'warning' | 'info',
    duracion = 3500,
    detalles: string[] = []
  ) {
    if (this._confirmResolver) { this._confirmResolver(false); this._confirmResolver = null; }
    this._modo.set('notification');
    this._titulo.set(titulo);
    this._mensaje.set(mensaje);
    this._tipo.set(tipo);
    this._duracion.set(duracion);
    this._detalles.set(detalles);
    this._mostrar.set(true);

    setTimeout(() => {
      if (this._modo() === 'notification') this.cerrar();
    }, duracion);
  }

  cerrar() {
    if (this._modo() === 'confirm') { this.resolveConfirm(false); return; }
    this._mostrar.set(false);
    this._mensaje.set('');
    this._detalles.set([]);
  }
}
