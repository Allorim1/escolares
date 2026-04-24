import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProductsStateService } from '../../data-access/products-state.service';
import { LoadingComponent } from '../../../shared/ui/loading/loading';
import { CurrencyService } from '../../../shared/data-access/currency.service';
import { AuthService } from '../../../shared/data-access/auth.service';
import { ApiKeyStatusService } from '../../../shared/data-access/api-key-status.service';
import { CartStateService } from '../../../shared/data-access/cart-state.service';
import { OfertasService } from '../../../shared/data-access/ofertas.service';
import { OfertasBackend } from '../../../backend/data-access/ofertas.backend';
import { Product } from '../../../shared/interfaces/product.interface';

@Component({
  selector: 'app-product-list',
  imports: [RouterLink, FormsModule, LoadingComponent, CommonModule],
  templateUrl: './product-list.html',
  styles: `
    .products-layout {
      display: flex;
      gap: 2rem;
      align-items: flex-start;
    }
    .products-sidebar {
      width: 250px;
      flex-shrink: 0;
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: 12px;
      position: sticky;
      top: 1rem;
    }
    .sidebar-section {
      margin-bottom: 1.5rem;
    }
    .sidebar-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #333;
      margin: 0 0 1rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #1976d2;
    }
    .category-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .category-list li {
      margin-bottom: 0.5rem;
    }
    .category-item {
      width: 100%;
      padding: 0.625rem 1rem;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 8px;
      text-align: left;
      cursor: pointer;
      font-size: 0.9rem;
      color: #555;
      transition: all 0.2s;
    }
    .category-item:hover {
      background: #e3f2fd;
      color: #1976d2;
    }
    .category-item.active {
      background: #1976d2;
      color: white;
      border-color: #1976d2;
    }
    .current-brand {
      font-size: 0.95rem;
      color: #333;
      font-weight: 600;
      margin: 0.5rem 0;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #1976d2;
      text-decoration: none;
      margin-bottom: 1rem;
      font-weight: 500;
    }
    .products-main {
      flex: 1;
      min-width: 0;
    }
    .reveal-init {
      opacity: 0;
      transform: translateY(30px);
      transition: all 0.8s ease-out;
    }
    .reveal-active {
      opacity: 1;
      transform: translateY(0);
    }
    .filter-section {
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: 12px;
      margin-bottom: 2rem;
    }
    .filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: flex-end;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .filter-group label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #555;
    }
    .filter-group input,
    .filter-group select {
      padding: 0.5rem 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      min-width: 150px;
    }
    .filter-group input:focus,
    .filter-group select:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
    }
    .clear-filters-btn {
      padding: 0.5rem 1rem;
      background: #1d63c1;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background 0.2s;
    }
    .clear-filters-btn:hover {
      background: #1d63c1;
    }
    .filter-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
    }
    .results-count {
      color: #666;
      font-size: 0.875rem;
      margin: 0;
    }
    .currency-toggle-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 16px;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
      transition: background 0.2s;
    }
    .currency-toggle-btn:hover {
      background: #1565c0;
    }
    .currency-icon {
      font-size: 1.1rem;
      font-weight: 700;
    }
    .currency-label {
      font-size: 0.85rem;
    }
    .page-indicator {
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      background-color: #1976d2;
      color: #fff;
    }
    .pagination {
      align-items: center;
    }
    .pagination .btn-secondary {
      background: #f0f0f0;
      border: 1px solid #ccc;
      transition: background 0.2s;
    }
    .pagination .btn-secondary:hover:not(:disabled) {
      background: #e0e0e0;
    }
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 1rem;
    }
    .modal-content {
      background: white;
      border-radius: 16px;
      width: 100%;
      max-width: 700px;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
    }
    .modal-close {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: none;
      border: none;
      font-size: 1.75rem;
      color: #999;
      cursor: pointer;
      z-index: 1;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.2s;
    }
    .modal-close:hover {
      background: #f0f0f0;
      color: #333;
    }
    .modal-product-card {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .modal-image-col {
      padding: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f8f8;
      overflow: hidden;
      cursor: zoom-in;
    }
    .modal-image-col:hover .modal-product-image {
      transform: scale(2);
      cursor: zoom-out;
    }
    .modal-product-image {
      max-width: 100%;
      max-height: 300px;
      object-fit: contain;
      border-radius: 8px;
      transition: transform 0.2s ease;
    }
    .modal-info-col {
      padding: 1.5rem;
      padding-left: 0;
      display: flex;
      flex-direction: column;
    }
    .modal-product-title {
      margin: 0 0 0.75rem;
      font-size: 1.5rem;
      color: #333;
      font-weight: 600;
      text-transform: capitalize;
    }
    .modal-product-description {
      color: #666;
      font-size: 0.95rem;
      margin-bottom: 1rem;
      line-height: 1.5;
    }
    .modal-product-price {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1976d2;
      margin-bottom: 1rem;
    }
    .modal-product-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .meta-label {
      font-size: 0.8rem;
      color: #888;
    }
    .meta-value {
      font-size: 0.9rem;
      font-weight: 600;
      color: #333;
      background: #f0f0f0;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }
    .modal-quantity-selector {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .modal-quantity-selector label {
      font-weight: 600;
      color: #333;
    }
    .quantity-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .qty-btn {
      width: 36px;
      height: 36px;
      border: 1px solid #ddd;
      background: #f8f8f8;
      border-radius: 6px;
      font-size: 1.25rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    .qty-btn:hover:not(:disabled) {
      background: #e0e0e0;
    }
    .qty-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .qty-value {
      min-width: 40px;
      text-align: center;
      font-weight: 600;
      font-size: 1.1rem;
    }
    .modal-add-to-cart-btn {
      padding: 1rem 1.5rem;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      width: 100%;
    }
    .modal-add-to-cart-btn:hover {
      background: #1565c0;
    }
    @media (max-width: 600px) {
      .products-layout {
        flex-direction: column;
      }
      .products-sidebar {
        width: 100%;
        position: static;
      }
      .modal-product-card {
        grid-template-columns: 1fr;
      }
      .modal-image-col {
        padding: 1rem;
      }
      .modal-info-col {
        padding-left: 1.5rem;
        padding-bottom: 1.5rem;
      }
    }
    .card-hover:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
      border-color: #1d63c1 !important;
    }
    .oferta-card {
      border: 2px solid #e53935 !important;
      position: relative;
    }
    .oferta-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #e53935, #ff7043);
    }
    .oferta-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      background: linear-gradient(135deg, #e53935, #c62828);
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 700;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(229, 57, 53, 0.4);
    }
    .oferta-price {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .precio-original {
      text-decoration: line-through;
      color: #999;
      font-size: 0.85rem;
      font-weight: 400;
    }
    .precio-oferta {
      color: #e53935;
      font-weight: 700;
    }
  `,
  providers: [ProductsStateService],
})
export default class ProductList implements OnInit {
  productsState = inject(ProductsStateService);
  private route = inject(ActivatedRoute);
  currencyService = inject(CurrencyService);
  private authService = inject(AuthService);
  apiKeyStatusService = inject(ApiKeyStatusService);
  cartState = inject(CartStateService).state;
  private ofertasService = inject(OfertasService);
  private ofertasBackend = inject(OfertasBackend);

