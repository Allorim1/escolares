import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../shared/data-access/auth.service';
import { Observable } from 'rxjs';

export interface OrderItem {
  productId: number | string;
  title: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  nombre: string;
  cedula: string;
  telefono: string;
  direccion: string;
  latitud?: number;
  longitud?: number;
  metodoPago: string;
  referencia: string;
  fotoComprobante?: string;
  facturaImage?: string;
  bancoEmisor?: string;
  cedulaTitular?: string;
  correo?: string;
  status: OrderStatus;
  historial: OrderHistorial[];
  autorizadoPor?: string;
  autorizadoNombre?: string;
  deliveryPersonId?: string;
  deliveryPersonName?: string;
  repartidorUbicacion?: {
    lat: number;
    lng: number;
    timestamp: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus = 'confirmar' | 'pendiente' | 'procesando' | 'enviado' | 'entregado' | 'cancelado';

export interface OrderHistorial {
  status: OrderStatus;
  fecha: Date;
  observaciones?: string;
}

export interface CreateOrderData {
  items: OrderItem[];
  total: number;
  nombre: string;
  cedula: string;
  telefono: string;
  direccion: string;
  metodoPago: string;
  referencia: string;
  fotoComprobante?: string;
  bancoEmisor?: string;
  cedulaTitular?: string;
  correo?: string;
  status?: OrderStatus;
  deliveryType?: 'express' | 'programado';
  scheduledFor?: string;
  shippingRef?: number;
  shippingLabel?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrdersBackend {
  private readonly API_URL = '/api/orders';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getOrders(): Observable<Order[]> {
    const user = this.authService.user();
    if (user?.rol === 'repartidor') {
      return this.http.get<Order[]>(`${this.API_URL}?deliveryPersonId=${user.id}`);
    }
    return this.http.get<Order[]>(this.API_URL);
  }

  getOrder(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.API_URL}/${id}`);
  }

  createOrder(orderData: CreateOrderData): Observable<Order> {
    return this.http.post<Order>(this.API_URL, orderData);
  }

  updateOrderStatus(id: string, status: OrderStatus, observaciones?: string): Observable<Order> {
    return this.http.put<Order>(`${this.API_URL}/${id}/status`, { status, observaciones });
  }

  deleteOrder(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
