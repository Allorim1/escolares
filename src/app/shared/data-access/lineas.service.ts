import { Injectable, signal } from '@angular/core';

export interface Linea {
  id: string;
  name: string;
  image: string;
  productIds: number[];
}

@Injectable({
  providedIn: 'root',
})
export class LineasService {
  private readonly STORAGE_KEY = 'lineas';

  lineas = signal<Linea[]>([]);
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
            this.lineas.set(parsed);
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
      console.error('Error loading lineas from storage:', error);
      this.initializeDefault();
    }
    this.isInitialized.set(true);
  }

  private initializeDefault() {
    this.lineas.set([
      {
        id: '1',
        name: 'Bolsos y Cartuchera',
        image: '/lineas/BOLSOS-Y-CARTUCHERA.png',
        productIds: [],
      },
      {
        id: '2',
        name: 'Línea de Papelería',
        image: '/lineas/manchas-LINEA-DE-PAPELERIA.png',
        productIds: [],
      },
      {
        id: '3',
        name: 'Línea de Geometría',
        image: '/lineas/manchas-LIBEA-DE-GEOMETRIA.png',
        productIds: [],
      },
      {
        id: '4',
        name: 'Línea de Manualidades',
        image: '/lineas/MANCHAS-PARA-LINEA-DE-MANUALIDADES.png',
        productIds: [],
      },
      {
        id: '5',
        name: 'Línea Escolar',
        image: '/lineas/MANCHA-PARA-LINEA-ESCOLAR.png',
        productIds: [],
      },
      {
        id: '6',
        name: 'Higiene Personal',
        image: '/lineas/MANCHA-DE-HIGIENE-PERSONAL.png',
        productIds: [],
      },
      {
        id: '7',
        name: 'Línea de Oficina',
        image: '/lineas/MANCHA-LINEA-DE-PFICINA.png',
        productIds: [],
      },
      {
        id: '8',
        name: 'Línea de Escritura',
        image: '/lineas/MANCHA-LINEA-DE-ESCRITURA-V1.png',
        productIds: [],
      },
    ]);
    this.saveToStorage();
  }

  private saveToStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.lineas()));
      }
    } catch (error) {
      console.error('Error saving lineas to storage:', error);
    }
  }

  agregarLinea(name: string, image: string = '') {
    if (!name || !name.trim()) {
      console.error('El nombre de la línea es requerido');
      return;
    }

    const newLinea: Linea = {
      id: Date.now().toString(),
      name: name.trim(),
      image: image,
      productIds: [],
    };

    this.lineas.update((lineas) => [...lineas, newLinea]);
    this.saveToStorage();
    console.log('Línea agregada:', newLinea);
  }

  eliminarLinea(id: string) {
    this.lineas.update((lineas) => lineas.filter((l) => l.id !== id));
    this.saveToStorage();
  }

  agregarProductoALinea(lineaId: string, productId: number) {
    this.lineas.update((lineas) =>
      lineas.map((l) => {
        if (l.id === lineaId && !l.productIds.includes(productId)) {
          return { ...l, productIds: [...l.productIds, productId] };
        }
        return l;
      }),
    );
    this.saveToStorage();
  }

  eliminarProductoDeLinea(lineaId: string, productId: number) {
    this.lineas.update((lineas) =>
      lineas.map((l) => {
        if (l.id === lineaId) {
          return { ...l, productIds: l.productIds.filter((id) => id !== productId) };
        }
        return l;
      }),
    );
    this.saveToStorage();
  }

  getLineaById(id: string): Linea | undefined {
    return this.lineas().find((l) => l.id === id);
  }
}
