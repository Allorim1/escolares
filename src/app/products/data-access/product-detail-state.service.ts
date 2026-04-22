import { Injectable, inject, signal } from '@angular/core';
import { Product } from '../../shared/interfaces/product.interface';
import { ProductsService } from './products.service';
import { switchMap } from 'rxjs';

interface State {
  product: Product | null;
  status: 'loading' | 'success' | 'error';
}

@Injectable()
export class ProductDetailSateService {
  private productsService = inject(ProductsService);

  private _state = signal<State>({
    product: null,
    status: 'loading' as const,
  });

  get state() {
    return this._state.asReadonly();
  }

  getById(id: string) {
    this._state.update(s => ({ ...s, status: 'loading' as const }));
    
    this.productsService.getProduct(id).subscribe({
      next: (product) => {
        this._state.set({ product, status: 'success' as const });
      },
      error: () => {
        this._state.update(s => ({ ...s, status: 'error' as const }));
      }
    });
  }

  updateProduct(product: Product) {
    this._state.set({ product, status: 'success' as const });
  }
}