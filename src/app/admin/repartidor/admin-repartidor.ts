import { Component, OnInit, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderTrackingMapComponent } from '../../repartidor/order-tracking-map/order-tracking-map';
import { AuthService } from '../../shared/data-access/auth.service';

interface DeliveryPerson {
  id: string;
  nombre: string;
  telefono?: string;
  activo: boolean;
  userId?: string;
  fotoDNI?: string;
}

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
  status: 'confirmar' | 'pendiente' | 'procesando' | 'procesado' | 'enviado' | 'entregado' | 'cancelado';
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
  selector: 'app-admin-repartidor',
  standalone: true,
  imports: [CommonModule, FormsModule, OrderTrackingMapComponent],
  templateUrl: './admin-repartidor.html',
  styleUrls: ['./admin-repartidor.css']
})
export class AdminRepartidorComponent implements OnInit {
   orders = signal<Order[]>([]);
    loading = signal(true);
    selectedStatus = signal<Order['status'] | ''>('');
    selectedOrderMap = signal<string>('');
    currentOrder = signal<Order | null>(null);
    watchId: number | null = null;
    deliveryPersonId: string | null = null;

   private authService = inject(AuthService);

   constructor(private http: HttpClient) {}

 ngOnInit() {
    const user = this.authService.user();
    const currentUserId = user?.id;

    // Use deliveryPersonId from user if available (set during login/registration)
    if (user?.deliveryPersonId) {
      this.deliveryPersonId = user.deliveryPersonId;
      this.loadOrders();
      this.watchLocation();
      return;
    }

    // Fallback: Fetch delivery person by userId
    const token = localStorage.getItem('accessToken');
    const headers = token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : undefined;

    this.http.get<DeliveryPerson>(`/api/delivery/by-user/${currentUserId}`).subscribe({
          next: (person) => {
            this.deliveryPersonId = person.id;
            this.loadOrders();
            this.watchLocation();
          },
          error: (err) => {
            console.error('Error loading delivery person:', err);
            this.loadOrders(); // Still try to load orders even if delivery person lookup fails
          }
        });
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
      if (!this.deliveryPersonId) return;

      const token = localStorage.getItem('accessToken');
      const headers = token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : undefined;

      this.http.put(`/api/delivery/${this.deliveryPersonId}/location`, { lat, lng }, { headers }).subscribe({
        error: (err) => console.error('Error updating location:', err)
      });
    }

    loadOrders() {
      this.loading.set(true);
      const token = localStorage.getItem('accessToken');
      const headers = token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : undefined;
      
      this.http.get<Order[]>('/api/orders/delivery/assigned', { headers }).subscribe({
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
    if (!confirm(`¿Cambiar estado a "${this.getStatusText(newStatus)}"?`)) return;

    const token = localStorage.getItem('accessToken');
    const headers = token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : undefined;

    this.http.put(`/api/orders/${order.id}/status`, { status: newStatus }, { headers }).subscribe({
      next: () => {
        this.loadOrders();
      },
      error: (err) => {
        console.error('Error actualizando estado:', err);
        alert('Error al actualizar estado');
      }
    });
  }

  showMap(order: Order) {
    this.selectedOrderMap.set(order.id);
    this.currentOrder.set(order);
  }

  acceptOrder(order: Order) {
    if (!confirm(`¿Aceptar el pedido #${order.id}?`)) return;

    const token = localStorage.getItem('accessToken');
    const headers = token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : undefined;

    this.http.put(`/api/orders/${order.id}/accept`, {}, { headers }).subscribe({
      next: () => {
        this.loadOrders();
      },
      error: (err) => {
        console.error('Error aceptando pedido:', err);
        alert('Error al aceptar el pedido');
      }
    });
  }

  rejectOrder(order: Order) {
    const motivo = prompt('¿Cuál es el motivo del rechazo? (Opcional)');
    if (!confirm(`¿Rechazar el pedido #${order.id}?${motivo ? `\nMotivo: ${motivo}` : ''}`)) return;

    const token = localStorage.getItem('accessToken');
    const headers = token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : undefined;

    const body = motivo ? { motivo } : {};

    this.http.put(`/api/orders/${order.id}/reject`, body, { headers }).subscribe({
      next: () => {
        this.loadOrders();
      },
      error: (err) => {
        console.error('Error rechazando pedido:', err);
        alert('Error al rechazar el pedido');
      }
    });
  }

  startOrder(order: Order) {
    if (!confirm(`¿Iniciar entrega del pedido #${order.id}?`)) return;
    this.updateOrderStatus(order, 'enviado');
  }

  onOrderStarted(orderId: string) {
    const order = this.orders().find(o => o.id === orderId);
    if (order) {
      this.startOrder(order);
    }
    this.selectedOrderMap.set('');
  }

  filterOrders() {
    const status = this.selectedStatus();
    const token = localStorage.getItem('accessToken');
    const headers = token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : undefined;

    if (!status) return this.loadOrders();
    this.http.get<Order[]>(`/api/orders/delivery/assigned?status=${status}`, { headers }).subscribe({
      next: (data) => this.orders.set(data),
      error: (err) => console.error('Error filtrando pedidos:', err)
    });
  }

  getStatusColor(status: Order['status']): string {
    const colors: Record<Order['status'], string> = {
      confirmar: 'warning',
      pendiente: 'info',
      procesando: 'primary',
      procesado: 'primary',
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
      procesado: 'Aceptado',
      enviado: 'En camino',
      entregado: 'Entregado',
      cancelado: 'Cancelado'
    };
    return texts[status] || status;
  }
}