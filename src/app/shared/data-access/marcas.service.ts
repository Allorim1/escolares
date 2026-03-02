import { Injectable, signal } from '@angular/core';

export interface Marca {
  id: string;
  name: string;
  image?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MarcasService {
  private readonly STORAGE_KEY = 'marcas';

  marcas = signal<Marca[]>([]);
  isInitialized = signal(false);

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
            this.marcas.set(parsed);
          } else {
            this.initializeDefault();
          }
        } else {
          this.initializeDefault();
        }
      } else {
        this.initializeDefault();
      }
    } catch (error) {
      console.error('Error loading marcas from storage:', error);
      this.initializeDefault();
    }
    this.isInitialized.set(true);
  }

  private initializeDefault() {
    this.marcas.set([
      { id: '1', name: 'Nike', image: '' },
      { id: '2', name: 'Adidas', image: '' },
      { id: '3', name: 'Puma', image: '' },
      { id: '4', name: 'Apple', image: '' },
      { id: '5', name: 'Samsung', image: '' },
    ]);
    this.saveToStorage();
  }

  private saveToStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.marcas()));
      }
    } catch (error) {
      console.error('Error saving marcas to storage:', error);
    }
  }

  agregarMarca(nombre: string, imagen?: string) {
    if (!nombre || !nombre.trim()) {
      console.error('El nombre de la marca es requerido');
      return;
    }

    const newMarca: Marca = {
      id: Date.now().toString(),
      name: nombre.trim(),
      image: imagen || '',
    };

    this.marcas.update((marcas) => [...marcas, newMarca]);
    this.saveToStorage();
    console.log('Marca agregada:', newMarca);
  }

  actualizarMarca(id: string, nombre: string, imagen?: string) {
    if (!nombre || !nombre.trim()) {
      console.error('El nombre de la marca es requerido');
      return;
    }

    this.marcas.update((marcas) =>
      marcas.map((m) =>
        m.id === id ? { ...m, name: nombre.trim(), image: imagen || m.image } : m,
      ),
    );
    this.saveToStorage();
  }

  eliminarMarca(id: string) {
    this.marcas.update((marcas) => marcas.filter((m) => m.id !== id));
    this.saveToStorage();
  }

  getMarcaByName(name: string): Marca | undefined {
    return this.marcas().find((m) => m.name.toLowerCase() === name.toLowerCase());
  }
}
