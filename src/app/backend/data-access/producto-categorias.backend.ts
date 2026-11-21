import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../../shared/interfaces/product.interface';

export interface ProductoCategoria {
  _id?: string;
  id: string;
  nombre: string;
  descripcion?: string;
  imagen?: string;
  orden: number;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProductoCategoriasBackend {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api/producto-categorias';

  getAll(): Observable<ProductoCategoria[]> {
    return this.http.get<ProductoCategoria[]>(this.API_URL);
  }

  getProductsByCategory(nombreCategoria: string): Observable<ProductsResponse> {
    return this.http.get<ProductsResponse>(`/api/products?all=true&category=${encodeURIComponent(nombreCategoria)}`);
  }

  create(categoria: Partial<ProductoCategoria>): Observable<ProductoCategoria> {
    return this.http.post<ProductoCategoria>(this.API_URL, categoria);
  }

  update(id: string, categoria: Partial<ProductoCategoria>): Observable<ProductoCategoria> {
    return this.http.put<ProductoCategoria>(`${this.API_URL}/${id}`, categoria);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
