import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { LineasService, Linea } from '../shared/data-access/lineas.service';
import { ProductsService } from '../../products/data-access/products.service';
import { Product } from '../../shared/interfaces/product.interface';
import { CurrencyService } from '../../shared/data-access/currency.service';
import { AuthService } from '../../shared/data-access/auth.service';
import { ApiKeyStatusService } from '../../shared/data-access/api-key-status.service';
import { CartStateService } from '../../shared/data-access/cart-state.service';
import { OfertasService } from '../../shared/data-access/ofertas.service';
import { FavoritesService } from '../../shared/data-access/favorites.service';

@Component({
  selector: 'app-productos-linea',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './productos-linea.html',
  styleUrl: './productos-linea.css',
})
export class ProductosLinea implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lineasService = inject(LineasService);
  private productsService = inject(ProductsService);
  currencyService = inject(CurrencyService);
  private authService = inject(AuthService);
  apiKeyStatusService = inject(ApiKeyStatusService);
  cartState = inject(CartStateService).state;
  private ofertasService = inject(OfertasService);
  favoritesService = inject(FavoritesService);

  linea = signal<Linea | null>(null);
  allProducts = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  brands = signal<string[]>([]);
  selectedBrand = signal<string>('');
  filterText = signal('');
  page = signal(1);
  pageSize = 12;

  ngOnInit() {
    this.productsService.getAllProducts().subscribe({
      next: (products) => {
        this.allProducts.set(products);
        this.route.paramMap.subscribe((params) => {
          const id = params.get('id');
          if (id) {
            this.loadLinea(id);
          }
        });
      },
      error: (err) => console.error('Error loading products:', err),
    });
  }

  private loadLinea(id: string) {
    const found = this.lineasService.getLineaById(id);
    if (found) {
      this.linea.set(found);
      this.filterProducts();
    } else {
      this.router.navigate(['/lineas']);
    }
  }

  private filterProducts() {
    const currentLinea = this.linea();
    if (!currentLinea) return;

    const products = this.allProducts().filter((p) => {
      const matchesLinea = p.lineaId === currentLinea.id;
      const text = this.filterText().toLowerCase();
      const matchesText =
        !text ||
        p.title.toLowerCase().includes(text) ||
        p.description.toLowerCase().includes(text);
      const matchesBrand =
        !this.selectedBrand() || p.marca === this.selectedBrand();
      return matchesLinea && matchesText && matchesBrand;
    });

    this.filteredProducts.set(products);
    this.extractBrands();
    this.page.set(1);
  }

  private extractBrands() {
    const brandsSet = new Set<string>();
    this.filteredProducts().forEach((p) => {
      if (p.marca) brandsSet.add(p.marca);
    });
    this.brands.set(Array.from(brandsSet).sort());
  }

  paginatedProducts = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredProducts().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.filteredProducts().length / this.pageSize));

  onFilterTextChange(value: string) {
    this.filterText.set(value);
    this.filterProducts();
  }

  onBrandSelect(brand: string) {
    this.selectedBrand.set(this.selectedBrand() === brand ? '' : brand);
    this.filterProducts();
  }

  clearFilters() {
    this.filterText.set('');
    this.selectedBrand.set('');
    this.filterProducts();
  }

  changePage(delta: number) {
    this.page.update((p) => Math.max(1, Math.min(p + delta, this.totalPages())));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  shouldShowPrice(): boolean {
    if (this.authService.isLoggedIn()) return true;
    if (!this.apiKeyStatusService.preciosOcultosParaNoRegistrados()) return true;
    return false;
  }

  formatPrice(priceInUsd: number): string {
    return this.currencyService.formatPrice(priceInUsd);
  }

  isEnOferta(product: Product): boolean {
    return this.ofertasService.isEnOferta(product.id as number | string);
  }

  getOfertaPrice(product: Product): number | null {
    return this.ofertasService.getOfertaPrice(product.id as number | string);
  }

  getDescuento(product: Product): number {
    const ofertaPrice = this.getOfertaPrice(product);
    if (!ofertaPrice) return 0;
    const descuento = ((product.price - ofertaPrice) / product.price) * 100;
    return Math.round(descuento);
  }

  addToCart(product: Product) {
    this.cartState.add({ product, quantity: 1 });
  }

  toggleFavorito(product: Product) {
    this.favoritesService.toggleFavorito(product.id);
  }

  decreaseCartQuantity(product: Product) {
    const currentQty = this.getCardQuantity(product.id) ?? 0;
    if (currentQty <= 1) {
      this.cartState.remove(product.id);
    } else {
      this.cartState.add({ product, quantity: currentQty - 1 });
    }
  }

  isFavorito(productId: number | string): boolean {
    return this.favoritesService.isFavorito(productId);
  }

  getCardQuantity(productId: number | string): number {
    const cartItem = this.cartState().products.find(
      (p: { product: { id: number | string } }) => p.product.id === productId
    );
    return cartItem ? cartItem.quantity : 0;
  }
}
