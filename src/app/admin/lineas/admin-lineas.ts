import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LineasService, Linea } from '../../shared/data-access/lineas.service';
import { ProductsService } from '../../products/data-access/products.service';
import { Product } from '../../shared/interfaces/product.interface';
import { AuthService } from '../../shared/data-access/auth.service';

import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';
@Component({
  selector: 'app-admin-lineas',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-lineas.html',
  styleUrl: './admin-lineas.css',
})
export class AdminLineas implements OnInit {
  lineasService = inject(LineasService);
  private productsService = inject(ProductsService);
  private notifications = inject(NotificationModalService);
  authService = inject(AuthService);

  lineas = this.lineasService.lineas;
  allProducts = signal<Product[]>([]);
  selectedLinea = signal<Linea | null>(null);
  showAddProduct = signal(false);
  productFilter = signal('');
  isAdding = signal(false);
  newLineaName = signal('');

  isOwner(): boolean {
    const rol = this.authService.user()?.rol;
    return rol === 'root';
  }

  async ngOnInit() {
    this.productsService.getProducts().subscribe({
      next: (response) => this.allProducts.set(response.products),
      error: (err) => console.error('Error loading products:', err),
    });
  }

  getProductsForLinea(linea: Linea): Product[] {
    return this.allProducts().filter((p) => linea.productIds.includes(p.id));
  }

  getAvailableProducts(linea: Linea): Product[] {
    const filter = this.productFilter().toLowerCase();
    return this.allProducts().filter((p) => {
      const notInLinea = !linea.productIds.includes(p.id);
      const matchesFilter =
        !filter ||
        p.title.toLowerCase().includes(filter) ||
        p.description.toLowerCase().includes(filter);
      return notInLinea && matchesFilter;
    });
  }

  async openLinea(linea: Linea) {
    this.selectedLinea.set(linea);
    this.showAddProduct.set(false);
    this.productFilter.set('');
  }

  async closeLinea() {
    this.selectedLinea.set(null);
    this.showAddProduct.set(false);
    this.productFilter.set('');
  }

  async toggleAddProduct() {
    this.showAddProduct.update((v) => !v);
    if (!this.showAddProduct()) {
      this.productFilter.set('');
    }
  }

  async agregarLinea() {
    const name = this.newLineaName();
    if (!name || !name.trim()) {
      return;
    }
    this.lineasService.agregarLinea(name.trim());
    this.newLineaName.set('');
    this.isAdding.set(false);
  }

  async addProductToLinea(productId: number | string) {
    const linea = this.selectedLinea();
    if (linea) {
      this.lineasService.agregarProductoALinea(linea.id, productId);
      this.selectedLinea.set(this.lineasService.getLineaById(linea.id) || null);
    }
  }

  async removeProductFromLinea(productId: number | string) {
    const linea = this.selectedLinea();
    if (linea) {
      this.lineasService.eliminarProductoDeLinea(linea.id, productId);
      this.selectedLinea.set(this.lineasService.getLineaById(linea.id) || null);
    }
  }

  async deleteLinea(id: string) {
    const ok = await this.notifications.confirm({ titulo: 'Confirmar acción', mensaje: '¿Estás seguro de eliminar esta línea?', tipo: 'danger', confirmarTexto: 'Eliminar' });
    if (ok) {
      this.lineasService.eliminarLinea(id);
    }
  }
}