import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  metodoPago: string;
  referencia: string;
  status: OrderStatus;
  historial: OrderHistorial[];
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
  status?: OrderStatus;
}

@Injectable({
  providedIn: 'root',
})
export class OrdersBackend {
  private readonly API_URL = '/api/orders';

  constructor(private http: HttpClient) {}

  getOrders(): Observable<Order[]> {
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
