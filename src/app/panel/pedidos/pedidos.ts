import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { CartStateService } from '../../shared/data-access/cart-state.service';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [NgIf],
  templateUrl: './pedidos.html',
  styleUrls: ['./pedidos.css'],
})
export default class Pedidos {
  cartState = inject(CartStateService).state;
}
