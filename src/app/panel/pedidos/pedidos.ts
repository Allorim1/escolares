import { Component, inject, signal, OnInit } from '@angular/core';
import { NotificationService } from '../../shared/data-access/notification.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { OrdersBackend, Order, OrderStatus } from '../../backend/data-access/orders.backend';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './pedidos.html',
  styleUrls: ['./pedidos.css'],
})
export default class Pedidos implements OnInit {
  private ordersBackend = inject(OrdersBackend);
  private notificationService = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
  orders = signal<Order[]>([]);
  private previousOrders = new Map<string, Order>();
  loading = signal(true);
  selectedOrder = signal<Order | null>(null);

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
}
