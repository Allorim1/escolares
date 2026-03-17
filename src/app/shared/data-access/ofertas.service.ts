import { Injectable, inject } from '@angular/core';
import { OfertasBackend } from '../../backend/data-access/ofertas.backend';

export interface Oferta {
  productId: number | string;
  precioOferta: number;
}

@Injectable({
  providedIn: 'root',
})
export class OfertasService {
  private backend = inject(OfertasBackend);

  ofertas = this.backend.ofertas;

  agregarOferta(productId: number | string, precioOferta: number) {
    this.backend.agregarOferta(productId, precioOferta);
  }

  eliminarOferta(productId: number | string) {
    this.backend.eliminarOferta(productId);
  }

  getOferta(productId: number | string): Oferta | undefined {
    return this.backend.getOferta(productId);
  }

  isEnOferta(productId: number | string): boolean {
    return this.backend.isEnOferta(productId);
  }

  getOfertaPrice(productId: number | string): number | null {
    return this.backend.getOfertaPrice(productId);
  }
}
