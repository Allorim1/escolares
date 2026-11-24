import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';
import { Component, inject, signal, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { EnterFocusNextDirective } from '../../shared/ui/enter-focus-next.directive';
import {
  CategoriasBackend,
  CategoriaMenu,
  CategoriaItem,
} from '../../backend/data-access/categorias.backend';

@Component({
  selector: 'app-admin-categorias',
  standalone: true,
  imports: [FormsModule, EnterFocusNextDirective],
  templateUrl: './admin-categorias.html',
  styleUrl: './admin-categorias.css',
})
export class AdminCategorias implements OnInit {
  private categoriasBackend = inject(CategoriasBackend);
  private notifications = inject(NotificationModalService);

  categorias = signal<CategoriaMenu[]>([]);
  loading = signal(true);
  editingCategoria = signal<CategoriaMenu | null>(null);
  showModal = signal(false);
  showItemModal = signal(false);

  newCategoria = signal<Partial<CategoriaMenu>>({});
  newItem = signal<CategoriaItem>({ label: '', route: '' });
  selectedCategoriaId = signal<string>('');
  editingItemIndex = signal<number>(-1);

  async ngOnInit() {
    this.loadCategorias();
  }

  async loadCategorias() {
    this.loading.set(true);
    this.categoriasBackend.getAll().subscribe({
      next: (data) => {
        this.categorias.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  async openCreateModal() {
    this.newCategoria.set({ nombre: '', expanded: true, orden: 0, items: [] });
    this.editingCategoria.set(null);
    this.showModal.set(true);
  }

  async openEditModal(categoria: CategoriaMenu) {
    this.newCategoria.set({ ...categoria });
    this.editingCategoria.set(categoria);
    this.showModal.set(true);
  }

  async closeModal() {
    this.showModal.set(false);
    this.editingCategoria.set(null);
  }

  async saveCategoria() {
    const categoria = this.newCategoria();
    if (!categoria.nombre) return;

    if (this.editingCategoria()?.id) {
      this.categoriasBackend.update(this.editingCategoria()!.id, categoria).subscribe({
        next: () => {
          this.loadCategorias();
          this.closeModal();
        },
      });
    } else {
      this.categoriasBackend.create(categoria).subscribe({
        next: () => {
          this.loadCategorias();
          this.closeModal();
        },
      });
    }
  }

  async deleteCategoria(categoria: CategoriaMenu) {
    const ok = await this.notifications.confirm({ titulo: 'Confirmar acción', mensaje: `¿Eliminar categoría "${categoria.nombre}"?`, tipo: 'danger', confirmarTexto: 'Eliminar' });
    if (!ok) return;
    if (!categoria.id) return;

    this.categoriasBackend.delete(categoria.id).subscribe({
      next: () => {
        this.loadCategorias();
      },
    });
  }

  async addItem(categoriaId: string) {
    this.selectedCategoriaId.set(categoriaId);
    this.newItem.set({ label: '', route: '' });
    this.editingItemIndex.set(-1);
    this.showItemModal.set(true);
  }

  async editItem(categoria: CategoriaMenu, index: number) {
    if (!categoria.id) return;
    this.selectedCategoriaId.set(categoria.id);
    this.newItem.set({ ...categoria.items[index] });
    this.editingItemIndex.set(index);
    this.showItemModal.set(true);
  }

  async closeItemModal() {
    this.showItemModal.set(false);
  }

  async saveItem() {
    const item = this.newItem();
    if (!item.label || !item.route) return;

    const categoriaId = this.selectedCategoriaId();
    if (!categoriaId) return;

    const index = this.editingItemIndex();

    if (index >= 0) {
      this.categoriasBackend.removeItem(categoriaId, index).subscribe({
        next: () => {
          this.categoriasBackend.addItem(categoriaId, item).subscribe({
            next: () => {
              this.loadCategorias();
              this.closeItemModal();
            },
          });
        },
      });
    } else {
      this.categoriasBackend.addItem(categoriaId, item).subscribe({
        next: () => {
          this.loadCategorias();
          this.closeItemModal();
        },
      });
    }
  }

  async removeItem(categoriaId: string, index: number) {
    const ok = await this.notifications.confirm({ titulo: 'Confirmar acción', mensaje: '¿Eliminar este item?', tipo: 'danger', confirmarTexto: 'Eliminar' });
    if (!ok) return;

    this.categoriasBackend.removeItem(categoriaId, index).subscribe({
      next: () => {
        this.loadCategorias();
      },
    });
  }
}