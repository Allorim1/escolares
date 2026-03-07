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

  private loadFromApi() {
    this.http.get<Oferta[]>(this.API_URL).subscribe({
      next: (ofertas) => {
        this.ofertas.set(ofertas);
      },
      error: (error) => {
        console.error('Error loading ofertas from API:', error);
      },
    });
  }

  agregarOferta(productId: number, precioOferta: number) {
    this.http.post<Oferta>(this.API_URL, { productId, precioOferta }).subscribe({
      next: (newOferta) => {
        this.ofertas.update((ofertas) => {
          const existing = ofertas.find((o) => o.productId === productId);
          if (existing) {
            return ofertas.map((o) => (o.productId === productId ? newOferta : o));
          }
          return [...ofertas, newOferta];
        });
      },
      error: (error) => {
        console.error('Error adding oferta:', error);
      },
    });
  }

  eliminarOferta(productId: number) {
    this.http.delete(`${this.API_URL}/product/${productId}`).subscribe({
      next: () => {
        this.ofertas.update((ofertas) => ofertas.filter((o) => o.productId !== productId));
      },
      error: (error) => {
        console.error('Error deleting oferta:', error);
      },
    });
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
