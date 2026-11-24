import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';
import { Component, inject, signal, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import {
  ProductoCategoriasBackend,
  ProductoCategoria,
} from '../../backend/data-access/producto-categorias.backend';
import { NotificationService } from '../../shared/data-access/notification.service';
import { Product } from '../../shared/interfaces/product.interface';

@Component({
  selector: 'app-admin-producto-categorias',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-producto-categorias.html',
  styleUrl: './admin-producto-categorias.css',
})
export class AdminProductoCategorias implements OnInit {
  private backend = inject(ProductoCategoriasBackend);
  private notificationModal = inject(NotificationModalService);
  private notification = inject(NotificationService);

  categorias = signal<ProductoCategoria[]>([]);
  loading = signal(true);
  loadingProducts = signal(false);
  showModal = signal(false);
  showProductsModal = signal(false);
  editingCategoria = signal<ProductoCategoria | null>(null);
  selectedCategoria = signal<ProductoCategoria | null>(null);
  categoriaProducts = signal<Product[]>([]);

  formNombre = '';
  formDescripcion = '';
  formImagen = '';
  formOrden = 0;
  imagenError = signal(false);

  async ngOnInit() {
    this.loadCategorias();
  }

  async loadCategorias() {
    this.loading.set(true);
    this.backend.getAll().subscribe({
      next: (data) => {
        this.categorias.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.notification.error('Error', 'No se pudieron cargar las categorÃ­as');
        this.loading.set(false);
      },
    });
  }

  async openCreateModal() {
    this.editingCategoria.set(null);
    this.formNombre = '';
    this.formDescripcion = '';
    this.formImagen = '';
    this.formOrden = 0;
    this.imagenError.set(false);
    this.showModal.set(true);
  }

  async openEditModal(categoria: ProductoCategoria) {
    this.editingCategoria.set(categoria);
    this.formNombre = categoria.nombre;
    this.formDescripcion = categoria.descripcion || '';
    this.formImagen = categoria.imagen || '';
    this.formOrden = categoria.orden;
    this.imagenError.set(false);
    this.showModal.set(true);
  }

  async closeModal() {
    this.showModal.set(false);
    this.editingCategoria.set(null);
  }

  async openProductsModal(categoria: ProductoCategoria) {
    this.selectedCategoria.set(categoria);
    this.categoriaProducts.set([]);
    this.showProductsModal.set(true);
    this.loadProductsForCategoria(categoria.nombre);
  }

  async closeProductsModal() {
    this.showProductsModal.set(false);
    this.selectedCategoria.set(null);
    this.categoriaProducts.set([]);
  }

  async loadProductsForCategoria(nombreCategoria: string) {
    this.loadingProducts.set(true);
    this.backend.getProductsByCategory(nombreCategoria).subscribe({
      next: (response) => {
        this.categoriaProducts.set(response?.products || []);
        this.loadingProducts.set(false);
      },
      error: () => {
        this.categoriaProducts.set([]);
        this.loadingProducts.set(false);
      },
    });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(
      price || 0,
    );
  }

  async onImagenError() {
    this.imagenError.set(true);
  }

  async saveCategoria() {
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
          this.notification.success('Ã‰xito', 'CategorÃ­a actualizada correctamente');
          this.loadCategorias();
          this.closeModal();
        },
        error: (err) => {
          this.notification.error('Error', err.error?.error || 'Error al actualizar la categorÃ­a');
        },
      });
    } else {
      this.backend.create(data).subscribe({
        next: () => {
          this.notification.success('Ã‰xito', 'CategorÃ­a creada correctamente');
          this.loadCategorias();
          this.closeModal();
        },
        error: (err) => {
          this.notification.error('Error', err.error?.error || 'Error al crear la categorÃ­a');
        },
      });
    }
  }

  async deleteCategoria(categoria: ProductoCategoria) {
    const ok = await this.notificationModal.confirm({ titulo: 'Confirmar acciÃ³n', mensaje: `Â¿Eliminar la categorÃ­a "${categoria.nombre}"?`, tipo: 'danger', confirmarTexto: 'Eliminar' });
    if (!ok) return;
    if (!categoria.id) return;

    this.backend.delete(categoria.id).subscribe({
      next: () => {
        this.notification.success('Ã‰xito', 'CategorÃ­a eliminada correctamente');
        this.loadCategorias();
      },
      error: (err) => {
        this.notification.error('Error', err.error?.error || 'Error al eliminar la categorÃ­a');
      },
    });
  }
}
