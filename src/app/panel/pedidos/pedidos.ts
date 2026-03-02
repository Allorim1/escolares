import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartStateService } from '../../shared/data-access/cart-state.service';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './pedidos.html',
  styleUrls: ['./pedidos.css'],
})
export default class Pedidos {
  cartState = inject(CartStateService).state;

  getTotal() {
    return this.cartState().products.reduce(
      (acc, item) => acc + item.product.price * item.quantity,
      0,
    );
  }
}
