import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { NotificationService } from '../../shared/data-access/notification.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdersBackend, Order, OrderStatus } from '../../backend/data-access/orders.backend';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../shared/data-access/auth.service';
import { io, Socket } from 'socket.io-client';

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

interface OrderMessage {
  _id?: string;
  orderId: string;
  emisorId: string;
  emisorNombre: string;
  emisorRol: string;
  mensaje: string;
  leido: boolean;
  fecha: Date;
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
  authService = inject(AuthService);
  
  orders = signal<Order[]>([]);
  private previousOrders = new Map<string, Order>();
  loading = signal(true);
  selectedOrder = signal<Order | null>(null);

  // Modal de ficha técnica del repartidor
  showDeliveryPersonModal = signal(false);
  selectedDeliveryPerson = signal<DeliveryPerson | null>(null);
  deliveryPersonLoading = signal(false);

  // Mensajería del pedido
  showMessagesModal = signal(false);
  messages = signal<OrderMessage[]>([]);
  newMessage = signal('');
  isLoadingMessages = signal(false);
  isSendingMessage = signal(false);
  messagesError = signal('');
  private socket: Socket | null = null;
  private socketSetupDone = false;
  private currentMessagesRoomId: string | null = null;

  statusSteps: { status: OrderStatus; label: string; icon: string }[] = [
    { status: 'pendiente', label: 'Pedido recibido', icon: '📋' },
    { status: 'procesando', label: 'En proceso', icon: '⚙️' },
    { status: 'enviado', label: 'Enviado', icon: '🚚' },
    { status: 'entregado', label: 'Entregado', icon: '✅' },
  ];

  ngOnInit() {
    this.loadOrders();
    this.conectarSocket();
  }

  ngOnDestroy() {
    this.desconectarSocket();
  }

  private conectarSocket() {
    const socketUrl = window.location.origin;

    try {
      this.socket = io(socketUrl);

      if (!this.socketSetupDone) {
        this.socketSetupDone = true;

        this.socket.on('connect', () => {
          console.log('WebSocket conectado');
          if (this.currentMessagesRoomId) {
            this.socket?.emit('join-order-messages-room', this.currentMessagesRoomId);
          }
        });

        this.socket.on('nuevo-mensaje-pedido', (data: any) => {
          this.handleNewOrderMessage(data);
        });

        this.socket.on('disconnect', () => {
          console.log('WebSocket desconectado');
        });

        this.socket.on('connect_error', (error: any) => {
          console.error('Error en WebSocket:', error);
        });
      }
    } catch (error) {
      console.error('Error al conectar WebSocket:', error);
    }
  }

  private desconectarSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.socketSetupDone = false;
      this.currentMessagesRoomId = null;
    }
  }

  private handleNewOrderMessage(data: any) {
    const currentOrder = this.selectedOrder();
    if (currentOrder && currentOrder.id === data.orderId) {
      const currentMessages = this.messages();
      if (!currentMessages.some(m => m._id === data._id)) {
        this.messages.set([...currentMessages, data]);
      }
    }
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

  openMessagesModal() {
    const order = this.selectedOrder();
    if (!order) return;
    this.currentMessagesRoomId = order.id;
    this.showMessagesModal.set(true);
    this.messagesError.set('');
    this.newMessage.set('');
    this.loadMessages(order.id);

    if (this.socket && this.socket.connected) {
      this.socket.emit('join-order-messages-room', order.id);
    }
  }

  closeMessagesModal() {
    const order = this.selectedOrder();
    if (order && this.socket && this.socket.connected) {
      this.socket.emit('leave-order-messages-room', order.id);
    }
    this.currentMessagesRoomId = null;
    this.showMessagesModal.set(false);
    this.messages.set([]);
    this.newMessage.set('');
    this.messagesError.set('');
  }

  loadMessages(orderId: string) {
    this.isLoadingMessages.set(true);
    this.messagesError.set('');
    
    this.http.get<OrderMessage[]>(`/api/order-messages/order/${orderId}`).subscribe({
      next: (messages) => {
        const normalized = messages.map(m => ({ ...m, _id: typeof m._id === 'string' ? m._id : String(m._id || '') }));
        this.messages.set(normalized);
        this.isLoadingMessages.set(false);
      },
      error: (err) => {
        console.error('Error cargando mensajes:', err);
        this.isLoadingMessages.set(false);
        this.messagesError.set(err.error?.error || 'Error al cargar mensajes');
      }
    });
  }

  sendMessage() {
    const order = this.selectedOrder();
    const message = this.newMessage().trim();
    
    if (!order || !message) return;
    
    this.isSendingMessage.set(true);
    this.messagesError.set('');
    
    this.http.post(`/api/order-messages/order/${order.id}`, { mensaje: message }).subscribe({
      next: () => {
        this.isSendingMessage.set(false);
        this.newMessage.set('');
        if (!this.socket?.connected) {
          this.loadMessages(order.id);
        }
      },
      error: (err) => {
        console.error('Error enviando mensaje:', err);
        this.isSendingMessage.set(false);
        this.messagesError.set(err.error?.error || 'Error al enviar mensaje');
      }
    });
  }

  formatMessageTime(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return d.toLocaleDateString('es-VE', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  hasUnreadMessages(order: Order): boolean {
    const userId = this.authService.user()?.id || '';
    return order.mensajes?.some(m => !m.leido && m.emisorId !== userId) || false;
  }
}
