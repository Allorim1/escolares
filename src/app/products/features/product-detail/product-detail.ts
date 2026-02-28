import { Component, effect, inject, input } from '@angular/core';
import { ProductDetailSateService } from '../../data-access/product-detail-state.service';
import { CurrencyPipe } from '@angular/common';
import { CartStateService } from '../../../shared/data-access/cart-state.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './product-detail.html',
  styleUrls: ['./product-detail.css'],
  providers: [ProductDetailSateService],
})
export default class ProductDetail {
  productDetailState = inject(ProductDetailSateService).state;
  cartState = inject(CartStateService).state;

  id = input.required<string>();

  constructor() {
    effect(() => {
      this.productDetailState.getById(this.id());
    });
  }

  addToCart() {
    const product = this.productDetailState.product();
    if (!product) {
      // nothing to add yet
      return;
    }

    this.cartState.add({
      product,
      quantity: 1,
    });
  }
}