import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductoCategoriasBackend, ProductoCategoria, ProductsResponse } from '../../backend/data-access/producto-categorias.backend';
import { NotificationService } from '../../shared/data-access/notification.service';

@Component({
  selector: 'app-admin-producto-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-producto-categorias.html',
  styleUrl: './admin-producto-categorias.css',
})
export class AdminProductoCategorias implements OnInit {
  private backend = inject(ProductoCategoriasBackend);
  private notification = inject(NotificationService);

  categorias = signal<ProductoCategoria[]>([]);
  loading = signal(true);
  loadingProducts = signal(false);
  showModal = signal(false);
  showProductsModal = signal(false);
  editingCategoria = signal<ProductoCategoria | null>(null);
  selectedCategoria = signal<ProductoCategoria | null>(null);
  categoriaProducts = signal<any[]>([]);
   
  formNombre = '';
  formDescripcion = '';
  formImagen = '';
  formOrden = 0;
  imagenError = signal(false);

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
      error: (err) => {
        this.notification.error('Error', 'No se pudieron cargar las categorías');
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
    this.imagenError.set(false);
    this.showModal.set(true);
  }

  openEditModal(categoria: ProductoCategoria) {
    this.editingCategoria.set(categoria);
    this.formNombre = categoria.nombre;
    this.formDescripcion = categoria.descripcion || '';
    this.formImagen = categoria.imagen || '';
    this.formOrden = categoria.orden;
    this.imagenError.set(false);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingCategoria.set(null);
  }

  openProductsModal(categoria: ProductoCategoria) {
    this.selectedCategoria.set(categoria);
    this.categoriaProducts.set([]);
    this.showProductsModal.set(true);
    this.loadProductsForCategoria(categoria.nombre);
  }

  closeProductsModal() {
    this.showProductsModal.set(false);
    this.selectedCategoria.set(null);
    this.categoriaProducts.set([]);
  }

  loadProductsForCategoria(nombreCategoria: string) {
    this.loadingProducts.set(true);
    this.backend.getProductsByCategory(nombreCategoria).subscribe({
      next: (response) => {
        this.categoriaProducts.set(response?.products || []);
        this.loadingProducts.set(false);
      },
      error: () => {
        this.categoriaProducts.set([]);
        this.loadingProducts.set(false);
      }
    });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(price || 0);
  }

  onImagenError() {
    this.imagenError.set(true);
  }

  saveCategoria() {
    if (!this.formNombre) return;
    this.imagenError.set(false);

    const data = {
      nombre: this.formNombre,
      descripcion: this.formDescripcion,
      imagen: this.formImagen,
      orden: this.formOrden,
    };

    if (this.editingCategoria()?.id) {
      this.backend.update(this.editingCategoria()!.id, data).subscribe({
        next: () => {
          this.notification.success('Éxito', 'Categoría actualizada correctamente');
          this.loadCategorias();
          this.closeModal();
        },
        error: (err) => {
          this.notification.error('Error', err.error?.error || 'Error al actualizar la categoría');
        }
      });
    } else {
      this.backend.create(data).subscribe({
        next: () => {
          this.notification.success('Éxito', 'Categoría creada correctamente');
          this.loadCategorias();
          this.closeModal();
        },
        error: (err) => {
          this.notification.error('Error', err.error?.error || 'Error al crear la categoría');
        }
      });
    }
  }

  deleteCategoria(categoria: ProductoCategoria) {
    if (!confirm(`¿Eliminar la categoría "${categoria.nombre}"?`)) return;
    if (!categoria.id) return;

    this.backend.delete(categoria.id).subscribe({
      next: () => {
        this.notification.success('Éxito', 'Categoría eliminada correctamente');
        this.loadCategorias();
      },
      error: (err) => {
        this.notification.error('Error', err.error?.error || 'Error al eliminar la categoría');
      }
    });
  }
}
