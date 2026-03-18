import { Component, effect, inject, input, signal } from '@angular/core';
import { ProductDetailSateService } from '../../data-access/product-detail-state.service';
import { CurrencyPipe, NgIf } from '@angular/common';
import { CartStateService } from '../../../shared/data-access/cart-state.service';
import { RouterLink } from '@angular/router';
import { OfertasService } from '../../../shared/data-access/ofertas.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, NgIf],
  templateUrl: './product-detail.html',
  styleUrls: ['./product-detail.css'],
  providers: [ProductDetailSateService],
})
export default class ProductDetail {
  productDetailState = inject(ProductDetailSateService).state;
  cartState = inject(CartStateService).state;
  private ofertasService = inject(OfertasService);

  id = input.required<string>();
  showAddedMessage = signal(false);
  quantity = signal(1);

  get isEnOferta(): boolean {
    const product = this.productDetailState.product();
    return product ? this.ofertasService.isEnOferta(product.id as any) : false;
  }

  get precioOferta(): number | null {
    const product = this.productDetailState.product();
    return product ? this.ofertasService.getOfertaPrice(product.id as any) : null;
  }

  constructor() {
    effect(() => {
      this.productDetailState.getById(this.id());
    });
  }

  addToCart() {
    const product = this.productDetailState.product();
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
}
