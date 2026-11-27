import { AfterViewInit, Component, ElementRef, HostListener, PLATFORM_ID, computed, effect, inject, input, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { animate, stagger } from 'animejs';
import { RouterLink } from '@angular/router';

import { ProductDetailSateService } from '../../data-access/product-detail-state.service';
import { CartStateService } from '../../../shared/data-access/cart-state.service';
import { OfertasService } from '../../../shared/data-access/ofertas.service';
import { CurrencyService } from '../../../shared/data-access/currency.service';
import { AuthService } from '../../../shared/data-access/auth.service';
import { ApiKeyStatusService } from '../../../shared/data-access/api-key-status.service';
import { LineasService } from '../../../shared/data-access/lineas.service';
import { RatingsService } from '../../../shared/data-access/ratings.service';
import { FavoritesService } from '../../../shared/data-access/favorites.service';
import { ProductsService } from '../../data-access/products.service';
import { NotificationService } from '../../../shared/data-access/notification.service';
import { ProductRating } from '../../../shared/ui/product-rating/product-rating';
import { Product, Color } from '../../../shared/interfaces/product.interface';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, ProductRating],
  templateUrl: './product-detail.html',
  styleUrls: ['./product-detail.css'],
  providers: [ProductDetailSateService],
})
export default class ProductDetail implements AfterViewInit {
  private productDetailService = inject(ProductDetailSateService);
  productDetailState = this.productDetailService.state;
  cartState = inject(CartStateService).state;
  private ofertasService = inject(OfertasService);
  currencyService = inject(CurrencyService);
  private authService = inject(AuthService);
  apiKeyStatusService = inject(ApiKeyStatusService);
  private lineasService = inject(LineasService);
  private ratingsService = inject(RatingsService);
  favoritesService = inject(FavoritesService);
  private productsService = inject(ProductsService);
  private notificationService = inject(NotificationService);
  private el = inject(ElementRef<HTMLElement>);
  private platformId = inject(PLATFORM_ID);

  id = input.required<string>();

  userRating = signal(0);
  quantity = signal(1);
  showAddedMessage = signal(false);
  activeImage = signal('');
  lightboxOpen = signal(false);
  selectedColor = signal<Color | null>(null);
  activeTab = signal<'descripcion' | 'ficha' | 'entrega'>('descripcion');
  relatedProducts = signal<Product[]>([]);
  linkCopied = signal(false);
  showStickyCta = signal(false);

  private prefersReducedMotion = false;
  private lastAnimatedProductId: string | number | null = null;
  private lastRelatedId: string | number | null = null;
  private tiltRaf = 0;

