import { Component, inject, signal } from '@angular/core';
import { CartItem } from './ui/cart-item/cart-item';
import { CartStateService } from '../shared/data-access/cart-state.service';
import { ProductItemCart } from '../shared/interfaces/product.interface';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService, User, Direccion } from '../shared/data-access/auth.service';
import { OrdersBackend, OrderItem, OrderStatus } from '../backend/data-access/orders.backend';

const CART_IMPORTS = [CartItem, CurrencyPipe, RouterLink, FormsModule, DatePipe];

interface PaymentData {
  nombre: string;
  cedula: string;
  telefono: string;
  direccion: string;
  metodoPago: string;
  referencia: string;
  fotoComprobante: string;
}

const PAGO_MOVIL_INFO = {
  banco: 'Banesco',
  titular: 'Escolares C.A',
  rif: 'J-304883676',
  telefono: '0414-4000800',
};

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: CART_IMPORTS,
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export default class CartComponent {
  state = inject(CartStateService).state;
  authService = inject(AuthService);
  private ordersBackend = inject(OrdersBackend);
  private http = inject(HttpClient);

  showCheckoutModal = signal(false);
  checkoutStep = signal(1);
  selectedAddressId = signal<string>('');
  showAddAddress = signal(false);
  newAddressNombre = '';
  newAddressDireccion = '';
  paymentData = signal<PaymentData>({
    nombre: '',
    cedula: '',
    telefono: '',
    direccion: '',
    metodoPago: 'zelle',
    referencia: '',
    fotoComprobante: '',
  });
  orderPlaced = signal(false);
  currentOrderId = signal<string>('');

  showCamera = signal(false);
  videoElement: HTMLVideoElement | null = null;
  cameraStream: MediaStream | null = null;
  whatsappNumber = '584244077616';

  showQRModal = signal(false);
  qrCodeData = signal('');
  qrExpiracion = signal('');
  qrLoading = signal(false);
  qrFotoRecibida = signal(false);
  qrPollingInterval: any = null;
  qrToken = signal('');

  getPagoMovilInfo() {
    return PAGO_MOVIL_INFO;
  }

  abrirQRModal() {
    this.qrLoading.set(true);
    this.showQRModal.set(true);
    this.qrCodeData.set('');
    this.qrExpiracion.set('');
    this.qrToken.set('');
    
    this.http.post<any>('/api/pago/generate-qr', {}).subscribe({
      next: (res) => {
        this.qrCodeData.set(res.qrCode);
        this.qrExpiracion.set(res.expiresAt);
        this.qrLoading.set(false);
        
        const tokenMatch = res.uploadUrl.match(/upload-pago\/([a-f0-9]+)/);
        
        if (tokenMatch) {
          const token = tokenMatch[1];
          this.qrToken.set(token);
          this.iniciarPollingQR();
        }
      },
      error: (err) => {
        console.error('Error generating QR:', err);
        this.qrLoading.set(false);
        alert('Error al generar código QR. Asegúrate de que el servidor esté actualizado.');
        this.showQRModal.set(false);
      }
    });
  }

  iniciarPollingQR() {
    const token = this.qrToken();
    if (!token) return;
    
    this.qrPollingInterval = setInterval(() => {
      this.http.get<any>(`/api/pago/check/${token}`).subscribe({
        next: (res) => {
          if (res.success && res.imagen) {
            this.paymentData.update(p => ({ ...p, fotoComprobante: res.imagen }));
            this.qrFotoRecibida.set(true);
            setTimeout(() => {
              this.cerrarQRModal();
            }, 3000);
          }
        },
        error: () => {}
      });
    }, 2000);
  }

  cerrarQRModal() {
    if (this.qrPollingInterval) {
      clearInterval(this.qrPollingInterval);
      this.qrPollingInterval = null;
    }
    this.showQRModal.set(false);
    this.qrCodeData.set('');
    this.qrExpiracion.set('');
    this.qrFotoRecibida.set(false);
    this.qrToken.set('');
  }

  get user(): User | null {
    return this.authService.user();
  }

  get userName(): string {
    const u = this.user;
    return u?.nombreCompleto || u?.username || '';
  }

  get userEmail(): string {
    const u = this.user;
    return u?.email || '';
  }

  get userPhone(): string {
    const u = this.user;
    return u?.telefono || '';
  }

  get userCedula(): string {
    const u = this.user;
    return u?.cedula || '';
  }

  get userAddress(): string {
    const u = this.user;
    return u?.direccion || '';
  }

  get userAddresses(): Direccion[] {
    const u = this.user;
    return u?.direcciones || [];
  }

  paymentMethods = [
    { value: 'zelle', label: 'Zelle' },
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'pago_movil', label: 'Pago Móvil' },
  ];

  price = () => {
    const products = this.state().products;
    return products.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  };

  onRemove(id: number | string) {
    this.state.remove(id);
  }

  onIncrease(product: ProductItemCart) {
    this.state.udpate({
      product: product.product,
      quantity: product.quantity + 1,
    });
  }

  onDecrease(product: ProductItemCart) {
    this.state.udpate({
      ...product,
      quantity: product.quantity - 1,
    });
  }

  openCheckout() {
    const currentUser = this.authService.user();
    const addresses = currentUser?.direcciones || [];
    const defaultAddress = addresses.length > 0 ? addresses[0] : null;
    
    this.selectedAddressId.set(defaultAddress?.id || '');
    this.paymentData.set({
      nombre: currentUser?.nombreCompleto || '',
      cedula: currentUser?.cedula || '',
      telefono: currentUser?.telefono || '',
      direccion: defaultAddress?.direccion || currentUser?.direccion || '',
      metodoPago: 'zelle',
      referencia: '',
      fotoComprobante: '',
    });
    this.showCheckoutModal.set(true);
    this.checkoutStep.set(1);
    this.currentOrderId.set('');
  }

  onAddressChange(addressId: string) {
    this.selectedAddressId.set(addressId);
    const addresses = this.userAddresses;
    const selected = addresses.find(a => a.id === addressId);
    if (selected) {
      this.paymentData.update(p => ({ ...p, direccion: selected.direccion }));
    }
  }

  toggleAddAddress() {
    this.showAddAddress.set(!this.showAddAddress());
    this.newAddressNombre = '';
    this.newAddressDireccion = '';
  }

  addNewAddress() {
    if (!this.newAddressNombre || !this.newAddressDireccion) {
      alert('Por favor completa todos los campos');
      return;
    }
    
    if (!this.authService.isLoggedIn()) {
      alert('Debes iniciar sesión para guardar una dirección');
      return;
    }
    
    const newDir: Direccion = {
      id: Date.now().toString(),
      nombre: this.newAddressNombre,
      direccion: this.newAddressDireccion,
    };
    
    const currentUser = this.authService.user();
    const currentAddresses = currentUser?.direcciones || [];
    
    this.authService.updateProfile({
      direcciones: [...currentAddresses, newDir]
    })?.subscribe({
      next: (user) => {
        this.selectedAddressId.set(newDir.id);
        this.paymentData.update(p => ({ ...p, direccion: newDir.direccion }));
        this.showAddAddress.set(false);
        this.newAddressNombre = '';
        this.newAddressDireccion = '';
      },
      error: (err) => {
        console.error('Error guardando dirección:', err);
        alert('Error al guardar la dirección. Intenta de nuevo.');
      }
    });
  }

  closeCheckout() {
    this.showCheckoutModal.set(false);
    this.showAddAddress.set(false);
    this.selectedAddressId.set('');
    this.newAddressNombre = '';
    this.newAddressDireccion = '';
    this.checkoutStep.set(1);
    this.currentOrderId.set('');
    if (this.orderPlaced()) {
      this.orderPlaced.set(false);
      this.paymentData.set({
        nombre: '',
        cedula: '',
        telefono: '',
        direccion: '',
        metodoPago: 'zelle',
        referencia: '',
        fotoComprobante: '',
      });
    }
  }

  nextStep() {
    if (this.checkoutStep() < 3) {
      this.checkoutStep.update(s => s + 1);
      if (this.checkoutStep() === 3) {
        this.currentOrderId.set('temp');
      }
    }
  }

  guardarOrdenTemporal() {
    if (!this.authService.isLoggedIn()) {
      alert('Debes iniciar sesión para continuar');
      return;
    }

    const items: OrderItem[] = this.state().products.map(item => ({
      productId: item.product.id,
      title: item.product.title,
      price: item.product.price,
      quantity: item.quantity,
      image: item.product.image,
    }));

    const orderData = {
      items,
      total: this.price(),
      nombre: this.paymentData().nombre,
      cedula: this.paymentData().cedula,
      telefono: this.paymentData().telefono,
      direccion: this.paymentData().direccion,
      metodoPago: this.paymentData().metodoPago,
      referencia: this.paymentData().referencia,
      fotoComprobante: this.paymentData().fotoComprobante,
      status: 'confirmar' as OrderStatus,
    };

    this.ordersBackend.createOrder(orderData).subscribe({
      next: (order) => {
        this.currentOrderId.set(order.id);
      },
      error: (err) => {
        console.error('Error guardando orden:', err);
      }
    });
  }

  confirmarPedido() {
    if (!this.currentOrderId()) return;

    const items: OrderItem[] = this.state().products.map(item => ({
      productId: item.product.id,
      title: item.product.title,
      price: item.product.price,
      quantity: item.quantity,
      image: item.product.image,
    }));

    const orderData = {
      items,
      total: this.price(),
      nombre: this.paymentData().nombre,
      cedula: this.paymentData().cedula,
      telefono: this.paymentData().telefono,
      direccion: this.paymentData().direccion,
      metodoPago: this.paymentData().metodoPago,
      referencia: this.paymentData().referencia,
      fotoComprobante: this.paymentData().fotoComprobante,
      status: 'pendiente' as OrderStatus,
    };

    this.ordersBackend.createOrder(orderData).subscribe({
      next: () => {
        this.state().products.forEach(item => {
          this.state.remove(item.product.id);
        });
        this.orderPlaced.set(true);
        this.currentOrderId.set('');
      },
      error: (err) => {
        console.error('Error confirmando pedido:', err);
        alert('Error al confirmar el pedido.');
      }
    });
  }

  tieneComprobantePago(): boolean {
    const data = this.paymentData();
    return !!(data.referencia || data.fotoComprobante);
  }

  cancelarPedido() {
    if (!this.currentOrderId()) return;

    if (this.tieneComprobantePago()) {
      alert('Este pedido ya tiene un comprobante de pago. No puedes cancelarlo. Contacta al administrador.');
      return;
    }

    if (confirm('¿Estás seguro de cancelar este pedido?')) {
      this.ordersBackend.deleteOrder(this.currentOrderId()).subscribe({
        next: () => {
          this.currentOrderId.set('');
          this.closeCheckout();
        },
        error: (err) => {
          console.error('Error cancelando pedido:', err);
          alert('Error al cancelar el pedido.');
        }
      });
      this.currentOrderId.set('');
    }
  }

  prevStep() {
    if (this.checkoutStep() > 1) {
      this.checkoutStep.update(s => s - 1);
    }
  }

  placeOrder() {
    const items: OrderItem[] = this.state().products.map(item => ({
      productId: item.product.id,
      title: item.product.title,
      price: item.product.price,
      quantity: item.quantity,
      image: item.product.image,
    }));

    const orderData = {
      items,
      total: this.price(),
      nombre: this.paymentData().nombre,
      cedula: this.paymentData().cedula,
      telefono: this.paymentData().telefono,
      direccion: this.paymentData().direccion,
      metodoPago: this.paymentData().metodoPago,
      referencia: this.paymentData().referencia,
      fotoComprobante: this.paymentData().fotoComprobante,
    };

    this.ordersBackend.createOrder(orderData).subscribe({
      next: (order) => {
        console.log('Order created:', order);
        this.state().products.forEach(item => {
          this.state.remove(item.product.id);
        });
        this.orderPlaced.set(true);
      },
      error: (err) => {
        console.error('Error creating order:', err);
        alert('Error al crear el pedido. Por favor intenta de nuevo.');
      }
    });
  }

  abrirCamera() {
    this.showCamera.set(true);
    setTimeout(() => this.iniciarCamera(), 100);
  }

  async iniciarCamera() {
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      this.videoElement = document.getElementById('cameraVideoPago') as HTMLVideoElement;
      if (this.videoElement) {
        this.videoElement.srcObject = this.cameraStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('No se pudo acceder a la cámara');
    }
  }

  capturarComprobante() {
    if (!this.videoElement) return;

    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(this.videoElement, 0, 0);
      const foto = canvas.toDataURL('image/jpeg', 0.8);
      this.paymentData.update(p => ({ ...p, fotoComprobante: foto }));
      this.cerrarCamera();
    }
  }

  cerrarCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    this.showCamera.set(false);
  }

  eliminarComprobante() {
    this.paymentData.update(p => ({ ...p, fotoComprobante: '' }));
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      this.paymentData.update(p => ({ ...p, fotoComprobante: result }));
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  enviarComprobanteWhatsApp() {
    const metodo = this.paymentMethods.find(m => m.value === this.paymentData().metodoPago)?.label || this.paymentData().metodoPago;
    const data = this.paymentData();
    const pmInfo = PAGO_MOVIL_INFO;
    
    let mensaje = `*DATOS PARA PAGO MÓVIL*\n\n` +
      `*Banco:* ${pmInfo.banco}\n` +
      `*Titular:* ${pmInfo.titular}\n` +
      `*RIF:* ${pmInfo.rif}\n` +
      `*Teléfono:* ${pmInfo.telefono}\n\n` +
      `*Monto:* $${this.price().toFixed(2)}\n` +
      `*Referencia:* ${data.referencia}\n\n` +
      `Adjunto foto del comprobante.`;

    const url = `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  get showCameraForPayment(): boolean {
    return this.showCamera() && this.checkoutStep() === 3;
  }
}
