import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { NotificationService } from '../../shared/data-access/notification.service';
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
  facturaImage?: string;
  status: string;
  historial: OrderHistorial[];
  autorizadoPor?: string;
  autorizadoNombre?: string;
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
export class AdminPedidos implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private intervalId: any;

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

  // Modal de subida de factura
  showFacturaModal = signal(false);
  facturaError = signal('');
  isUploadingFactura = signal(false);
  // Drag & drop
  dragActive = signal(false);
  facturaFile = signal<File | null>(null);
  facturaPreview = signal<string | null>(null);

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

  ngOnInit() {
    this.loadOrders();
    // Actualizar cada minuto para contador
    this.intervalId = setInterval(() => {
      this.now.set(Date.now());
    }, 60000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
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

  onStatusClick(status: string) {
    if (status === 'cancelado') {
      this.openCancelModal();
    } else {
      this.updateStatus(this.selectedOrder()!.id, status);
    }
  }

   updateStatus(orderId: string, newStatus: string) {
     // Check if status is changing to pendiente for notification
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
             'El pedido #' + orderId.slice(-8) + ' ha sido confirmado y est\u00E1 pendiente de procesamiento'
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
    if (status === 'todos') return this.orders().length;
    return this.orders().filter(o => o.status === status).length;
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
       // Resetear el input para permitir seleccionar el mismo archivo nuevamente
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

     // Usar el preview que ya está en base64 desde handleFacturaFile
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
}
