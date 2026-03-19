import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface OrderItem {
  productId: number | string;
  title: string;
  price: number;
  quantity: number;
  image: string;
}

interface OrderHistorial {
  status: string;
  fecha: Date;
  observaciones?: string;
}

interface Order {
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
  fotoComprobante: string | null | undefined;
  status: string;
  historial: OrderHistorial[];
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-admin-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-pedidos.html',
  styleUrl: './admin-pedidos.css',
})
export class AdminPedidos implements OnInit {
  private http = inject(HttpClient);

  orders = signal<Order[]>([]);
  loading = signal(true);
  selectedOrder = signal<Order | null>(null);
  filterStatus = signal('todos');
  searchTerm = signal('');
  imageModalOpen = signal(false);
  modalImageUrl = signal('');

  statusOptions = [
    { value: 'todos', label: 'Todos' },
    { value: 'confirmar', label: 'Por confirmar' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'procesando', label: 'Procesando' },
    { value: 'enviado', label: 'Enviado' },
    { value: 'entregado', label: 'Entregado' },
    { value: 'cancelado', label: 'Cancelado' },
  ];

  statusColors: Record<string, string> = {
    confirmar: '#ffc107',
    pendiente: '#17a2b8',
    procesando: '#6f42c1',
    enviado: '#007bff',
    entrega: '#28a745',
    cancelado: '#dc3545',
  };

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.loading.set(true);
    this.http.get<Order[]>('/api/orders/admin/all').subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        this.loading.set(false);
      },
    });
  }

  get filteredOrders(): Order[] {
    let result = this.orders();
    
    if (this.filterStatus() !== 'todos') {
      result = result.filter(o => o.status === this.filterStatus());
    }
    
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      result = result.filter(o => 
        o.nombre?.toLowerCase().includes(term) ||
        o.cedula?.toLowerCase().includes(term) ||
        o.telefono?.toLowerCase().includes(term) ||
        o.id.toLowerCase().includes(term)
      );
    }
    
    return result;
  }

  selectOrder(order: Order) {
    this.selectedOrder.set(order);
  }

  closeDetail() {
    this.selectedOrder.set(null);
  }

  updateStatus(orderId: string, newStatus: string) {
    this.http.put(`/api/orders/${orderId}/status`, { 
      status: newStatus,
      observaciones: ''
    }).subscribe({
      next: () => {
        this.loadOrders();
        if (this.selectedOrder()?.id === orderId) {
          const updated = this.orders().find(o => o.id === orderId);
          if (updated) this.selectedOrder.set(updated);
        }
        alert('Estado actualizado');
      },
      error: (err) => {
        console.error('Error updating status:', err);
        alert('Error al actualizar estado');
      }
    });
  }

  getStatusLabel(status: string): string {
    const opt = this.statusOptions.find(o => o.value === status);
    return opt?.label || status;
  }

  hasComprobante(order: Order): boolean {
    return !!(order as any).fotoComprobante;
  }

  getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      'zelle': 'Zelle',
      'efectivo': 'Efectivo',
      'transferencia': 'Transferencia',
      'pago_movil': 'Pago Móvil',
    };
    return labels[method] || method;
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getOrderCountByStatus(status: string): number {
    if (status === 'todos') return this.orders().length;
    return this.orders().filter(o => o.status === status).length;
  }

  openImageModal(url: string) {
    this.modalImageUrl.set(url);
    this.imageModalOpen.set(true);
  }

  closeImageModal() {
    this.imageModalOpen.set(false);
    this.modalImageUrl.set('');
  }
}
