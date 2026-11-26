import { AfterViewInit, Component, ElementRef, PLATFORM_ID, effect, inject, input, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { animate, stagger } from 'animejs';

import { ProductDetailSateService } from '../../data-access/product-detail-state.service';
import { CartStateService } from '../../../shared/data-access/cart-state.service';
import { RouterLink } from '@angular/router';
import { OfertasService } from '../../../shared/data-access/ofertas.service';
import { CurrencyService } from '../../../shared/data-access/currency.service';
import { AuthService } from '../../../shared/data-access/auth.service';
import { ApiKeyStatusService } from '../../../shared/data-access/api-key-status.service';
import { LineasService } from '../../../shared/data-access/lineas.service';
import { RatingsService } from '../../../shared/data-access/ratings.service';
import { ProductRating } from '../../../shared/ui/product-rating/product-rating';

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
  private el = inject(ElementRef<HTMLElement>);
  private platformId = inject(PLATFORM_ID);

  userRating = signal(0);
  private prefersReducedMotion = false;
  private lastAnimatedProductId: string | number | null = null;

  shouldShowPrice(): boolean {
    if (this.authService.isLoggedIn()) return true;
    if (!this.apiKeyStatusService.preciosOcultosParaNoRegistrados()) return true;
    return false;
  }

  formatPrice(priceInUsd: number): string {
    return this.currencyService.formatPrice(priceInUsd);
  }

  id = input.required<string>();
  showAddedMessage = signal(false);
  quantity = signal(1);

  get product() {
    return this.productDetailState().product;
  }

  get isEnOferta(): boolean {
    const product = this.product;
    return product ? this.ofertasService.isEnOferta(product.id) : false;
  }

  get precioOferta(): number | null {
    const product = this.product;
    return product ? this.ofertasService.getOfertaPrice(product.id) : null;
  }

  constructor() {
    effect(() => {
      this.productDetailService.getById(this.id());
    });

    effect(() => {
      const product = this.product;
      if (product && this.authService.isLoggedIn()) {
        this.loadUserRating(product.id);
      }
    });

    effect(() => {
      const state = this.productDetailState();
      const product = state.product;
      if (!product || state.status !== 'success') return;
      if (product.id === this.lastAnimatedProductId) return;
      this.lastAnimatedProductId = product.id;
      this.scheduleEntrance();
    });
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.scheduleEntrance();
    }
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
    if (!image && !infoItems.length) return;
    try {
      if (image) {
        image.style.opacity = '0';
        animate(image, { opacity: [0, 1], translateX: [-18, 0], scale: [0.985, 1], duration: 520, ease: 'out(3)' });
      }
      if (infoItems.length) {
        infoItems.forEach((el) => { el.style.opacity = '0'; });
        animate(infoItems, { opacity: [0, 1], translateY: [14, 0], delay: stagger(55, { start: 80 }), duration: 420, ease: 'out(2)' });
      }
      if (fichaRows.length) {
        fichaRows.forEach((el) => { el.style.opacity = '0'; });
        animate(fichaRows, { opacity: [0, 1], translateX: [10, 0], delay: stagger(35, { start: 260 }), duration: 320, ease: 'out(2)' });
      }
    } catch {
      [image, ...infoItems, ...fichaRows].forEach((el) => { if (el) { el.style.opacity = ''; el.style.transform = ''; } });
    }
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  loadUserRating(productId: string | number) {
    this.ratingsService.getUserRating(productId).subscribe({
      next: (data) => {
        this.userRating.set(data?.rate || 0);
      },
      error: (error) => console.error('Error cargando los detalles del producto:', error),
    });
  }

  submitRating(rate: number) {
    const product = this.product;
    if (!product) return;

    this.ratingsService.submitRating(product.id, rate).subscribe({
      next: (data) => {
        if (data.success) {
          this.userRating.set(rate);
          const currentProduct = this.product;
          if (currentProduct) {
            this.productDetailService.updateProduct({
              ...currentProduct,
              rating: {
                rate: data.newAverage,
                count: data.count,
              },
            });
          }
        }
      },
      error: () => {
        alert('Error al guardar la calificación');
      },
    });
  }

  addToCart() {
    const product = this.product;
    if (!product) {
      return;
    }

    this.flyToCart();
    this.cartState.add({
      product,
      quantity: this.quantity(),
    });

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
    setTimeout(() => {
      this.showAddedMessage.set(false);
      this.quantity.set(1);
    }, 2000);
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
    Object.assign(clone.style, {
      position: 'fixed', left: `${from.left}px`, top: `${from.top}px`,
      width: `${from.width}px`, height: `${from.height}px`,
      objectFit: 'contain', borderRadius: '12px', zIndex: '4000',
      pointerEvents: 'none', margin: '0', padding: '0',
      boxShadow: '0 12px 30px rgba(29,99,193,.28)', background: '#fff',
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(clone);

    const destX = to.left + to.width / 2 - (from.left + from.width / 2);
    const destY = to.top + to.height / 2 - (from.top + from.height / 2);
    try {
      animate(clone, {
        translateX: destX, translateY: destY, scale: [1, 0.2], opacity: [0.95, 0.25],
        duration: 750, ease: 'in(3)',
        onComplete: () => {
          clone.remove();
          try {
            animate(cart, { scale: [1, 1.18, 1], duration: 320, ease: 'out(2)' });
            const badge = cart.querySelector('.cart-count, .badge, [class*="count"]') as HTMLElement | null;
            if (badge) animate(badge, { scale: [1, 1.35, 1], duration: 320, ease: 'out(2)' });
          } catch {}
        },
      });
    } catch { clone.remove(); }
  }

  increaseQuantity() {
    this.quantity.update((q) => q + 1);
  }

  decreaseQuantity() {
    if (this.quantity() > 1) {
      this.quantity.update((q) => q - 1);
    }
  }

  calcularDescuento(precioOriginal: number, precioOferta: number): number {
    const descuento = ((precioOriginal - precioOferta) / precioOriginal) * 100;
    return Math.round(descuento);
  }

  getFichaTecnicaKeys(): string[] {
    const product = this.product;
    if (!product?.fichaTecnica) return [];
    return Object.keys(product.fichaTecnica);
  }

  getFichaTecnicaValue(key: string): string {
    const product = this.product;
    return product?.fichaTecnica?.[key] || '';
  }

  getLineaName(): string {
    const product = this.product;
    if (!product?.lineaId) return '';
    const linea = this.lineasService.getLineaById(product.lineaId);
    return linea?.name || '';
  }
}
