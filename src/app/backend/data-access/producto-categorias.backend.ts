import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProductoCategoria {
  _id?: string;
  id: string;
  nombre: string;
  descripcion?: string;
  imagen?: string;
  orden: number;
}

export interface ProductsResponse {
  products: any[];
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

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`);
  }
}
