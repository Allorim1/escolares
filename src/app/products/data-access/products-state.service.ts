import { Injectable, inject, computed, signal } from '@angular/core';
import { Product } from '../../shared/interfaces/product.interface';
import { ProductsService } from './products.service';
import { signalSlice } from 'ngxtension/signal-slice';
import { catchError, map, of, Subject } from 'rxjs';

interface State {
    products: Product[];
    status: 'loading' | 'success' | 'error',
    page: number;
}

@Injectable()
export class ProductsStateService {

    private productsService = inject(ProductsService);

    private initialState: State = {
        products: [],
        status: 'loading' as const,
        page: 1,
    }

    private pageSize = 8;
    private allProducts = signal<Product[]>([]);

    // computed signals to drive button disabled state
    hasNext = computed(() => {
        const total = this.allProducts().length;
        return this.state.page() * this.pageSize < total;
    });

    hasPrev = computed(() => this.state.page() > 1);

    changePage$ = new Subject<number>();

    private sliceForPage(page: number) {
        const start = (page - 1) * this.pageSize;
        return this.allProducts().slice(start, start + this.pageSize);
    }

    private loadAll$ = this.productsService.getProducts().pipe(
        map((products) => {
            this.allProducts.set(products);
            return {
                products: this.sliceForPage(1),
                status: 'success' as const
            };
        }),
        catchError(() => of({ products: [], status: 'error' as const }))
    );

    state = signalSlice({
        initialState: this.initialState,
        sources: [
            this.changePage$.pipe(
                map((page) => ({ page, status: 'loading' as const }))
            ),
            this.loadAll$,
            this.changePage$.pipe(
                map((page) => ({
                    products: this.sliceForPage(page),
                    status: 'success' as const
                }))
            )
        ]
    })

}