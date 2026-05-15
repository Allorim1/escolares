import { Injectable, signal } from '@angular/core';

export interface NotificationOptions {
  titulo?: string;
  mensaje: string;
  tipo?: 'success' | 'error' | 'warning' | 'info';
  duracion?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationModalService {
  private _mostrar = signal(false);
  private _titulo = signal('Éxito');
  private _mensaje = signal('');
  private _tipo = signal<'success' | 'error' | 'warning' | 'info'>('success');
  private _duracion = signal(3000);

  mostrar = this._mostrar.asReadonly();
  titulo = this._titulo.asReadonly();
  mensaje = this._mensaje.asReadonly();
  tipo = this._tipo.asReadonly();
  duracion = this._duracion.asReadonly();

success(mensaje: string, titulo = 'Éxito') {
     this.mostrarNotificacion(mensaje, titulo, 'success');
   }

   error(mensaje: string, titulo = 'Error') {
     this.mostrarNotificacion(mensaje, titulo, 'error');
   }

   warning(mensaje: string, titulo = 'Advertencia') {
     this.mostrarNotificacion(mensaje, titulo, 'warning');
   }

   info(mensaje: string, titulo = 'Información') {
     this.mostrarNotificacion(mensaje, titulo, 'info');
   }

   private mostrarNotificacion(mensaje: string, titulo: string, tipo: 'success' | 'error' | 'warning' | 'info', duracion = 3000) {
    this._titulo.set(titulo);
    this._mensaje.set(mensaje);
    this._tipo.set(tipo);
    this._duracion.set(duracion);
    this._mostrar.set(true);

    setTimeout(() => {
      this.cerrar();
    }, duracion);
  }

  cerrar() {
    this._mostrar.set(false);
    this._mensaje.set('');
  }
}