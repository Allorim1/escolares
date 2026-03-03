import { Injectable, signal } from '@angular/core';
import { Product } from '../interfaces/product.interface';

export interface Oferta {
  productId: number;
  precioOferta: number;
}

@Injectable({
  providedIn: 'root',
})
export class OfertasService {
  private readonly STORAGE_KEY = 'ofertas';

  ofertas = signal<Oferta[]>([]);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.ofertas.set(parsed);
          }
        }
      }
    } catch (error) {
      console.error('Error loading ofertas from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.ofertas()));
      }
    } catch (error) {
      console.error('Error saving ofertas to storage:', error);
    }
  }

  agregarOferta(productId: number, precioOferta: number) {
    this.ofertas.update((ofertas) => {
      const existing = ofertas.find((o) => o.productId === productId);
      if (existing) {
        return ofertas.map((o) => (o.productId === productId ? { ...o, precioOferta } : o));
      }
      return [...ofertas, { productId, precioOferta }];
    });
    this.saveToStorage();
  }

  eliminarOferta(productId: number) {
    this.ofertas.update((ofertas) => ofertas.filter((o) => o.productId !== productId));
    this.saveToStorage();
  }

  getOferta(productId: number): Oferta | undefined {
    return this.ofertas().find((o) => o.productId === productId);
  }

  isEnOferta(productId: number): boolean {
    return this.ofertas().some((o) => o.productId === productId);
  }

  getOfertaPrice(productId: number): number | null {
    const oferta = this.getOferta(productId);
    return oferta ? oferta.precioOferta : null;
  }
}
