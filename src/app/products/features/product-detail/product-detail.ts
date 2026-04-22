import { Component, effect, inject, input, signal } from '@angular/core';
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
export default class ProductDetail {
  productDetailState = inject(ProductDetailSateService).state;
  cartState = inject(CartStateService).state;
  private ofertasService = inject(OfertasService);
  currencyService = inject(CurrencyService);
  private authService = inject(AuthService);
  apiKeyStatusService = inject(ApiKeyStatusService);
  private lineasService = inject(LineasService);
  private ratingsService = inject(RatingsService);

  userRating = signal(0);

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
    return product ? this.ofertasService.isEnOferta(product.id as any) : false;
  }

  get precioOferta(): number | null {
    const product = this.product;
    return product ? this.ofertasService.getOfertaPrice(product.id as any) : null;
  }

  constructor() {
    effect(() => {
      this.productDetailState.getById(this.id());
    });
    
    effect(() => {
      const product = this.product;
      if (product && this.authService.isLoggedIn()) {
        this.loadUserRating(product.id as string);
      }
    });
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  loadUserRating(productId: string) {
    this.ratingsService.getUserRating(productId).subscribe({
      next: (data: any) => {
        this.userRating.set(data?.rate || 0);
      },
      error: () => {}
    });
  }

  submitRating(rate: number) {
    const product = this.product;
    if (!product) return;
    
    this.ratingsService.submitRating(product.id as string, rate).subscribe({
      next: (data: any) => {
        if (data.success) {
          this.userRating.set(rate);
          const currentProduct = this.product;
          if (currentProduct) {
            this.productDetailState.updateProduct({
              ...currentProduct,
              rating: {
                rate: data.newAverage,
                count: data.count
              }
            });
          }
        }
      },
      error: () => {
        alert('Error al guardar la calificación');
      }
    });
  }

  addToCart() {
    const product = this.product;
    if (!product) {
      return;
    }

    this.cartState.add({
      product,
      quantity: this.quantity(),
    });

    this.showAddedMessage.set(true);
    setTimeout(() => {
      this.showAddedMessage.set(false);
      this.quantity.set(1);
    }, 2000);
  }

  increaseQuantity() {
    this.quantity.update(q => q + 1);
  }

  decreaseQuantity() {
    if (this.quantity() > 1) {
      this.quantity.update(q => q - 1);
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