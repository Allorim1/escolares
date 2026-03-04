import { Injectable, inject } from '@angular/core';
import { MarcasBackend } from '../../backend/data-access/marcas.backend';

export interface Marca {
  id: string;
  name: string;
  image?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MarcasService {
  private backend = inject(MarcasBackend);

  marcas = this.backend.marcas;
  isInitialized = this.backend.isInitialized;

  agregarMarca(nombre: string, imagen?: string) {
    this.backend.agregarMarca(nombre, imagen);
  }

  actualizarMarca(id: string, nombre: string, imagen?: string) {
    this.backend.actualizarMarca(id, nombre, imagen);
  }

  eliminarMarca(id: string) {
    this.backend.eliminarMarca(id);
  }

  getMarcaByName(name: string): Marca | undefined {
    return this.backend.getMarcaByName(name);
  }
}
