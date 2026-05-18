import { Component, inject, signal, OnInit } from '@angular/core';
import { NotificationService } from '../../shared/data-access/notification.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdersBackend, Order, OrderStatus } from '../../backend/data-access/orders.backend';
import { HttpClient } from '@angular/common/http';

interface DeliveryPerson {
  _id?: string;
  id: string;
  nombre: string;
  telefono?: string;
  activo: boolean;
  fotoDNI?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, CommonModule, FormsModule],
  templateUrl: './pedidos.html',
  styleUrls: ['./pedidos.css'],
})
export default class Pedidos implements OnInit {
  private ordersBackend = inject(OrdersBackend);
  private notificationService = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  
  orders = signal<Order[]>([]);
  private previousOrders = new Map<string, Order>();
  loading = signal(true);
  selectedOrder = signal<Order | null>(null);

  // Modal de ficha técnica del repartidor
  showDeliveryPersonModal = signal(false);
  selectedDeliveryPerson = signal<DeliveryPerson | null>(null);
  deliveryPersonLoading = signal(false);

  statusSteps: { status: OrderStatus; label: string; icon: string }[] = [
    { status: 'pendiente', label: 'Pedido recibido', icon: '📋' },
    { status: 'procesando', label: 'En proceso', icon: '⚙️' },
    { status: 'enviado', label: 'Enviado', icon: '🚚' },
    { status: 'entregado', label: 'Entregado', icon: '✅' },
  ];

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.ordersBackend.getOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        // Check for status changes to show notifications
        orders.forEach(order => {
          const previousOrder = this.previousOrders.get(order.id);
          if (previousOrder && previousOrder.status !== order.status && order.status === 'pendiente') {
            this.notificationService.success(
              'Pedido Confirmado',
              'El pedido #' + order.id + ' ha sido confirmado y est\u00E1 pendiente de procesamiento'
            );
          }
          this.previousOrders.set(order.id, order);
        });
        this.loading.set(false);
        // After loading orders, check if there's a query param to open a specific order
        this.checkQueryParam();
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        this.loading.set(false);
      },
    });
  }

  private checkQueryParam() {
    const orderId = this.route.snapshot.queryParamMap.get('orderId');
    if (orderId) {
      const order = this.orders().find(o => o.id === orderId);
      if (order) {
        this.selectOrder(order);
        // Clear the query param to avoid reopening on refresh
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
      }
    }
  }

  getStatusIndex(status: OrderStatus): number {
    return this.statusSteps.findIndex(s => s.status === status);
  }

   selectOrder(order: Order) {
     this.selectedOrder.set(order);
   }

  closeDetail() {
    this.selectedOrder.set(null);
  }

  getStatusLabel(status: OrderStatus): string {
    const step = this.statusSteps.find(s => s.status === status);
    return step?.label || status;
  }

  getStatusIcon(status: OrderStatus): string {
    const step = this.statusSteps.find(s => s.status === status);
    return step?.icon || '📦';
  }

  openDeliveryPersonModal(deliveryPersonId: string) {
    if (!deliveryPersonId) return;
    this.deliveryPersonLoading.set(true);
    this.http.get<DeliveryPerson>(`/api/delivery/${deliveryPersonId}`).subscribe({
      next: (person) => {
        this.selectedDeliveryPerson.set(person);
        this.showDeliveryPersonModal.set(true);
        this.deliveryPersonLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading delivery person:', err);
        this.deliveryPersonLoading.set(false);
      }
    });
  }

  closeDeliveryPersonModal() {
    this.showDeliveryPersonModal.set(false);
    this.selectedDeliveryPerson.set(null);
  }
}
