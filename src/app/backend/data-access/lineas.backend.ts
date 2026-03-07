import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Linea } from '../models';

@Injectable({
  providedIn: 'root',
})
export class LineasBackend {
  private readonly API_URL = '/api/lineas';

  lineas = signal<Linea[]>([]);
  isInitialized = signal(false);

  constructor(private http: HttpClient) {
    this.loadFromApi();
  }

  private loadFromApi() {
    this.http.get<Linea[]>(this.API_URL).subscribe({
      next: (lineas) => {
        this.lineas.set(lineas);
        this.isInitialized.set(true);
      },
      error: (error) => {
        console.error('Error loading lineas from API:', error);
        this.isInitialized.set(true);
      },
    });
  }

  agregarLinea(name: string, image: string = '') {
    if (!name || !name.trim()) {
      console.error('El nombre de la línea es requerido');
      return;
    }

    this.http.post<Linea>(this.API_URL, { name: name.trim(), image }).subscribe({
      next: (newLinea) => {
        this.lineas.update((lineas) => [...lineas, newLinea]);
      },
      error: (error) => {
        console.error('Error adding linea:', error);
      },
    });
  }

  eliminarLinea(id: string) {
    this.http.delete(`${this.API_URL}/${id}`).subscribe({
      next: () => {
        this.lineas.update((lineas) => lineas.filter((l) => l.id !== id));
      },
      error: (error) => {
        console.error('Error deleting linea:', error);
      },
    });
  }

  agregarProductoALinea(lineaId: string, productId: number) {
    this.http.post<Linea>(`${this.API_URL}/${lineaId}/products`, { productId }).subscribe({
      next: (updatedLinea) => {
        this.lineas.update((lineas) => lineas.map((l) => (l.id === lineaId ? updatedLinea : l)));
      },
      error: (error) => {
        console.error('Error adding product to linea:', error);
      },
    });
  }

  eliminarProductoDeLinea(lineaId: string, productId: number) {
    this.http
      .delete<Linea>(`${this.API_URL}/${lineaId}/products`, { body: { productId } })
      .subscribe({
        next: (updatedLinea) => {
          this.lineas.update((lineas) => lineas.map((l) => (l.id === lineaId ? updatedLinea : l)));
        },
        error: (error) => {
          console.error('Error removing product from linea:', error);
        },
      });
  }

  getLineaById(id: string): Linea | undefined {
    return this.lineas().find((l) => l.id === id);
  }
}
