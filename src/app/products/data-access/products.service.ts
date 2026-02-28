import { Injectable, inject } from "@angular/core";
import { BaseHttpService } from "../../shared/data-access/base-http.service";
import { Observable } from "rxjs";
import { Product } from "../../shared/interfaces/product.interface";

// the fake store API doesn't really support paging – it only accepts a
// `limit` parameter that always returns the first N items.  To make
// pagination behave predictably we pull the entire list once and let the
// caller slice it locally.  This keeps the component/service logic simple
// and avoids repeated network requests for partial data.

@Injectable({
    providedIn: 'root'
})
export class ProductsService extends BaseHttpService {
  getProducts(): Observable<Product[]> {
    // fetch all records; no params needed
    return this.http.get<any[]>(`${this.apiUrl}/products`);
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/products/${id}`);
  }
} 