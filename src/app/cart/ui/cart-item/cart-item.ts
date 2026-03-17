import { Component, input, output } from '@angular/core';
import { ProductItemCart } from '../../../shared/interfaces/product.interface';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-cart-item',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './cart-item.html',
  styleUrls: ['./cart-item.css'],
})
export class CartItem {
  productCartItem = input.required<ProductItemCart>();

  onRemove = output<number | string>();

  onIncrease = output<ProductItemCart>();

  onDecrease = output<ProductItemCart>();
}