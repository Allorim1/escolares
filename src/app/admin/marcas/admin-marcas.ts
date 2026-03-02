import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-marcas',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-marcas.html',
  styleUrl: './admin-marcas.css',
})
export class AdminMarcas {
  marcas = signal<string[]>(['Nike', 'Adidas', 'Puma', 'Apple', 'Samsung']);
  editingIndex = signal<number | null>(null);
  isAdding = signal(false);
  newMarcaName = signal('');

  agregarMarca() {
    const trimmed = this.newMarcaName().trim();
    if (trimmed) {
      this.marcas.update((marcas) => [...marcas, trimmed]);
      this.newMarcaName.set('');
      this.isAdding.set(false);
    }
  }

  eliminarMarca(index: number) {
    if (confirm('¿Estás seguro de eliminar esta marca?')) {
      this.marcas.update((marcas) => marcas.filter((_, i) => i !== index));
    }
  }

  activarEdicion(index: number) {
    this.editingIndex.set(index);
  }

  guardarEdicion(index: number, nombre: string) {
    const trimmed = nombre.trim();
    if (trimmed) {
      this.marcas.update((marcas) => marcas.map((m, i) => (i === index ? trimmed : m)));
    }
    this.editingIndex.set(null);
  }

  cancelarEdicion() {
    this.editingIndex.set(null);
    this.isAdding.set(false);
  }

  showAddForm() {
    this.isAdding.set(true);
    this.editingIndex.set(null);
  }
}
