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
  estado?: string;
  unidades?: number;
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

export interface DashboardKpis {
  totalProducts: number;
  totalUsers: number;
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  deliveredOrders: number;
  incidentOrders: number;
  unassignedOrders: number;
  deliveredToday: number;
  ordersLast7Days: number;
  outOfStock: number;
  lowStock: number;
  totalViews: number;
  totalPurchases: number;
  conversionRate: number;
}

export interface DashboardAttention {
  type: string;
  severity: 'high' | 'medium' | 'low';
  label: string;
  count: number;
  route: string;
  description: string;
}

export interface DashboardRecentOrder {
  id: string;
  nombre: string;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  deliveryPersonName?: string;
  itemsCount: number;
}

export interface AdminDashboardData {
  generatedAt: string;
  kpis: DashboardKpis;
  attention: DashboardAttention[];
  recentOrders: DashboardRecentOrder[];
  topByPurchases: ProductoRanking[];
}

@Injectable({ providedIn: 'root' })
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

  getDashboard() {
    return this.http.get<AdminDashboardData>(`${this.API}/dashboard`).pipe(
      catchError((err) => {
        console.error('Error cargando dashboard:', err);
        return of(null);
      }),
    );
  }
}
