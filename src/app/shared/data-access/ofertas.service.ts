import { Injectable, inject } from '@angular/core';
import { OfertasBackend } from '../../backend/data-access/ofertas.backend';

export interface Oferta {
  productId: number;
  precioOferta: number;
}

@Injectable({
  providedIn: 'root',
})
export class OfertasService {
  private backend = inject(OfertasBackend);

  ofertas = this.backend.ofertas;

  agregarOferta(productId: number, precioOferta: number) {
    this.backend.agregarOferta(productId, precioOferta);
  }

  eliminarOferta(productId: number) {
    this.backend.eliminarOferta(productId);
  }

  getOferta(productId: number): Oferta | undefined {
    return this.backend.getOferta(productId);
  }

  isEnOferta(productId: number): boolean {
    return this.backend.isEnOferta(productId);
  }

  getOfertaPrice(productId: number): number | null {
    return this.backend.getOfertaPrice(productId);
  }
}
