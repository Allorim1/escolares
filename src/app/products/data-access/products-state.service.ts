import { Injectable, inject, computed, signal } from '@angular/core';
import { Product } from '../../shared/interfaces/product.interface';
import { ProductsService } from './products.service';
import { signalSlice } from 'ngxtension/signal-slice';
import { catchError, map, of, Subject, startWith, switchMap } from 'rxjs';

interface State {
     products: Product[];
     status: 'loading' | 'success' | 'error',
     page: number,
     total: number,
     totalPages: number
 }

@Injectable({
    providedIn: 'root',
})
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

    changePage$ = new Subject<number>();

private loadAll$ = this.changePage$.pipe(
       startWith(1),
       switchMap(() => this.productsService.getProducts()),
       map((response: any) => {
         // Handle both {products: [...], total: number} and {products: [...], pagination: {...}} formats
         const products: Product[] = Array.isArray(response) 
           ? response 
           : (Array.isArray(response?.products) ? response.products : []);
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

    // computed signals to drive button disabled state
    hasNext = computed(() => {
      return this.state().page < this.state().totalPages;
    });

    hasPrev = computed(() => this.state().page > 1);

}
