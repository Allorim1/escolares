import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrdersBackend, Order, OrderStatus } from '../../backend/data-access/orders.backend';
import { CartStateService } from '../../shared/data-access/cart-state.service';
import { NotificationService } from '../../shared/data-access/notification.service';

@Component({
  selector: 'app-historico-compra',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './historico-compra.html',
  styleUrls: ['./historico-compra.css'],
})
export class HistoricoCompra implements OnInit {
  private ordersBackend = inject(OrdersBackend);
  private cartState = inject(CartStateService);
  private notificationService = inject(NotificationService);

  orders = signal<Order[]>([]);
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
      next: (response: any) => {
        let orders: Order[] = [];
        // Handle array response or object with orders/data property
        if (Array.isArray(response)) {
          orders = response;
        } else if (response && typeof response === 'object') {
          if (Array.isArray(response.orders)) {
            orders = response.orders;
          } else if (Array.isArray(response.data)) {
            orders = response.data;
          }
        }
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        this.orders.set([]);
        this.loading.set(false);
        this.notificationService.error('Error', 'No se pudieron cargar los pedidos');
      },
    });
  }

  selectOrder(order: Order) {
    this.selectedOrder.set(order);
  }

  closeDetail() {
    this.selectedOrder.set(null);
  }

  getStatusIndex(status: OrderStatus): number {
    return this.statusSteps.findIndex(s => s.status === status);
  }

  getStatusLabel(status: OrderStatus): string {
    const step = this.statusSteps.find(s => s.status === status);
    return step?.label || status;
  }

  getStatusIcon(status: OrderStatus): string {
    const step = this.statusSteps.find(s => s.status === status);
    return step?.icon || '📦';
  }

  repeatOrder(event: MouseEvent, order: Order) {
    event.stopPropagation();
    const items = order.items || [];
    if (!Array.isArray(items) || items.length === 0) return;

    items.forEach(item => {
      this.cartState.state.add({
        product: {
          id: item.productId,
          title: item.title,
          price: item.price,
          image: item.image,
          category: '',
          description: '',
          rating: { rate: 0, count: 0 },
        },
        quantity: item.quantity,
      });
    });

    this.notificationService.success(
      'Pedido repetido',
      'Los productos han sido agregados a tu carrito'
    );
  }
}