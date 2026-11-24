import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OfertasService } from '../../shared/data-access/ofertas.service';
import { ProductsService } from '../../products/data-access/products.service';
import { Product } from '../../shared/interfaces/product.interface';

@Component({
  selector: 'app-admin-ofertas',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-ofertas.html',
  styleUrl: './admin-ofertas.css',
})
export class AdminOfertas implements OnInit {
  ofertasService = inject(OfertasService);
  private productsService = inject(ProductsService);
  private notifications = inject(NotificationModalService);

  allProducts = signal<Product[]>([]);
  filterText = signal('');
  showAddForm = signal(false);
  selectedProduct = signal<Product | null>(null);
  ofertaPrice = signal<number>(0);

  productsEnOferta = computed(() => {
    const ofertaIds = this.ofertasService.ofertas().map((o) => o.productId);
    return this.allProducts().filter((p) => ofertaIds.includes(p.id));
  });

  productsSinOferta = computed(() => {
    const filter = this.filterText().toLowerCase();
    const ofertaIds = this.ofertasService.ofertas().map((o) => o.productId);
    return this.allProducts().filter((p) => {
      const notInOferta = !ofertaIds.includes(p.id);
      const matchesFilter =
        !filter ||
        p.title.toLowerCase().includes(filter) ||
        p.description.toLowerCase().includes(filter);
      return notInOferta && matchesFilter;
    });
  });

  async ngOnInit() {
    this.productsService.getProducts().subscribe({
      next: (response) => this.allProducts.set(response.products),
      error: (err) => console.error('Error loading products:', err),
    });
  }

  async openAddForm(product: Product) {
    this.selectedProduct.set(product);
    const oferta = this.ofertasService.getOferta(product.id);
    this.ofertaPrice.set(oferta?.precioOferta || product.price * 0.9);
    this.showAddForm.set(true);
  }

  async closeForm() {
    this.showAddForm.set(false);
    this.selectedProduct.set(null);
  }

  async saveOferta() {
    const product = this.selectedProduct();
    if (product && this.ofertaPrice() > 0) {
      this.ofertasService.agregarOferta(product.id, this.ofertaPrice());
      this.closeForm();
    }
  }

  async removeOferta(productId: number | string) {
    const ok = await this.notifications.confirm({ titulo: 'Confirmar acción', mensaje: '¿Eliminar esta oferta?', tipo: 'danger', confirmarTexto: 'Eliminar' });
    if (ok) {
      this.ofertasService.eliminarOferta(productId);
    }
  }

  getOfertaPriceForProduct(product: Product): number {
    return this.ofertasService.getOfertaPrice(product.id) || 0;
  }

  getOfertaPrice(productId: number | string): number {
    return this.ofertasService.getOfertaPrice(productId) || 0;
  }
}