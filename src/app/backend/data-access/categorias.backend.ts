import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CategoriaItem {
  label: string;
  route: string;
  permiso?: string;
}

export interface CategoriaMenu {
  _id?: string;
  id: string;
  nombre: string;
  expanded: boolean;
  orden: number;
  items: CategoriaItem[];
}

@Injectable({
  providedIn: 'root',
})
export class CategoriasBackend {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api/categorias';

  getAll(): Observable<CategoriaMenu[]> {
    return this.http.get<CategoriaMenu[]>(this.API_URL);
  }

  create(categoria: Partial<CategoriaMenu>): Observable<CategoriaMenu> {
    return this.http.post<CategoriaMenu>(this.API_URL, categoria);
  }

  update(id: string, categoria: Partial<CategoriaMenu>): Observable<CategoriaMenu> {
    return this.http.put<CategoriaMenu>(`${this.API_URL}/${id}`, categoria);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`);
  }

  addItem(categoriaId: string, item: CategoriaItem): Observable<CategoriaMenu> {
    return this.http.post<CategoriaMenu>(`${this.API_URL}/${categoriaId}/items`, item);
  }

  removeItem(categoriaId: string, itemIndex: number): Observable<CategoriaMenu> {
    return this.http.delete<CategoriaMenu>(`${this.API_URL}/${categoriaId}/items/${itemIndex}`);
  }
}