  selectedProduct = signal<Product | null>(null);
  modalQuantity = signal(1);
  mouseX = signal(50);
  mouseY = signal(50);

  onMouseMove(event: MouseEvent, isHovering: boolean) {
    if (!isHovering) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    this.mouseX.set(x);
    this.mouseY.set(y);
  }

  getZoomStyle(): string {
    return `transform-origin: ${this.mouseX()}% ${this.mouseY()}%;`;
  }

  getCardQuantity(productId: string | number): number {
    const cartItem = this.cartState().products.find(
      (p: any) => p.product.id === productId
    );
    return cartItem ? cartItem.quantity : 0;
  }

  addToCardFromCard(product: Product) {
    this.cartState.add({ product, quantity: 1 });
  }

  increaseCardQuantity(product: Product) {
    this.cartState.add({ product, quantity: 1 });
  }

  decreaseCardQuantity(product: Product) {
    const cartItem = this.cartState().products.find(
      (p: any) => p.product.id === product.id
    );
    if (!cartItem) return;
    
    if (cartItem.quantity <= 1) {
      this.cartState.remove(product.id);
    } else {
      this.cartState.udpate({ product, quantity: cartItem.quantity - 1 });
    }
  }

  openModal(product: Product) {
    this.selectedProduct.set(product);
    this.modalQuantity.set(1);
  }

  closeModal() {
    this.selectedProduct.set(null);
  }

  increaseModalQuantity() {
    this.modalQuantity.update(q => q + 1);
  }

