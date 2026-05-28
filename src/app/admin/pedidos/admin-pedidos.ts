import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { NotificationService } from '../../shared/data-access/notification.service';
import { AuthService } from '../../shared/data-access/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { OrdersBackend, Order } from '../../backend/data-access/orders.backend';

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



interface CompraNotificacion {
  tipo: 'compra';
  titulo: string;
  mensaje: string;
  pedidoId: string;
  cliente: string;
  fecha: Date;
  imagenProducto?: string;
}

@Component({
  selector: 'app-admin-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-pedidos.html',
  styleUrl: './admin-pedidos.css',
})
export class AdminPedidos implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private ordersBackend = inject(OrdersBackend);
  private intervalId: any;
  private socket: WebSocket | null = null;

  orders = signal<Order[]>([]);
  loading = signal(true);
  selectedOrder = signal<Order | null>(null);
  filterStatus = signal('todos');
  searchTerm = signal('');
  imageModalOpen = signal(false);
  modalImageUrl = signal('');
  now = signal(Date.now());

  // Modal de cancelación
  showCancelModal = signal(false);
  cancelReason = signal('');
  supervisorKey = signal('');
  cancelError = signal('');
  isCancelling = signal(false);
  hasSupervisorKey = signal(false);

  // Modal de subida de factura
  showFacturaModal = signal(false);
  facturaError = signal('');
  isUploadingFactura = signal(false);
  // Drag & drop
  dragActive = signal(false);
  facturaFile = signal<File | null>(null);
  facturaPreview = signal<string | null>(null);

