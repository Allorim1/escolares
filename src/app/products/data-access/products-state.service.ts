import { Injectable, inject, Signal, signal, computed } from '@angular/core';
import { Product } from '../../shared/interfaces/product.interface';
import { ProductsService } from './products.service';
import { signalSlice } from 'ngxtension/signal-slice';
import { catchError, map, of, Subject, startWith, switchMap, tap, Observable } from 'rxjs';

interface State {
     products: Product[],
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

     private pageSize = 28;
     allProducts = signal<Product[]>([]);

     private loadTrigger$ = new Subject<void>();

private loadAll$ = this.loadTrigger$.pipe(
          startWith(void 0),
          switchMap(() => this.productsService.getAllProducts().pipe(
              tap((products) => {
                  if (Array.isArray(products)) {
                      this.allProducts.set(products);
                  } else {
                      this.allProducts.set([]);
                  }
              }),
              map((products) => {
                  const arr = Array.isArray(products) ? products : [];
                  return {
                      products: arr,
                      status: 'success' as const,
                      total: arr.length,
                      totalPages: Math.ceil(arr.length / this.pageSize)
                  };
              }),
              catchError(() => of({ products: [], status: 'error' as const, total: 0, totalPages: 0 }))
          ))
      );

     state = signalSlice({
         initialState: this.initialState,
         sources: [
             this.loadAll$
         ],
         actionSources: {
             changePage: (state, action$: Observable<number>) =>
                 action$.pipe(map((delta) => this.changePageReducer(state, delta))),
             reset: (state, action$: Observable<void>) =>
                 action$.pipe(map(() => this.resetReducer(state))),
         },
     })

     private changePageReducer(state: Signal<State>, delta: number) {
         const current = state().page;
         const next = Math.max(1, current + delta);
         return { ...state(), page: next };
     }

     private resetReducer(state: Signal<State>) {
         return { ...state(), page: 1 };
     }

     hasPrev = computed(() => this.state().page > 1);

     hasNext = computed(() => this.state().page < this.state().totalPages);

     reset() {
         this.state.reset();
     }

     changePage(delta: number) {
         this.state.changePage(delta);
     }

     loadProducts() {
         this.loadTrigger$.next();
     }
}