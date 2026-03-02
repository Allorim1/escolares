import { Component, inject } from '@angular/core';
import { CartItem } from './ui/cart-item/cart-item';
import { CartStateService } from '../shared/data-access/cart-state.service';
import { ProductItemCart } from '../shared/interfaces/product.interface';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

const CART_IMPORTS = [CartItem, CurrencyPipe, RouterLink];

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: CART_IMPORTS,
  templateUrl: './cart.html',
  styleUrl: './cart.css',
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