  decreaseModalQuantity() {
    if (this.modalQuantity() > 1) {
      this.modalQuantity.update(q => q - 1);
    }
  }

  addToCartFromModal() {
    const product = this.selectedProduct();
    if (!product) return;
    
    this.cartState.add({
      product,
      quantity: this.modalQuantity(),
    });
    this.closeModal();
  }

  // Check if prices should be shown
  shouldShowPrice(): boolean {
    if (this.authService.isLoggedIn()) return true;
    if (!this.apiKeyStatusService.preciosOcultosParaNoRegistrados()) return true;
    return false;
  }

  // Check if current user is root
  isRoot(): boolean {
    return this.authService.user()?.rol === 'root';
  }

  // Toggle currency display (only works for root users)
  toggleCurrency() {
    this.currencyService.toggleCurrency();
  }

  // Get the title for the toggle button
  getToggleTitle(): string {
    const display = this.currencyService.currencyDisplay();
    if (display === 'BOTH') return 'Mostrando ambos precios - Click para ver solo USD';
    if (display === 'BS') return 'Mostrando Bs - Click para ver ambos';
    return 'Mostrando USD - Click para ver en Bs';
  }

  // Format price based on current currency display
  formatPrice(priceInUsd: number): string {
    return this.currencyService.formatPrice(priceInUsd);
  }

  isEnOferta(product: Product): boolean {
    return this.ofertasService.isEnOferta(product.id as any);
  }

  getOfertaPrice(product: Product): number | null {
    return this.ofertasService.getOfertaPrice(product.id as any);
  }

  getDescuento(product: Product): number {
    const ofertaPrice = this.getOfertaPrice(product);
    if (!ofertaPrice) return 0;
    const descuento = ((product.price - ofertaPrice) / product.price) * 100;
    return Math.round(descuento);
  }

  filterText = signal('');
  filterCategory = signal('');
  filterBrand = signal('');
  filterPriceMin = signal<number | null>(null);
  filterPriceMax = signal<number | null>(null);
  currentBrand = signal('');

  ngOnInit() {
    this.ofertasBackend.reload();
    this.route.paramMap.subscribe((params) => {
      const brand = params.get('brand');
      if (brand) {
        this.filterBrand.set(brand);
        this.currentBrand.set(brand);
      } else {
        this.filterBrand.set('');
        this.currentBrand.set('');
      }
    });

    this.route.queryParamMap.subscribe((queryParams) => {
      const search = queryParams.get('search');
      if (search) {
        this.filterText.set(search);
      }
    });
  }

  // compute unique categories from products
  categories = computed(() => {
    const products = this.productsState.state.products();
    const allProducts = this.productsState.allProducts();
    const cats = new Set<string>();
    allProducts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  });

  // compute price range
  priceRange = computed(() => {
    const allProducts = this.productsState.allProducts();
    if (allProducts.length === 0) return { min: 0, max: 1000 };
    const prices = allProducts.map((p) => p.price);
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  });

  filteredProducts = computed(() => {
    const list = this.productsState.allProducts();
    const text = this.filterText().toLowerCase();
    const category = this.filterCategory();
    const brand = this.filterBrand();
    const minPrice = this.filterPriceMin();
    const maxPrice = this.filterPriceMax();

    return list.filter((p) => {
      // text filter
      if (
        text &&
        !p.title.toLowerCase().includes(text) &&
        !p.description.toLowerCase().includes(text)
      ) {
        return false;
      }
      // category filter
      if (category && p.category !== category) {
        return false;
      }
      // brand filter
      if (brand && p.marca !== brand) {
        return false;
      }
      // price range filter
      if (minPrice !== null && p.price < minPrice) {
        return false;
      }
      if (maxPrice !== null && p.price > maxPrice) {
        return false;
      }
      return true;
    });
  });

  // paginated filtered products
  paginatedProducts = computed(() => {
    const page = this.productsState.state.page();
    const pageSize = 8;
    const start = (page - 1) * pageSize;
    return this.filteredProducts().slice(start, start + pageSize);
  });

  clearFilters() {
    this.filterText.set('');
    this.filterCategory.set('');
    this.filterBrand.set('');
    this.filterPriceMin.set(null);
    this.filterPriceMax.set(null);
    this.productsState.changePage$.next(1);
  }

  changePage(delta: number) {
    const current = this.productsState.state.page();
    const next = Math.max(1, current + delta);
    this.productsState.changePage$.next(next);

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
