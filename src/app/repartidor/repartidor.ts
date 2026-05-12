import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderTrackingMapComponent } from './order-tracking-map/order-tracking-map';

interface Order {
  _id?: string;
  id: string;
  userId: string;
  items: any[];
  total: number;
  nombre: string;
  cedula: string;
  telefono: string;
  direccion: string;
  direccionCompleta?: string;
  latitud?: number;
  longitud?: number;
  metodoPago: string;
  referencia: string;
  fotoComprobante?: string;
  facturaImage?: string;
  bancoEmisor?: string;
  cedulaTitular?: string;
  correo?: string;
  status: 'confirmar' | 'pendiente' | 'procesando' | 'enviado' | 'entregado' | 'cancelado';
  historial: any[];
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

@Component({
  selector: 'app-repartidor',
  standalone: true,
  imports: [CommonModule, FormsModule, OrderTrackingMapComponent],
  templateUrl: './repartidor.html',
  styleUrls: ['./repartidor.css']
})
export class RepartidorComponent implements OnInit {
  orders = signal<Order[]>([]);
  loading = signal(true);
  selectedStatus = signal<Order['status'] | ''>('');
  selectedOrderMap = signal<string>('');
  watchId: number | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadOrders();
    this.watchLocation();
  }

  ngOnDestroy() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
    }
  }

  watchLocation() {
    if (!navigator.geolocation) return;
    
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.updateMyLocation(latitude, longitude);
      },
      (error) => console.error('Geolocation error:', error),
      { enableHighAccuracy: true, maximumAge: 30000 }
    );
  }

  updateMyLocation(lat: number, lng: number) {
    const repartidorId = localStorage.getItem('userId');
    if (!repartidorId) return;

    this.http.put(`/api/delivery/${repartidorId}/location`, { lat, lng }).subscribe({
      error: (err) => console.error('Error updating location:', err)
    });
  }

  loadOrders() {
    this.loading.set(true);
    this.http.get<Order[]>('/api/orders/delivery/assigned').subscribe({
      next: (data) => {
        this.orders.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando pedidos:', err);
        this.loading.set(false);
      }
    });
  }

  updateOrderStatus(order: Order, newStatus: Order['status']) {
    if (!confirm(`¿Cambiar estado a "${newStatus}"?`)) return;
    this.http.put(`/api/orders/${order._id}/status`, { status: newStatus }).subscribe({
      next: () => {
        this.loadOrders();
      },
      error: (err) => {
        console.error('Error actualizando estado:', err);
        alert('Error al actualizar estado');
      }
    });
  }

  showMap(orderId: string) {
    this.selectedOrderMap.set(orderId);
  }

  filterOrders() {
    const status = this.selectedStatus();
    if (!status) return this.loadOrders();
    this.http.get<Order[]>(`/api/orders/delivery/assigned?status=${status}`).subscribe({
      next: (data) => this.orders.set(data),
      error: (err) => console.error('Error filtrando pedidos:', err)
    });
  }

  getStatusColor(status: Order['status']): string {
    const colors: Record<Order['status'], string> = {
      confirmar: 'warning',
      pendiente: 'info',
      procesando: 'primary',
      enviado: 'success',
      entregado: 'success',
      cancelado: 'danger'
    };
    return colors[status] || 'secondary';
  }

  getStatusText(status: Order['status']): string {
    const texts: Record<Order['status'], string> = {
      confirmar: 'Confirmar',
      pendiente: 'Pendiente',
      procesando: 'Procesando',
      enviado: 'Enviado',
      entregado: 'Entregado',
      cancelado: 'Cancelado'
    };
    return texts[status] || status;
  }
}
