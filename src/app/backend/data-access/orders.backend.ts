import { Injectable, inject } from '@angular/core';
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

export interface OrderIncident {
  type: 'cliente_ausente' | 'direccion_incorrecta' | 'rechazo' | 'danado' | 'otro';
  reason: string;
  note?: string;
  photo?: string;
  reportedBy?: string;
  reportedAt: Date;
  resolution?: 'reprogramar' | 'devolver' | 'cancelar';
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  subtotal?: number; iva?: number; shippingRef?: number; shippingLabel?: string;
  total: number;
  nombre: string; cedula: string; telefono: string; direccion: string;
  latitud?: number; longitud?: number; direccionCompleta?: string; placeId?: string;
  metodoPago: string; paymentStatus?: 'pendiente'|'pagado'|'contra_entrega'|'fallido';
  paidAt?: Date; amountCollected?: number; changeGiven?: number;
  referencia: string; fotoComprobante?: string; facturaImage?: string; productImage?: string;
  bancoEmisor?: string; cedulaTitular?: string; correo?: string;
  status: OrderStatus;
  historial: OrderHistorial[];
  autorizadoPor?: string; autorizadoNombre?: string;
  deliveryPersonId?: string; deliveryPersonName?: string;
  repartidorUbicacion?: { lat: number; lng: number; timestamp: Date };
  stockRestored?: boolean; stockRestoredAt?: Date; idempotencyKey?: string;
  deliveryType?: 'express'|'programado'; scheduledFor?: string;
  confirmedAt?: Date; assignedAt?: Date; acceptedAt?: Date; dispatchedAt?: Date; deliveredAt?: Date; cancelledAt?: Date;
  cancelReason?: string; incident?: OrderIncident;
  createdAt: Date; updatedAt: Date; mensajes?: OrderMessage[];
}

export interface OrderMessage {
  _id?: string;
  orderId: string;
  emisorId: string;
  emisorNombre: string;
  emisorRol: string;
  mensaje: string;
  leido: boolean;
  fecha: Date;
}

export type OrderStatus =
  | 'confirmar'
  | 'pendiente'
  | 'procesando'
  | 'procesado'
  | 'enviado'
  | 'entregado'
  | 'cancelado'
  | 'incidencia';

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
  paymentStatus?: 'pendiente'|'pagado'|'contra_entrega'|'fallido';
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
  direccionCompleta?: string;
  placeId?: string;
  latitud?: number;
  longitud?: number;
  idempotencyKey?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrdersBackend {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private readonly API_URL = '/api/orders';

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

  updateOrderStatus(id: string, status: OrderStatus, observaciones?: string, extra?: any): Observable<Order> {
    return this.http.put<Order>(`${this.API_URL}/${id}/status`, { status, observaciones, ...(extra || {}) });
  }

  reportIncident(id: string, data: { type: string; reason: string; note?: string; photo?: string; resolution?: string }): Observable<Order> {
    return this.http.put<Order>(`${this.API_URL}/${id}/incident`, data);
  }

  deleteOrder(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }

  cancelOrderAuthorized(id: string, motivo: string, claveSupervisor: string): Observable<Order> {
    return this.http.put<Order>(`${this.API_URL}/${id}/cancel-authorize`, { motivo, claveSupervisor });
  }

  assignDelivery(id: string, deliveryPersonId: string, deliveryPersonName: string): Observable<Order> {
    return this.http.put<Order>(`${this.API_URL}/${id}/assign-delivery`, { deliveryPersonId, deliveryPersonName });
  }

  uploadFactura(id: string, facturaImage: string): Observable<Order> {
    return this.http.put<Order>(`${this.API_URL}/${id}/factura`, { facturaImage });
  }

  acceptOrder(id: string): Observable<Order> {
    return this.http.put<Order>(`${this.API_URL}/${id}/accept`, {});
  }

  rejectOrder(id: string, motivo?: string): Observable<Order> {
    return this.http.put<Order>(`${this.API_URL}/${id}/reject`, { motivo: motivo || '' });
  }

  getAssignedDeliveryOrders(status?: string): Observable<Order[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.http.get<Order[]>(`${this.API_URL}/delivery/assigned${q}`);
  }

  getAvailableDeliveryOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.API_URL}/delivery/available`);
  }
}
