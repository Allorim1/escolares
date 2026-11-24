import { Component, HostListener, inject, signal, computed, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ProductsStateService } from '../../data-access/products-state.service';
import { LoadingComponent } from '../../../shared/ui/loading/loading';
import { CurrencyService } from '../../../shared/data-access/currency.service';
import { AuthService } from '../../../shared/data-access/auth.service';
import { ApiKeyStatusService } from '../../../shared/data-access/api-key-status.service';
import { CartStateService } from '../../../shared/data-access/cart-state.service';
import { OfertasService } from '../../../shared/data-access/ofertas.service';
import { OfertasBackend } from '../../../backend/data-access/ofertas.backend';
import { FavoritesService } from '../../../shared/data-access/favorites.service';
import { Product } from '../../../shared/interfaces/product.interface';
import { NotificationService } from '../../../shared/data-access/notification.service';

@Component({
  selector: 'app-product-list',
  imports: [RouterLink, FormsModule, LoadingComponent],
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
      position: fixed; inset: 0; width: 100%; height: 100%;
      background: rgba(15, 23, 42, 0.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 2000; padding: 1rem;
      backdrop-filter: blur(2px);
      animation: pl-fade-in .18s ease-out;
    }
    .modal-overlay.modal-closing { animation: pl-fade-out .18s ease-in forwards; }
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
    .product-cards { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 1.25rem; padding: .5rem 0; }
    .empty-state { padding: 3rem 1.5rem; text-align: center; background: #f8fafc; border: 1px dashed #d5e1ef; border-radius: 16px; color: #5f7185; }
    .empty-state h3 { margin: 0 0 .5rem; color: #17365f; font-size: 1.2rem; }
    .empty-state p { margin: 0 0 1rem; }
    .empty-state .clear-filters-btn { margin-top: .25rem; }
    .card-link { text-decoration: none; color: inherit; display: flex; flex-direction: column; flex: 1; }
    .card-link:focus-visible { outline: 3px solid rgba(29,99,193,.3); outline-offset: -3px; border-radius: 12px; }
    .quick-view-btn { background: #f3f6fa; color: #425a75; border: 1px solid #dbe5f0; border-radius: 8px; width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all .2s; flex-shrink: 0; }
    .quick-view-btn:hover { background: #e8f1fb; color: #1d63c1; border-color: #bfd4ec; }
    .quick-view-btn:focus-visible, .btn-fav:focus-visible, .qty-btn:focus-visible, .modal-close:focus-visible, .modal-add-to-cart-btn:focus-visible, .clear-filters-btn:focus-visible, .currency-toggle-btn:focus-visible, .pagination button:focus-visible, .category-item:focus-visible, .filter-group input:focus-visible, .filter-group select:focus-visible, .filter-chip button:focus-visible, .btn-primary-cta:focus-visible, .filters-toggle-btn:focus-visible, .btn:focus-visible { outline: 3px solid rgba(29,99,193,.28); outline-offset: 2px; }
    .btn { display:inline-flex; align-items:center; justify-content:center; gap:.5rem; padding:.65rem 1rem; border-radius:10px; font-size:.875rem; font-weight:600; cursor:pointer; border:1px solid transparent; transition: background .2s, color .2s, border-color .2s, transform .15s ease, box-shadow .2s; text-decoration:none; line-height:1.2; }
    .btn:active { transform: scale(.98); }
    .btn:disabled { opacity:.55; cursor:not-allowed; transform:none; }
    .btn-primary { background:#1d63c1; color:#fff; border-color:#1d63c1; box-shadow:0 2px 8px rgba(29,99,193,.2); }
    .btn-primary:hover:not(:disabled) { background:#155a9e; border-color:#155a9e; }
    .btn-secondary { background:#fff; color:#334e68; border-color:#d6e2f0; }
    .btn-secondary:hover:not(:disabled) { background:#f3f8fd; border-color:#bfd4ec; color:#1d63c1; }
    .filters-toggle-btn { background:#fff; color:#1d63c1; border:1px solid #d6e2f0; box-shadow:0 1px 3px rgba(15,23,42,.04); }
    .filters-toggle-btn:hover { background:#f3f8fd; border-color:#bfd4ec; }
    .clear-filters-btn { display:inline-flex; align-items:center; justify-content:center; padding:.65rem 1rem; border-radius:10px; border:1px solid #d6e2f0; background:#fff; color:#425a75; font-size:.85rem; font-weight:600; cursor:pointer; transition: all .2s; }
    .clear-filters-btn:hover { background:#f8fbff; color:#1d63c1; border-color:#bfd4ec; }
    .currency-toggle-btn { display:inline-flex; align-items:center; justify-content:center; min-width:52px; height:40px; padding:0 .9rem; border-radius:10px; border:1px solid #d6e2f0; background:#fff; color:#1d63c1; font-weight:700; cursor:pointer; transition: all .2s; }
    .currency-toggle-btn:hover { background:#f3f8fd; border-color:#bfd4ec; }
    .btn-primary-cta { display:inline-flex; align-items:center; justify-content:center; background:#1d63c1; color:#fff; border:none; border-radius:8px; padding:.55rem .5rem; font-size:.78rem; font-weight:600; cursor:pointer; transition: background .2s, transform .15s ease, box-shadow .2s; flex:1; height:38px; box-shadow:0 2px 8px rgba(29,99,193,.18); }
    .btn-primary-cta:hover { background:#155a9e; }
    .btn-primary-cta:active { transform: scale(.98); }
    .qty-btn { transition: background .2s, transform .15s ease; }
    .qty-btn:active { transform: scale(.96); }
    .btn-fav { transition: transform .15s ease, filter .2s ease; }
    .btn-fav:active { transform: scale(.96); }
    @media (max-width: 1400px) { .product-cards { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    @media (max-width: 1100px) { .product-cards { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 820px) { .product-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 600px) {
      .products-layout { flex-direction: column; }
      .products-sidebar { width: 100%; max-width: 100%; box-sizing: border-box; position: static; }
      .products-sidebar.collapsed-mobile { display: none; }
      .filters-toggle-btn { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; }
      .products-main { min-width: 0; max-width: 100%; }
      .modal-product-card { grid-template-columns: 1fr; }
      .modal-image-col { padding: 1rem; }
      .modal-info-col { padding-left: 1.5rem; padding-bottom: 1.5rem; }
    }
    @media (max-width: 420px) { .product-cards { grid-template-columns: 1fr; } }
    .card-hover:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
      border: 2px solid #1d63c1 !important;
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
  private router = inject(Router);
  currencyService = inject(CurrencyService);
  private authService = inject(AuthService);
  apiKeyStatusService = inject(ApiKeyStatusService);
  cartState = inject(CartStateService).state;
  private ofertasService = inject(OfertasService);
  private ofertasBackend = inject(OfertasBackend);
  favoritesService = inject(FavoritesService);
  private notificationService = inject(NotificationService);

  selectedProduct = signal<Product | null>(null);
  modalClosing = signal(false);
  modalQuantity = signal(1);
  modalImage = signal<string>('');
  mouseX = signal(50);
  mouseY = signal(50);
  sortOption = signal<'relevance' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc'>('relevance');
  filtersOpen = signal(false);
  private lastFocused: HTMLElement | null = null;

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
    const cartItem = this.cartState().products.find((p) => p.product.id === productId);
    return cartItem ? cartItem.quantity : 0;
  }

  readonly productsInCart = computed(() => {
    const products = this.cartState().products;
    return new Set(products.map((p) => p.product.id));
  });

  readonly productQuantities = computed(() => {
    const products = this.cartState().products;
    const map = new Map<string | number, number>();
    products.forEach((p) => map.set(p.product.id, p.quantity));
    return map;
  });

  addToCardFromCard(product: Product) {
    this.cartState.add({ product, quantity: 1 });
    this.notificationService.success('Carrito', `${product.title} agregado al carrito`);
  }

  increaseCardQuantity(product: Product) {
    this.cartState.add({ product, quantity: 1 });
  }

  decreaseCardQuantity(product: Product) {
    const cartItem = this.cartState().products.find((p) => p.product.id === product.id);
    if (!cartItem) return;

    if (cartItem.quantity <= 1) {
      this.cartState.remove(product.id);
    } else {
      this.cartState.update({ product, quantity: cartItem.quantity - 1 });
    }
  }

  openModal(product: Product, trigger?: EventTarget | null) {
    this.lastFocused = (trigger instanceof HTMLElement ? trigger : (document.activeElement instanceof HTMLElement ? document.activeElement : null));
    this.modalClosing.set(false);
    this.selectedProduct.set(product);
    this.modalQuantity.set(1);
    this.modalImage.set(product.image);
  }

  closeModal() {
    if (!this.selectedProduct() || this.modalClosing()) return;
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finish = () => {
      this.selectedProduct.set(null);
      this.modalClosing.set(false);
      const el = this.lastFocused;
      this.lastFocused = null;
      setTimeout(() => el?.focus(), 0);
    };
    if (prefersReduced) { finish(); return; }
    this.modalClosing.set(true);
    setTimeout(finish, 180);
  }

  setModalImage(img: string) {
    this.modalImage.set(img);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.selectedProduct()) this.closeModal();
  }

  @HostListener('document:keydown', ['$event'])
  onModalKeydown(event: KeyboardEvent) {
    if (!this.selectedProduct() || event.key !== 'Tab') return;
    const modal = document.querySelector<HTMLElement>('.modal-content');
    if (!modal) return;
    const focusables = Array.from(modal.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed');
    if (!focusables.length) { event.preventDefault(); return; }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
  }

  navigateToProduct(product: Product) {
    this.router.navigate(['/products', product.id]);
  }

  increaseModalQuantity() {
    this.modalQuantity.update((q) => q + 1);
  }

  decreaseModalQuantity() {
    if (this.modalQuantity() > 1) {
      this.modalQuantity.update((q) => q - 1);
    }
  }

  addToCartFromModal() {
    const product = this.selectedProduct();
    if (!product) return;

    this.cartState.add({
      product,
      quantity: this.modalQuantity(),
    });
    this.notificationService.success('Carrito', `${product.title} agregado al carrito`);
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
    return this.ofertasService.isEnOferta(product.id);
  }

  getOfertaPrice(product: Product): number | null {
    return this.ofertasService.getOfertaPrice(product.id);
  }

  getDescuento(product: Product): number {
    const ofertaPrice = this.getOfertaPrice(product);
    if (!ofertaPrice) return 0;
    const descuento = ((product.price - ofertaPrice) / product.price) * 100;
    return Math.round(descuento);
  }

  toggleFavorito(product: Product) {
    this.favoritesService.toggleFavorito(product.id);
  }

  isFavorito(productId: number | string): boolean {
    return this.favoritesService.isFavorito(productId);
  }

  filterText = signal('');
  filterCategory = signal('');
  filterBrand = signal('');
  filterPriceMin = signal<number | null>(null);
  filterPriceMax = signal<number | null>(null);
  filterPriceMinBs = signal<number | null>(null);
  filterPriceMaxBs = signal<number | null>(null);
  currentBrand = signal('');

  ngOnInit() {
    this.productsState.loadProducts();
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
      this.filterText.set(queryParams.get('search') || '');
      this.filterCategory.set(queryParams.get('category') || '');
      this.productsState.reset();
    });
  }

  // compute unique categories from products
  categories = computed(() => {
    const allProducts = this.productsState.allProducts() || [];
    const cats = new Set<string>();
    allProducts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  });

  // compute price range in USD
  priceRange = computed(() => {
    const allProducts = this.productsState.allProducts() || [];
    if (!allProducts.length) return { min: 0, max: 1000 };
    const prices = allProducts.map((p) => p.price);
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  });

  // compute price range in Bs (converted from USD)
  priceRangeBs = computed(() => {
    const usdRange = this.priceRange();
    const tasa = this.currencyService.currentTasa();
    if (tasa <= 0) return usdRange;
    return {
      min: Math.floor(usdRange.min * tasa),
      max: Math.ceil(usdRange.max * tasa),
    };
  });

  // max price in Bs for filter max attribute
  maxPriceBs = computed(() => {
    const allProducts = this.productsState.allProducts() || [];
    if (!allProducts.length) return 1000;
    const tasa = this.currencyService.currentTasa();
    if (tasa <= 0) return Math.ceil(Math.max(...allProducts.map((p) => p.price || 0)));
    return Math.ceil(Math.max(...allProducts.map((p) => (p.price || 0) * tasa)));
  });

  filteredProducts = computed(() => {
    const list = this.productsState.allProducts() || [];
    const text = this.filterText().toLowerCase();
    const category = this.filterCategory();
    const brand = this.filterBrand();
    const minPriceUsd = this.filterPriceMin();
    const maxPriceUsd = this.filterPriceMax();
    const minPriceBs = this.filterPriceMinBs();
    const maxPriceBs = this.filterPriceMaxBs();
    const tasa = this.currencyService.currentTasa() || 1;

    const filtered = list.filter((p) => {
      const title = (p.title || '').toString().toLowerCase();
      const description = (p.description || '').toString().toLowerCase();
      const categoryValue = (p.category || '').toString().toLowerCase();
      const brandValue = (p.marca || '').toString().toLowerCase();
      const priceUsd = typeof p.price === 'number' ? p.price : Number(p.price || 0);
      const priceBs = priceUsd * tasa;

      if (text && !title.includes(text) && !description.includes(text)) return false;
      if (category && categoryValue !== category.toLowerCase()) return false;
      if (brand && brandValue !== brand.toLowerCase()) return false;
      if (minPriceUsd !== null && priceUsd < minPriceUsd) return false;
      if (maxPriceUsd !== null && priceUsd > maxPriceUsd) return false;
      if (minPriceBs !== null && priceBs < minPriceBs) return false;
      if (maxPriceBs !== null && priceBs > maxPriceBs) return false;
      return true;
    });

    const sort = this.sortOption();
    const effectivePrice = (p: Product) => this.getOfertaPrice(p) ?? p.price;
    if (sort === 'price-asc') filtered.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    else if (sort === 'price-desc') filtered.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    else if (sort === 'name-asc') filtered.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'es'));
    else if (sort === 'name-desc') filtered.sort((a, b) => (b.title || '').localeCompare(a.title || '', 'es'));
    return filtered;
  });

  readonly pageSize = 25;

  totalPages = computed(() => {
    const total = this.filteredProducts().length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  });

  // paginated filtered products - pagination happens client-side on filtered results
  paginatedProducts = computed(() => {
    const page = this.productsState.state.page();
    const start = (page - 1) * this.pageSize;
    const filtered = this.filteredProducts() || [];
    return filtered.slice(start, start + this.pageSize);
  });

  clearFilters() {
    this.filterText.set('');
    this.filterCategory.set('');
    this.filterBrand.set('');
    this.filterPriceMin.set(null);
    this.filterPriceMax.set(null);
    this.filterPriceMinBs.set(null);
    this.filterPriceMaxBs.set(null);
    this.sortOption.set('relevance');
    this.productsState.reset();
  }

  toggleFilters() { this.filtersOpen.set(!this.filtersOpen()); }

  activeFilterChips = computed(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];
    const text = this.filterText().trim();
    const cat = this.filterCategory().trim();
    const brand = this.filterBrand().trim();
    const min = this.filterPriceMin();
    const max = this.filterPriceMax();
    const minBs = this.filterPriceMinBs();
    const maxBs = this.filterPriceMaxBs();
    if (text) chips.push({ key: 'text', label: `Búsqueda: ${text}`, clear: () => { this.filterText.set(''); this.productsState.reset(); } });
    if (cat) chips.push({ key: 'cat', label: `Categoría: ${cat}`, clear: () => { this.filterCategory.set(''); this.productsState.reset(); } });
    if (brand) chips.push({ key: 'brand', label: `Marca: ${brand}`, clear: () => { this.filterBrand.set(''); this.productsState.reset(); } });
    if (min !== null) chips.push({ key: 'min', label: `Min USD: $${min}`, clear: () => { this.filterPriceMin.set(null); this.productsState.reset(); } });
    if (max !== null) chips.push({ key: 'max', label: `Max USD: $${max}`, clear: () => { this.filterPriceMax.set(null); this.productsState.reset(); } });
    if (minBs !== null) chips.push({ key: 'minbs', label: `Min Bs: ${minBs}`, clear: () => { this.filterPriceMinBs.set(null); this.productsState.reset(); } });
    if (maxBs !== null) chips.push({ key: 'maxbs', label: `Max Bs: ${maxBs}`, clear: () => { this.filterPriceMaxBs.set(null); this.productsState.reset(); } });
    return chips;
  });

  changePage(delta: number) {
    this.productsState.changePage(delta);

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
