import { Component, inject } from '@angular/core';
import { ProductsStateService } from '../../data-access/products-state.service';

@Component({
  selector: 'app-product-list',
  imports: [],
  templateUrl: './product-list.html',
  styles: ``,
  providers: [ProductsStateService]
})
export default class ProductList {

  productsState = inject(ProductsStateService)

  changePage(delta: number){
    const current = this.productsState.state.page();
    const next = Math.max(1, current + delta);
    this.productsState.changePage$.next(next);
  }
}
