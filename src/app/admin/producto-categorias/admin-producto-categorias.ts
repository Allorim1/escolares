import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductoCategoriasBackend, ProductoCategoria } from '../../backend/data-access/producto-categorias.backend';

@Component({
  selector: 'app-admin-producto-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-producto-categorias.html',
  styleUrl: './admin-producto-categorias.css',
})
export class AdminProductoCategorias implements OnInit {
  private backend = inject(ProductoCategoriasBackend);

  categorias = signal<ProductoCategoria[]>([]);
  loading = signal(true);
  showModal = signal(false);
  editingCategoria = signal<ProductoCategoria | null>(null);
  
  formNombre = '';
  formDescripcion = '';
  formImagen = '';
  formOrden = 0;

  ngOnInit() {
    this.loadCategorias();
  }

  loadCategorias() {
    this.loading.set(true);
    this.backend.getAll().subscribe({
      next: (data) => {
        this.categorias.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  openCreateModal() {
    this.editingCategoria.set(null);
    this.formNombre = '';
    this.formDescripcion = '';
    this.formImagen = '';
    this.formOrden = 0;
    this.showModal.set(true);
  }

  openEditModal(categoria: ProductoCategoria) {
    this.editingCategoria.set(categoria);
    this.formNombre = categoria.nombre;
    this.formDescripcion = categoria.descripcion || '';
    this.formImagen = categoria.imagen || '';
    this.formOrden = categoria.orden;
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingCategoria.set(null);
  }

  saveCategoria() {
    if (!this.formNombre) return;

    const data = {
      nombre: this.formNombre,
      descripcion: this.formDescripcion,
      imagen: this.formImagen,
      orden: this.formOrden,
    };

    if (this.editingCategoria()?.id) {
      this.backend.update(this.editingCategoria()!.id, data).subscribe({
        next: () => {
          this.loadCategorias();
          this.closeModal();
        }
      });
    } else {
      this.backend.create(data).subscribe({
        next: () => {
          this.loadCategorias();
          this.closeModal();
        }
      });
    }
  }

  deleteCategoria(categoria: ProductoCategoria) {
    if (!confirm(`¿Eliminar la categoría "${categoria.nombre}"?`)) return;
    if (!categoria.id) return;

    this.backend.delete(categoria.id).subscribe({
      next: () => {
        this.loadCategorias();
      }
    });
  }
}
