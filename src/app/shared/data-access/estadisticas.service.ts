import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

export interface ProductoRanking {
  id: number | string;
  title: string;
  image: string;
  price: number;
  views: number;
  purchases: number;
}

export interface EstadisticasResumen {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalViews: number;
  totalPurchases: number;
  conversionRate: string;
  topByViews: ProductoRanking[];
  topByPurchases: ProductoRanking[];
}

@Injectable({
  providedIn: 'root',
})
export class EstadisticasService {
  private readonly API = '/api/estadisticas';
  private http = inject(HttpClient);

  getResumen() {
    return this.http.get<EstadisticasResumen>(`${this.API}/resumen`).pipe(
      catchError((err) => {
        console.error('Error cargando resumen estadísticas:', err);
        return of(null);
      }),
    );
  }

  getTopProductos() {
    return this.http.get<ProductoRanking[]>(`${this.API}/productos/top`).pipe(
      catchError((err) => {
        console.error('Error cargando top productos:', err);
        return of([]);
      }),
    );
  }
}
