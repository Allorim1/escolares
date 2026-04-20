import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriasBackend, CategoriaMenu, CategoriaItem } from '../../backend/data-access/categorias.backend';

@Component({
  selector: 'app-admin-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-categorias.html',
  styleUrl: './admin-categorias.css',
})
export class AdminCategorias implements OnInit {
  private categoriasBackend = inject(CategoriasBackend);

  categorias = signal<CategoriaMenu[]>([]);
  loading = signal(true);
  editingCategoria = signal<CategoriaMenu | null>(null);
  showModal = signal(false);
  showItemModal = signal(false);
  
  newCategoria = signal<Partial<CategoriaMenu>>({});
  newItem = signal<CategoriaItem>({ label: '', route: '' });
  selectedCategoriaId = signal<string>('');
  editingItemIndex = signal<number>(-1);

  ngOnInit() {
    this.loadCategorias();
  }

  loadCategorias() {
    this.loading.set(true);
    this.categoriasBackend.getAll().subscribe({
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
    this.newCategoria.set({ nombre: '', expanded: true, orden: 0, items: [] });
    this.editingCategoria.set(null);
    this.showModal.set(true);
  }

  openEditModal(categoria: CategoriaMenu) {
    this.newCategoria.set({ ...categoria });
    this.editingCategoria.set(categoria);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingCategoria.set(null);
  }

  saveCategoria() {
    const categoria = this.newCategoria();
    if (!categoria.nombre) return;

    if (this.editingCategoria()?.id) {
      this.categoriasBackend.update(this.editingCategoria()!.id, categoria).subscribe({
        next: () => {
          this.loadCategorias();
          this.closeModal();
        }
      });
    } else {
      this.categoriasBackend.create(categoria).subscribe({
        next: () => {
          this.loadCategorias();
          this.closeModal();
        }
      });
    }
  }

  deleteCategoria(categoria: CategoriaMenu) {
    if (!confirm(`¿Eliminar categoría "${categoria.nombre}"?`)) return;
    if (!categoria.id) return;
    
    this.categoriasBackend.delete(categoria.id).subscribe({
      next: () => {
        this.loadCategorias();
      }
    });
  }

  addItem(categoriaId: string) {
    this.selectedCategoriaId.set(categoriaId);
    this.newItem.set({ label: '', route: '' });
    this.editingItemIndex.set(-1);
    this.showItemModal.set(true);
  }

  editItem(categoria: CategoriaMenu, index: number) {
    if (!categoria.id) return;
    this.selectedCategoriaId.set(categoria.id);
    this.newItem.set({ ...categoria.items[index] });
    this.editingItemIndex.set(index);
    this.showItemModal.set(true);
  }

  closeItemModal() {
    this.showItemModal.set(false);
  }

  saveItem() {
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
            }
          });
        }
      });
    } else {
      this.categoriasBackend.addItem(categoriaId, item).subscribe({
        next: () => {
          this.loadCategorias();
          this.closeItemModal();
        }
      });
    }
  }

  removeItem(categoriaId: string, index: number) {
    if (!confirm('¿Eliminar este item?')) return;
    
    this.categoriasBackend.removeItem(categoriaId, index).subscribe({
      next: () => {
        this.loadCategorias();
      }
    });
  }
}