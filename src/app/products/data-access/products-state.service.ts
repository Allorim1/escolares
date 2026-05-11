import { Injectable, inject, computed, signal } from '@angular/core';
import { Product } from '../../shared/interfaces/product.interface';
import { ProductsService } from './products.service';
import { signalSlice } from 'ngxtension/signal-slice';
import { catchError, map, of, Subject, startWith, switchMap, tap } from 'rxjs';

interface State {
     products: Product[];
     status: 'loading' | 'success' | 'error',
     page: number,
     total: number,
     totalPages: number
 }

@Injectable()
export class ProductsStateService {

    private productsService = inject(ProductsService);

    private initialState: State = {
        products: [],
        status: 'loading' as const,
        page: 1,
        total: 0,
        totalPages: 0
    }

    private pageSize = 8;
    allProducts = signal<Product[]>([]);

    // computed signals to drive button disabled state
    hasNext = computed(() => {
      const state = this.state();
      return state.page() < state.totalPages();
    });

    hasPrev = computed(() => this.state().page() > 1);

    changePage$ = new Subject<number>();

    private loadAll$ = this.changePage$.pipe(
      startWith(1),
      switchMap(() => this.productsService.getProducts()),
      map((response: any) => {
        const products: Product[] = response.products || response;
        const total = products.length;
        this.allProducts.set(products);
        return {
          products,
          status: 'success' as const,
          total,
          totalPages: Math.ceil(total / this.pageSize)
        };
      }),
      catchError(() => of({ products: [], status: 'error' as const, total: 0, totalPages: 0 }))
    );

    state = signalSlice({
        initialState: this.initialState,
        sources: [
            this.changePage$.pipe(
                map((page) => ({ page, status: 'loading' as const }))
            ),
            this.loadAll$
        ]
    })

}
