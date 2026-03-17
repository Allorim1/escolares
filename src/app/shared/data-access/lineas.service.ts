import { Injectable, inject } from '@angular/core';
import { LineasBackend } from '../../backend/data-access/lineas.backend';

export interface Linea {
  id: string;
  name: string;
  image: string;
  productIds: (number | string)[];
}

@Injectable({
  providedIn: 'root',
})
export class LineasService {
  private backend = inject(LineasBackend);

  lineas = this.backend.lineas;
  isInitialized = this.backend.isInitialized;

  agregarLinea(name: string, image: string = '') {
    this.backend.agregarLinea(name, image);
  }

  eliminarLinea(id: string) {
    this.backend.eliminarLinea(id);
  }

  agregarProductoALinea(lineaId: string, productId: number | string) {
    this.backend.agregarProductoALinea(lineaId, productId);
  }

  eliminarProductoDeLinea(lineaId: string, productId: number | string) {
    this.backend.eliminarProductoDeLinea(lineaId, productId);
  }

  getLineaById(id: string): Linea | undefined {
    return this.backend.getLineaById(id);
  }
}
