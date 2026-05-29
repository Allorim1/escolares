import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Oferta } from '../models';

@Injectable({
  providedIn: 'root',
})
export class OfertasBackend {
  private readonly API_URL = '/api/ofertas';

  ofertas = signal<Oferta[]>([]);

  constructor(private http: HttpClient) {
    this.loadFromApi();
  }

  loadFromApi() {
    this.http.get<Oferta[]>(this.API_URL).subscribe({
      next: (ofertas) => {
        this.ofertas.set(ofertas);
      },
      error: (error) => {
        console.error('Error loading ofertas from API:', error);
      },
    });
  }

  reload() {
    this.loadFromApi();
  }

  agregarOferta(productId: number | string, precioOferta: number) {
    this.http.post<Oferta>(this.API_URL, { productId, precioOferta }).subscribe({
      next: (newOferta) => {
        this.ofertas.update((ofertas) => {
          const pidStr = String(productId);
          const existing = ofertas.find((o) => String(o.productId) === pidStr);
          if (existing) {
            return ofertas.map((o) => String(o.productId) === pidStr ? { ...o, precioOferta: newOferta.precioOferta } : o);
          }
          return [...ofertas, { productId, precioOferta }];
        });
      },
      error: (error) => {
        console.error('Error adding oferta:', error);
      },
    });
  }

  eliminarOferta(productId: number | string) {
    this.http.delete(`${this.API_URL}/product/${productId}`).subscribe({
      next: () => {
        const pidStr = String(productId);
        this.ofertas.update((ofertas) => ofertas.filter((o) => String(o.productId) !== pidStr));
      },
      error: (error) => {
        console.error('Error deleting oferta:', error);
      },
    });
  }

  getOferta(productId: number | string): Oferta | undefined {
    const pidStr = String(productId);
    return this.ofertas().find((o) => String(o.productId) === pidStr);
  }

  isEnOferta(productId: number | string): boolean {
    const pidStr = String(productId);
    return this.ofertas().some((o) => String(o.productId) === pidStr);
  }

  getOfertaPrice(productId: number | string): number | null {
    const oferta = this.getOferta(productId);
    return oferta ? oferta.precioOferta : null;
  }
}
