import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-marcas',
  imports: [RouterLink],
  templateUrl: './marcas.html',
  styleUrl: './marcas.css',
})
export class Marcas {
  marcas = signal<string[]>([]);
  editingIndex = signal<number | null>(null);

  agregarMarca(nombre: string): void {
    const trimmed = nombre.trim();
    if (trimmed) {
      this.marcas.update((marcas) => [...marcas, trimmed]);
    }
  }

  eliminarMarca(index: number): void {
    this.marcas.update((marcas) => marcas.filter((_, i) => i !== index));
  }

  activarEdicion(index: number): void {
    this.editingIndex.set(index);
  }

  guardarEdicion(index: number, nombre: string): void {
    const trimmed = nombre.trim();
    if (trimmed) {
      this.marcas.update((marcas) => marcas.map((m, i) => (i === index ? trimmed : m)));
    }
    this.editingIndex.set(null);
  }

  cancelarEdicion(): void {
    this.editingIndex.set(null);
  }
}
