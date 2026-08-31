import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

export interface InvProducto {
  _id?: string;
  codigo: string;
  nombre: string;
  descrip?: string;
  costo?: number;
  precio?: number;
  iva?: number;
  stock?: number;
  codgrupo1?: string;
  borrado?: number;
}

@Injectable({ providedIn: 'root' })
export class InvProductosService {
  private readonly API = '/api/inv-productos';
  private productosSubject = new BehaviorSubject<InvProducto[]>([]);
  productos$ = this.productosSubject.asObservable();

  private http = inject(HttpClient);

  search(term: string): void {
    const url = term ? `${this.API}?q=${encodeURIComponent(term)}` : this.API;
    this.http.get<InvProducto[]>(url).subscribe({
      next: (data) => this.productosSubject.next(data || []),
      error: (err) => console.error('Error loading inv productos:', err),
    });
  }

  get productos(): InvProducto[] {
    return this.productosSubject.value;
  }
}
