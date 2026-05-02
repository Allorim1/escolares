import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  metodoPago: string;
  referencia: string;
  fotoComprobante?: string;
  facturaImage?: string;
  status: 'confirmar' | 'pendiente' | 'procesando' | 'enviado' | 'entregado' | 'cancelado';
  historial: any[];
  autorizadoPor?: string;
  autorizadoNombre?: string;
  deliveryPersonId?: string;
  deliveryPersonName?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-repartidor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './repartidor.html',
  styleUrls: ['./repartidor.css']
})
export class RepartidorComponent implements OnInit {
  orders = signal<Order[]>([]);
  loading = signal(true);
  selectedStatus = signal<Order['status'] | ''>('');

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.loading.set(true);
    // Endpoint que devuelve los pedidos asignados al repartidor actual
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
