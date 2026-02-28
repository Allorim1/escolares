import { Component, inject } from '@angular/core';
import { CartItem } from './ui/cart-item/cart-item';
import { CartStateService } from '../shared/data-access/cart-state.service';
import { ProductItemCart } from '../shared/interfaces/product.interface';
import { CurrencyPipe, NgIf, NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';

// references to avoid unused-imports errors (decorator metadata isn't seen by TS)
// use a constant so that the compiler recognizes the symbols are used
const CART_IMPORTS = [CartItem, CurrencyPipe, NgIf, NgFor, RouterLink];

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: CART_IMPORTS,
  templateUrl: './cart.html',
  styles: `
    .cart-container { max-width: 800px; margin: 2rem auto; padding: 1rem; }
    .total { text-align: right; font-weight: bold; margin-top: 1rem; }
    .empty { text-align: center; color: #666; }
    .empty a { color: #007bff; text-decoration: underline; }
  `,
})
export default class CartComponent {
  state = inject(CartStateService).state;

  // provide a simple accessor for total price to avoid template type issues
  price = () => {
    const products = this.state().products;
    return products.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  };

  onRemove(id: number) {
    this.state.remove(id);
  }

  onIncrease(product: ProductItemCart) {
    this.state.udpate({
      product: product.product,
      quantity: product.quantity + 1,
    });
  }

  onDecrease(product: ProductItemCart) {
    this.state.udpate({
      ...product,
      quantity: product.quantity - 1,
    });
  }
}