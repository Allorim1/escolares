import { Injectable } from "@angular/core";
import { BaseHttpService } from "../../shared/data-access/base-http.service";
import { map, Observable } from "rxjs";
import { Product } from "../../shared/interfaces/product.interface";
import { shareReplay } from "rxjs/operators";

@Injectable({
     providedIn: 'root'
 })
 export class ProductsService extends BaseHttpService {
   private productsCache$: Observable<Product[]> | null = null;

   getProducts(page: string = '1', limit: string = '50'): Observable<any> {
     return this.http.get<any>(`${this.apiUrl}/products`, {
       params: { page, limit }
     });
   }

   getAllProducts(): Observable<Product[]> {
      if (!this.productsCache$) {
        this.productsCache$ = this.http.get<{ products: Product[] }>(`${this.apiUrl}/products?all=true`).pipe(
          map((response) => response.products),
          shareReplay({ bufferSize: 1, refCount: true })
        );
      }
      return this.productsCache$;
    }

   clearProductsCache(): void {
     this.productsCache$ = null;
   }

   searchProducts(search: string): Observable<any> {
     return this.http.get<any>(`${this.apiUrl}/products`, {
       params: { search }
     });
   }

   getProduct(id: string): Observable<Product> {
     return this.http.get<Product>(`${this.apiUrl}/products/${id}`);
   }
 } 