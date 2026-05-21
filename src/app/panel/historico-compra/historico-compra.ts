import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrdersBackend, Order } from '../../backend/data-access/orders.backend';
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

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.ordersBackend.getOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        this.loading.set(false);
        this.notificationService.error('Error', 'No se pudieron cargar los pedidos');
      },
    });
  }

  repeatOrder(order: Order) {
    if (!order.items || order.items.length === 0) return;

    order.items.forEach(item => {
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