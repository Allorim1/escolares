import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Marca } from '../models';

@Injectable({
  providedIn: 'root',
})
export class MarcasBackend {
  private readonly API_URL = 'http://localhost:3000/api/marcas';

  marcas = signal<Marca[]>([]);
  isInitialized = signal(false);

  constructor(private http: HttpClient) {
    this.loadFromApi();
  }

  private loadFromApi() {
    this.http.get<Marca[]>(this.API_URL).subscribe({
      next: (marcas) => {
        this.marcas.set(marcas);
        this.isInitialized.set(true);
      },
      error: (error) => {
        console.error('Error loading marcas from API:', error);
        this.isInitialized.set(true);
      },
    });
  }

  agregarMarca(nombre: string, imagen?: string) {
    if (!nombre || !nombre.trim()) {
      console.error('El nombre de la marca es requerido');
      return;
    }

    this.http.post<Marca>(this.API_URL, { name: nombre.trim(), image: imagen || '' }).subscribe({
      next: (newMarca) => {
        this.marcas.update((marcas) => [...marcas, newMarca]);
      },
      error: (error) => {
        console.error('Error adding marca:', error);
      },
    });
  }

  actualizarMarca(id: string, nombre: string, imagen?: string) {
    if (!nombre || !nombre.trim()) {
      console.error('El nombre de la marca es requerido');
      return;
    }

    this.http
      .put<Marca>(`${this.API_URL}/${id}`, { name: nombre.trim(), image: imagen || '' })
      .subscribe({
        next: (updatedMarca) => {
          this.marcas.update((marcas) => marcas.map((m) => (m.id === id ? updatedMarca : m)));
        },
        error: (error) => {
          console.error('Error updating marca:', error);
        },
      });
  }

  eliminarMarca(id: string) {
    this.http.delete(`${this.API_URL}/${id}`).subscribe({
      next: () => {
        this.marcas.update((marcas) => marcas.filter((m) => m.id !== id));
      },
      error: (error) => {
        console.error('Error deleting marca:', error);
      },
    });
  }

  getMarcaByName(name: string): Marca | undefined {
    return this.marcas().find((m) => m.name.toLowerCase() === name.toLowerCase());
  }
}
