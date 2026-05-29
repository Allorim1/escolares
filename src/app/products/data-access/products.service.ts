import { Injectable, inject } from "@angular/core";
import { BaseHttpService } from "../../shared/data-access/base-http.service";
import { Observable } from "rxjs";
import { Product } from "../../shared/interfaces/product.interface";

@Injectable({
    providedIn: 'root'
})
export class ProductsService extends BaseHttpService {
  // Fetch all products at once - frontend handles pagination locally
  // to avoid the double-pagination bug where backend pagination
  // conflicts with frontend slicing
  getProducts(): Observable<{ products: Product[], total: number }> {
    return this.http.get<{ products: Product[], total: number }>(`${this.apiUrl}/products`);
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