// Modal de asignar repartidor
   showAssignDeliveryModal = signal(false);
   deliveryPersons = signal<DeliveryPerson[]>([]);
   selectedDeliveryPersonId = signal('');
   assignDeliveryError = signal('');
   isAssigningDelivery = signal(false);
   loadingDeliveryPersons = signal(false);

   // Modal de ficha técnica del repartidor
   showDeliveryPersonModal = signal(false);
   selectedDeliveryPerson = signal<DeliveryPerson | null>(null);

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
    entregado: '#28a745',
    cancelado: '#dc3545',
  };



  private tienePermisosAdmin(user: any): boolean {
    // Si el usuario tiene rol 'root', tiene acceso total al panel admin
    if (user.rol === 'root') {
      return true;
    }
    
    // Si el usuario tiene rol 'admin', también tiene acceso
    if (user.rol === 'admin') {
      return true;
    }
    
    // Verificar permisos específicos que otorgan acceso al panel admin
    const permisosAdmin = [
      'pedidos_ver', 'tasas_gestionar', 'tasas_ver', 'facturas_registrar',
      'facturas_gestionar', 'gastos_gestionar', 'nomina_ver', 'documentos_ver',
      'conversion_gestionar', 'chat_ver', 'caja_ver', 'ver_proveedores',
      'ver_retenciones', 'ver_libro_compras', 'inicio_gestionar', 'productos_gestionar',
      'marcas_ver', 'lineas_ver', 'ofertas_ver', 'usuarios_gestionar', 
      'roles_gestionar', 'manuales_ver'
    ];
    
    if (user.permisos && Array.isArray(user.permisos)) {
      return user.permisos.some((p: string) => permisosAdmin.includes(p));
    }
    
    return false;
  }

  ngOnInit() {
    const user = this.authService.user();
    this.hasSupervisorKey.set(this.tienePermisosAdmin(user));
    this.loadOrders();
    this.conectarSocket();
    // Actualizar cada minuto para contador
    this.intervalId = setInterval(() => {
      this.now.set(Date.now());
    }, 60000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.desconectarSocket();
  }

  private conectarSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const socketUrl = `${protocol}//${host}`;
    
    try {
      this.socket = new WebSocket(socketUrl);
      
      this.socket.onopen = () => {
        console.log('WebSocket conectado');
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.tipo === 'compra') {
            this.mostrarNotificacionCompra(data);
          } else if (data.tipo === 'actualizacion_pedido') {
            this.loadOrders();
          }
        } catch (error) {
          console.error('Error procesando mensaje del socket:', error);
        }
      };
      
      this.socket.onclose = () => {
        console.log('WebSocket desconectado');
        // Reconectar después de 3 segundos
        setTimeout(() => this.conectarSocket(), 3000);
      };
      
      this.socket.onerror = (error) => {
        console.error('Error en WebSocket:', error);
      };
    } catch (error) {
      console.error('Error al conectar WebSocket:', error);
    }
  }

  private desconectarSocket() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private mostrarNotificacionCompra(notificacion: CompraNotificacion) {
    this.notificationService.show({
      title: notificacion.titulo,
      message: notificacion.mensaje,
      type: 'info',
      duration: 5000,
      icon: '🛒'
    });
    
    // Actualizar la lista de pedidos
    this.loadOrders();
  }

	  loadOrders() {
	    this.loading.set(true);
	    this.ordersBackend.getOrders().subscribe(
	      (orders: Order[]) => {
	        this.orders.set(orders);
	        this.loading.set(false);
	      },
	      (err: any) => {
	        console.error('Error loading orders:', err);
	        this.loading.set(false);
	      }
	    );
	  }

	  get filteredOrders(): Order[] {
	    const orders = this.orders() ?? [];
	    let result = [...orders];
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

  onStatusClick(status: string) {
    if (status === 'cancelado') {
      this.openCancelModal();
    } else {
      this.updateStatus(this.selectedOrder()!.id, status);
    }
  }

   updateStatus(orderId: string, newStatus: string) {
      const order = this.selectedOrder();
      const wasConfirmed = order && order.status === 'confirmar';
      const isPendiente = newStatus === 'pendiente';
      this.http.put<any>(`/api/orders/${orderId}/status`, {
        status: newStatus,
        observaciones: ''
      }).subscribe({
        next: (updatedOrder) => {
          this.loadOrders();
          // Show notification if order changed to pendiente
          if (wasConfirmed && isPendiente) {
            this.notificationService.success(
              'Pedido Confirmado',
              'El pedido #' + orderId.slice(-8) + ' ha sido confirmado y está pendiente de procesamiento'
            );
          }
          if (this.selectedOrder()?.id === orderId) {
            this.selectedOrder.set(updatedOrder);
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
		    const orders = this.orders();
		    if (!Array.isArray(orders)) return 0;
		    if (status === 'todos') return orders.length;
		    return orders.filter(o => o.status === status).length;
		  }

	  isStatusDisabled(statusValue: string): boolean {
	    const currentStatus = this.selectedOrder()?.status;
	    if (!currentStatus) return true;
    if (currentStatus === 'entregado' || currentStatus === 'cancelado') {
      return true;
    }
    if (statusValue === 'entregado' && !this.selectedOrder()?.facturaImage) {
      return true;
    }
    return false;
  }

  getTimeInProgress(order: Order): string {
    const endDate = (order.status === 'entregado' || order.status === 'cancelado')
      ? new Date(order.updatedAt)
      : new Date(this.now());
    
    const startDate = new Date(order.createdAt);
    const diffMs = endDate.getTime() - startDate.getTime();
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  openImageModal(url: string) {
    this.modalImageUrl.set(url);
    this.imageModalOpen.set(true);
  }

  closeImageModal() {
    this.imageModalOpen.set(false);
    this.modalImageUrl.set('');
  }

  openCancelModal() {
    this.showCancelModal.set(true);
    this.cancelReason.set('');
    this.supervisorKey.set('');
    this.cancelError.set('');
  }

  closeCancelModal() {
    this.showCancelModal.set(false);
  }

   cancelOrderWithSupervisor() {
      const order = this.selectedOrder();
      const motivo = this.cancelReason().trim();
      const clave = this.supervisorKey().trim();

      if (!motivo) {
        this.cancelError.set('Por favor ingresa un motivo de cancelación');
        return;
      }
      if (!clave) {
        this.cancelError.set('Por favor ingresa la clave de supervisor');
        return;
      }
      if (!order) return;

      this.isCancelling.set(true);
      this.cancelError.set('');

      this.http.put<any>(`/api/orders/${order.id}/cancel-authorize`, {
        motivo,
        claveSupervisor: clave
      }).subscribe({
        next: (updatedOrder) => {
          this.isCancelling.set(false);
          this.closeCancelModal();
          this.loadOrders();
          if (this.selectedOrder()?.id === order.id) {
            this.selectedOrder.set(updatedOrder);
          }
          alert('Pedido cancelado correctamente');
        },
        error: (err: any) => {
          this.isCancelling.set(false);
          this.cancelError.set(err.error?.error || 'Error al cancelar pedido');
        }
      });
    }

  // --- Factura ---
  openFacturaModal() {
    this.showFacturaModal.set(true);
    this.facturaError.set('');
    this.facturaFile.set(null);
    this.facturaPreview.set(null);
    this.dragActive.set(false);
  }

  closeFacturaModal() {
    this.showFacturaModal.set(false);
  }

  onDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragActive.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragActive.set(false);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragActive.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        this.handleFacturaFile(file);
      } else {
        this.facturaError.set('Solo se permiten archivos de imagen');
      }
    }
  }

   onFileSelected(event: Event) {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
        const file = input.files[0];
        if (file.type.startsWith('image/')) {
          this.handleFacturaFile(file);
        } else {
          this.facturaError.set('Solo se permiten archivos de imagen');
        }
        input.value = '';
      }
    }

  private handleFacturaFile(file: File) {
    this.facturaError.set('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        this.facturaPreview.set(result);
        this.facturaFile.set(file);
      }
    };
    reader.readAsDataURL(file);
  }

   uploadFactura() {
      const order = this.selectedOrder();
      const file = this.facturaFile();
      const preview = this.facturaPreview();

      if (!file || !preview) {
        this.facturaError.set('Selecciona una imagen para subir');
        return;
      }
      if (!order) return;

      this.isUploadingFactura.set(true);
      this.facturaError.set('');

      this.http.put<any>(`/api/orders/${order.id}/factura`, {
        facturaImage: preview
      }).subscribe({
        next: (updatedOrder) => {
          this.isUploadingFactura.set(false);
          this.closeFacturaModal();
          this.loadOrders();
          if (this.selectedOrder()?.id === order.id) {
            this.selectedOrder.set(updatedOrder);
          }
          alert('Factura subida correctamente');
        },
        error: (err: any) => {
          this.isUploadingFactura.set(false);
          this.facturaError.set(err.error?.error || 'Error al subir factura');
        }
      });
    }

  // --- Asignar repartidor ---
  loadDeliveryPersons() {
    this.loadingDeliveryPersons.set(true);
    this.http.get<DeliveryPerson[]>('/api/delivery').subscribe({
      next: (persons) => {
        this.deliveryPersons.set(persons);
        this.loadingDeliveryPersons.set(false);
      },
      error: (err) => {
        console.error('Error loading delivery persons:', err);
        this.loadingDeliveryPersons.set(false);
      },
    });
  }

  openAssignDeliveryModal() {
    this.showAssignDeliveryModal.set(true);
    this.assignDeliveryError.set('');
    this.selectedDeliveryPersonId.set(this.selectedOrder()?.deliveryPersonId || '');
    if (this.deliveryPersons().length === 0) {
      this.loadDeliveryPersons();
    }
  }

  closeAssignDeliveryModal() {
    this.showAssignDeliveryModal.set(false);
  }

  assignDeliveryPerson() {
    const order = this.selectedOrder();
    const selectedId = this.selectedDeliveryPersonId();
    if (!selectedId) {
      this.assignDeliveryError.set('Por favor selecciona un repartidor');
      return;
    }
    if (!order) return;

    const selectedPerson = this.deliveryPersons().find(p => p.id === selectedId);
    if (!selectedPerson) {
      this.assignDeliveryError.set('Repartidor no encontrado');
      return;
    }

    this.isAssigningDelivery.set(true);
    this.assignDeliveryError.set('');

    this.http.put<any>(`/api/orders/${order.id}/assign-delivery`, {
      deliveryPersonId: selectedPerson.id,
      deliveryPersonName: selectedPerson.nombre
    }).subscribe({
      next: (updatedOrder) => {
        this.isAssigningDelivery.set(false);
        this.closeAssignDeliveryModal();
        this.loadOrders();
        if (this.selectedOrder()?.id === order.id) {
          this.selectedOrder.set(updatedOrder);
        }
        alert('Repartidor asignado correctamente');
      },
      error: (err: any) => {
        this.isAssigningDelivery.set(false);
        this.assignDeliveryError.set(err.error?.error || 'Error al asignar repartidor');
      }
    });
  }

  openDeliveryPersonModal(personId: string) {
    let person = this.deliveryPersons().find(p => p.id === personId);
    if (person) {
      this.selectedDeliveryPerson.set(person);
      this.showDeliveryPersonModal.set(true);
    } else {
      this.loadingDeliveryPersons.set(true);
      this.http.get<DeliveryPerson>(`/api/delivery/${personId}`).subscribe({
        next: (p) => {
          this.loadingDeliveryPersons.set(false);
          this.selectedDeliveryPerson.set(p);
          this.showDeliveryPersonModal.set(true);
        },
        error: (err) => {
          this.loadingDeliveryPersons.set(false);
          console.error('Error loading delivery person:', err);
          this.notificationService.error('Error', 'No se pudo cargar la ficha del repartidor');
        }
      });
    }
  }

  closeDeliveryPersonModal() {
    this.showDeliveryPersonModal.set(false);
    this.selectedDeliveryPerson.set(null);
  }
}