  constructor() {
    effect(() => {
      this.productDetailService.getById(this.id());
    });

    effect(() => {
      const p = this.product;
      if (p && this.authService.isLoggedIn()) this.loadUserRating(p.id);
    });

    effect(() => {
      const state = this.productDetailState();
      const p = state.product;
      if (!p || state.status !== 'success') return;

      if (p.id !== this.lastAnimatedProductId) {
        this.lastAnimatedProductId = p.id;
        this.quantity.set(1);
        this.selectedColor.set(null);
        this.activeTab.set('descripcion');
        this.activeImage.set(p.image);
        this.loadRelated(p);
        this.scheduleEntrance();
      }
    });
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.scheduleEntrance();
    }
  }

  get product() { return this.productDetailState().product; }
  get status() { return this.productDetailState().status; }

  get isEnOferta(): boolean {
    const p = this.product;
    return p ? this.ofertasService.isEnOferta(p.id) : false;
  }
  get precioOferta(): number | null {
    const p = this.product;
    return p ? this.ofertasService.getOfertaPrice(p.id) : null;
  }

  readonly galleryImages = computed(() => {
    const p = this.product;
    if (!p) return [] as string[];
    const imgs = [p.image, ...(p.images || [])].filter((img): img is string => !!img && typeof img === 'string');
    return Array.from(new Set(imgs));
  });

  readonly stockLabel = computed(() => {
    const p = this.product;
    if (!p) return { text: '', cls: '' };
    if (p.estado === 'agotado') return { text: 'Agotado', cls: 'stock-out' };
    const u = typeof p.unidades === 'number' ? p.unidades : null;
    if (u !== null && u <= 0) return { text: 'Agotado', cls: 'stock-out' };
    if (u !== null && u <= 5) return { text: `Quedan ${u} unidad${u === 1 ? '' : 'es'}`, cls: 'stock-low' };
    return { text: 'Disponible', cls: 'stock-ok' };
  });

  readonly canBuy = computed(() => {
    const p = this.product;
    if (!p) return false;
    if (p.estado === 'agotado') return false;
    if (typeof p.unidades === 'number' && p.unidades <= 0) return false;
    return this.shouldShowPrice();
  });

  readonly cartItem = computed(() => {
    const p = this.product;
    if (!p) return null;
    return this.cartState().products.find((i) => i.product.id === p.id) || null;
  });

  readonly cartQuantity = computed(() => this.cartItem()?.quantity ?? 0);

  readonly needsColor = computed(() => {
    const p = this.product;
    return !!(p?.colorido && (p.colores?.length || 0) > 0);
  });

  readonly savingsAmount = computed(() => {
    const p = this.product;
    const offer = this.precioOferta;
    if (!p || !offer) return 0;
    return Math.max(0, p.price - offer);
  });

  readonly breadcrumbs = computed(() => {
    const p = this.product;
    const crumbs: Array<{ label: string; link?: string; query?: Record<string, string> }> = [
      { label: 'Inicio', link: '/' },
      { label: 'Productos', link: '/products' },
    ];
    if (p?.category) crumbs.push({ label: p.category, link: '/products', query: { category: p.category } });
    if (p?.title) crumbs.push({ label: p.title });
    return crumbs;
  });

  shouldShowPrice(): boolean {
    if (this.authService.isLoggedIn()) return true;
    if (!this.apiKeyStatusService.preciosOcultosParaNoRegistrados()) return true;
    return false;
  }
  formatPrice(priceInUsd: number): string { return this.currencyService.formatPrice(priceInUsd); }
  isLoggedIn(): boolean { return this.authService.isLoggedIn(); }

  loadUserRating(productId: string | number) {
    this.ratingsService.getUserRating(productId).subscribe({
      next: (data) => this.userRating.set(data?.rate || 0),
      error: () => {},
    });
  }

  submitRating(rate: number) {
    const p = this.product;
    if (!p) return;
    this.ratingsService.submitRating(p.id, rate).subscribe({
      next: (data) => {
        if (data.success) {
          this.userRating.set(rate);
          const current = this.product;
          if (current) {
            this.productDetailService.updateProduct({
              ...current,
              rating: { rate: data.newAverage, count: data.count },
            });
          }
        }
      },
      error: () => this.notificationService.error('Error', 'No se pudo guardar la calificación'),
    });
  }

  selectImage(img: string) {
    if (this.activeImage() === img) return;
    this.activeImage.set(img);
    if (isPlatformBrowser(this.platformId) && !this.prefersReducedMotion) {
      requestAnimationFrame(() => {
        const main = this.el.nativeElement.querySelector('.product-detail-image') as HTMLElement | null;
        if (main) try { animate(main, { opacity: [0.4, 1], scale: [0.985, 1], duration: 280, ease: 'out(2)' }); } catch {}
      });
    }
  }

  openLightbox() { if (this.activeImage()) this.lightboxOpen.set(true); }
  closeLightbox() { this.lightboxOpen.set(false); }

  @HostListener('document:keydown.escape')
  onEsc() { if (this.lightboxOpen()) this.closeLightbox(); }

  @HostListener('window:scroll')
  onScroll() {
    if (!isPlatformBrowser(this.platformId)) return;
    const btn = this.el.nativeElement.querySelector('.action-buttons') as HTMLElement | null;
    if (!btn) { this.showStickyCta.set(false); return; }
    const rect = btn.getBoundingClientRect();
    this.showStickyCta.set(rect.bottom < 0 || rect.top > window.innerHeight);
  }

  selectColor(color: Color) {
    this.selectedColor.set(color);
    if (color.imagen) this.selectImage(color.imagen);
    if (isPlatformBrowser(this.platformId) && !this.prefersReducedMotion) {
      requestAnimationFrame(() => {
        const active = this.el.nativeElement.querySelector('.color-swatch.active') as HTMLElement | null;
        if (active) try { animate(active, { scale: [1, 1.15, 1], duration: 260, ease: 'out(2)' }); } catch {}
      });
    }
  }

  addToCart() {
    const p = this.product;
    if (!p || !this.canBuy()) return;
    if (this.needsColor() && !this.selectedColor()) {
      this.notificationService.warning('Selecciona un color', 'Elige un color antes de agregar al carrito.');
      return;
    }
    this.flyToCart();
    const qty = this.quantity();
    const color = this.selectedColor();
    for (let i = 0; i < qty; i++) {
      this.cartState.add({
        product: p,
        quantity: 1,
        ...(color ? { colorId: color.id, colorNombre: color.nombre } : {}),
      } as any);
    }
    this.showAddedMessage.set(true);
    if (isPlatformBrowser(this.platformId) && !this.prefersReducedMotion) {
      requestAnimationFrame(() => {
        const msg = this.el.nativeElement.querySelector('.added-message') as HTMLElement | null;
        const btn = this.el.nativeElement.querySelector('.add-to-cart-btn') as HTMLElement | null;
        try {
          if (msg) animate(msg, { opacity: [0, 1], translateY: [8, 0], duration: 260, ease: 'out(2)' });
          if (btn) animate(btn, { scale: [1, 0.97, 1], duration: 260, ease: 'out(2)' });
        } catch {}
      });
    }
    setTimeout(() => { this.showAddedMessage.set(false); this.quantity.set(1); }, 2000);
  }

  updateCartQuantity(delta: number) {
    const p = this.product;
    const item = this.cartItem();
    if (!p || !item) return;
    const next = item.quantity + delta;
    if (next <= 0) {
      this.cartState.remove(p.id);
      return;
    }
    this.cartState.update({ ...item, quantity: next });
  }

  toggleFavorito(sourceEl?: EventTarget | null) {
    const p = this.product;
    if (!p) return;
    const wasFav = this.favoritesService.isFavorito(p.id);
    this.favoritesService.toggleFavorito(p.id);
    if (sourceEl instanceof HTMLElement) this.animateFavorite(sourceEl, !wasFav);
    this.notificationService.success(!wasFav ? 'Agregado a favoritos' : 'Quitado de favoritos', p.title);
  }

  private animateFavorite(btn: HTMLElement, added: boolean) {
    if (!isPlatformBrowser(this.platformId) || this.prefersReducedMotion) return;
    const icon = btn.querySelector('svg') as HTMLElement | null;
    try {
      if (icon) animate(icon, { scale: [1, added ? 1.45 : 0.75, 1], duration: 320, ease: 'out(2)' });
      animate(btn, { scale: [1, 1.08, 1], duration: 260, ease: 'out(2)' });
    } catch {}
    if (!added) return;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const container = document.createElement('div');
    Object.assign(container.style, { position: 'fixed', left: `${cx}px`, top: `${cy}px`, width: '0', height: '0', pointerEvents: 'none', zIndex: '4500' } as Partial<CSSStyleDeclaration>);
    const ring = document.createElement('span');
    Object.assign(ring.style, { position: 'absolute', left: '-18px', top: '-18px', width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #e53935', boxSizing: 'border-box' } as Partial<CSSStyleDeclaration>);
    container.appendChild(ring);
    const colors = ['#e53935', '#ff6b6b', '#ff8a80', '#1d63c1', '#ffc107', '#ff7043'];
    for (let i = 0; i < 8; i++) {
      const dot = document.createElement('span');
      const size = 4 + Math.round(Math.random() * 4);
      const angle = (i / 8) * Math.PI * 2;
      const dist = 18 + Math.random() * 16;
      Object.assign(dot.style, { position: 'absolute', left: `${-size / 2}px`, top: `${-size / 2}px`, width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: colors[i % colors.length] } as Partial<CSSStyleDeclaration>);
      container.appendChild(dot);
      try { animate(dot, { translateX: [0, Math.cos(angle) * dist], translateY: [0, Math.sin(angle) * dist], scale: [1, 0.2], opacity: [1, 0], duration: 480, ease: 'out(3)' }); } catch {}
    }
    document.body.appendChild(container);
    try { animate(ring, { scale: [0.3, 1.9], opacity: [0.9, 0], duration: 480, ease: 'out(3)' }); } catch {}
    setTimeout(() => container.remove(), 750);
  }

  async shareProduct() {
    const p = this.product;
    if (!p || !isPlatformBrowser(this.platformId)) return;
    const url = window.location.href;
    const title = p.title;
    const text = `Mira este producto: ${p.title}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch { /* user cancelled or unsupported */ }
    await this.copyLink();
  }

  async copyLink() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      this.linkCopied.set(true);
      this.notificationService.success('Enlace copiado', 'El enlace del producto fue copiado.');
      setTimeout(() => this.linkCopied.set(false), 1800);
    } catch {
      this.notificationService.error('No se pudo copiar', 'Copia el enlace manualmente.');
    }
  }

  private loadRelated(p: Product) {
    if (this.lastRelatedId === p.id) return;
    this.lastRelatedId = p.id;
    this.productsService.getAllProducts().subscribe({
      next: (all) => {
        const sameCategory = all.filter((x) => x.id !== p.id && x.category && p.category && x.category === p.category);
        const sameBrand = all.filter((x) => x.id !== p.id && x.marca && p.marca && x.marca === p.marca);
        const merged = [...sameCategory, ...sameBrand];
        const seen = new Set<string | number>();
        const unique: Product[] = [];
        for (const item of merged) {
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          unique.push(item);
          if (unique.length >= 4) break;
        }
        this.relatedProducts.set(unique);
        setTimeout(() => this.animateRelated(), 60);
      },
      error: () => this.relatedProducts.set([]),
    });
  }

  private animateRelated() {
    if (!isPlatformBrowser(this.platformId) || this.prefersReducedMotion) return;
    const cards = Array.from(this.el.nativeElement.querySelectorAll('.related-card')) as HTMLElement[];
    if (!cards.length) return;
    try {
      cards.forEach((c) => (c.style.opacity = '0'));
      animate(cards, { opacity: [0, 1], translateY: [16, 0], delay: stagger(70), duration: 420, ease: 'out(2)' });
    } catch {}
  }

  private scheduleEntrance() {
    if (!isPlatformBrowser(this.platformId) || this.prefersReducedMotion) return;
    requestAnimationFrame(() => this.animateEntrance());
  }

  private animateEntrance() {
    if (this.prefersReducedMotion) return;
    const root = this.el.nativeElement;
    const image = root.querySelector('.image-wrapper') as HTMLElement | null;
    const infoItems = Array.from(root.querySelectorAll('.product-info-col > *')) as HTMLElement[];
    const fichaRows = Array.from(root.querySelectorAll('.ficha-row')) as HTMLElement[];
    try {
      if (image) {
        image.style.opacity = '0';
        animate(image, { opacity: [0, 1], translateX: [-18, 0], scale: [0.985, 1], duration: 520, ease: 'out(3)' });
      }
      if (infoItems.length) {
        infoItems.forEach((el) => (el.style.opacity = '0'));
        animate(infoItems, { opacity: [0, 1], translateY: [14, 0], delay: stagger(45, { start: 80 }), duration: 400, ease: 'out(2)' });
      }
      if (fichaRows.length) {
        fichaRows.forEach((el) => (el.style.opacity = '0'));
        animate(fichaRows, { opacity: [0, 1], translateX: [10, 0], delay: stagger(30, { start: 220 }), duration: 300, ease: 'out(2)' });
      }
    } catch {
      [image, ...infoItems, ...fichaRows].forEach((el) => { if (el) { el.style.opacity = ''; el.style.transform = ''; } });
    }
  }

  private flyToCart() {
    if (!isPlatformBrowser(this.platformId) || this.prefersReducedMotion) return;
    const cart = document.querySelector('.cart-btn') as HTMLElement | null;
    const origin = this.el.nativeElement.querySelector('.product-detail-image') as HTMLElement | null;
    if (!cart || !origin) return;
    const from = origin.getBoundingClientRect();
    const to = cart.getBoundingClientRect();
    if (!from.width || !from.height || !to.width) return;
    const clone = origin.cloneNode(true) as HTMLElement;
    Object.assign(clone.style, { position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, objectFit: 'contain', borderRadius: '12px', zIndex: '4000', pointerEvents: 'none', margin: '0', padding: '0', boxShadow: '0 12px 30px rgba(29,99,193,.28)', background: '#fff' } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(clone);
    const destX = to.left + to.width / 2 - (from.left + from.width / 2);
    const destY = to.top + to.height / 2 - (from.top + from.height / 2);
    try {
      animate(clone, { translateX: destX, translateY: destY, scale: [1, 0.2], opacity: [0.95, 0.25], duration: 750, ease: 'in(3)', onComplete: () => {
        clone.remove();
        try {
          animate(cart, { scale: [1, 1.18, 1], duration: 320, ease: 'out(2)' });
          const badge = cart.querySelector('.cart-count, .badge, [class*="count"]') as HTMLElement | null;
          if (badge) animate(badge, { scale: [1, 1.35, 1], duration: 320, ease: 'out(2)' });
        } catch {}
      }});
    } catch { clone.remove(); }
  }

  onImageTilt(event: MouseEvent) {
    if (!isPlatformBrowser(this.platformId) || this.prefersReducedMotion) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const wrapper = event.currentTarget as HTMLElement;
    const img = wrapper.querySelector('.product-detail-image') as HTMLElement | null;
    if (!img) return;
    if (this.tiltRaf) cancelAnimationFrame(this.tiltRaf);
    this.tiltRaf = requestAnimationFrame(() => {
      const rect = wrapper.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      img.style.transform = `perspective(900px) rotateX(${-y * 10}deg) rotateY(${x * 10}deg) scale(1.03)`;
      img.style.transition = 'transform 60ms linear';
    });
  }

  resetImageTilt(event: MouseEvent) {
    if (!isPlatformBrowser(this.platformId)) return;
    const wrapper = event.currentTarget as HTMLElement;
    const img = wrapper.querySelector('.product-detail-image') as HTMLElement | null;
    if (!img) return;
    if (this.tiltRaf) { cancelAnimationFrame(this.tiltRaf); this.tiltRaf = 0; }
    try { animate(img, { rotateX: 0, rotateY: 0, scale: 1, duration: 420, ease: 'out(3)' }); } catch { img.style.transform = ''; }
    img.style.transition = '';
  }

  increaseQuantity() { this.quantity.update((q) => q + 1); }
  decreaseQuantity() { if (this.quantity() > 1) this.quantity.update((q) => q - 1); }

  calcularDescuento(precioOriginal: number, precioOferta: number): number {
    return Math.round(((precioOriginal - precioOferta) / precioOriginal) * 100);
  }
  getFichaTecnicaKeys(): string[] { return Object.keys(this.product?.fichaTecnica || {}); }
  getFichaTecnicaValue(key: string): string { return this.product?.fichaTecnica?.[key] || ''; }
  getLineaName(): string {
    const p = this.product;
    if (!p?.lineaId) return p?.linea || '';
    return this.lineasService.getLineaById(p.lineaId)?.name || p?.linea || '';
  }
}
