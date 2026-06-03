import { Injectable, inject, computed, signal } from '@angular/core';
import { Product } from '../../shared/interfaces/product.interface';
import { ProductsService } from './products.service';
import { signalSlice } from 'ngxtension/signal-slice';
import { catchError, map, of, Subject, startWith, switchMap, tap } from 'rxjs';

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
             tap((products) => this.allProducts.set(products)),
             map((products) => ({
                 products: products,
                 status: 'success' as const,
                 total: products.length,
                 totalPages: Math.ceil(products.length / this.pageSize)
             })),
             catchError(() => of({ products: [], status: 'error' as const, total: 0, totalPages: 0 }))
         ))
     );

     state = signalSlice({
         initialState: this.initialState,
         sources: [
             this.loadAll$
         ]
     })

     // computed signals to drive button disabled state
     hasNext = computed(() => {
       return this.state().page < this.state().totalPages;
     });

     hasPrev = computed(() => this.state().page > 1);

     loadProducts() {
         this.loadTrigger$.next();
     }

     changePage(delta: number) {
         const current = this.state().page;
         const next = Math.max(1, current + delta);
         this.state.setKey('page', next);
     }

     reset() {
         this.state.setKey('page', 1);
     }
 }
