import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OfertasService } from '../../shared/data-access/ofertas.service';
import { ProductsService } from '../../products/data-access/products.service';
import { Product } from '../../shared/interfaces/product.interface';

@Component({
  selector: 'app-admin-ofertas',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-ofertas.html',
  styleUrl: './admin-ofertas.css',
})
export class AdminOfertas implements OnInit {
  ofertasService = inject(OfertasService);
  private productsService = inject(ProductsService);

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

  ngOnInit() {
    this.productsService.getProducts().subscribe({
      next: (products) => this.allProducts.set(products),
      error: (err) => console.error('Error loading products:', err),
    });
  }

  openAddForm(product: Product) {
    this.selectedProduct.set(product);
    const oferta = this.ofertasService.getOferta(product.id);
    this.ofertaPrice.set(oferta?.precioOferta || product.price * 0.9);
    this.showAddForm.set(true);
  }

  closeForm() {
    this.showAddForm.set(false);
    this.selectedProduct.set(null);
  }

  saveOferta() {
    const product = this.selectedProduct();
    if (product && this.ofertaPrice() > 0) {
      this.ofertasService.agregarOferta(product.id, this.ofertaPrice());
      this.closeForm();
    }
  }

  removeOferta(productId: number) {
    if (confirm('¿Eliminar esta oferta?')) {
      this.ofertasService.eliminarOferta(productId);
    }
  }

  getOfertaPrice(productId: number): number {
    return this.ofertasService.getOfertaPrice(productId) || 0;
  }
}
