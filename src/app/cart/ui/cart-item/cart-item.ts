import { Component, input, output, inject } from '@angular/core';
import { ProductItemCart } from '../../../shared/interfaces/product.interface';
import { CurrencyPipe } from '@angular/common';
import { CurrencyService } from '../../../shared/data-access/currency.service';

@Component({
  selector: 'app-cart-item',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './cart-item.html',
  styleUrls: ['./cart-item.css'],
})
export class CartItem {
  currencyService = inject(CurrencyService);
  
  productCartItem = input.required<ProductItemCart>();

  onRemove = output<number | string>();

  onIncrease = output<ProductItemCart>();

  onDecrease = output<ProductItemCart>();

  // Format price based on current currency display
  formatPrice(priceInUsd: number): string {
    return this.currencyService.formatPrice(priceInUsd);
  }
}