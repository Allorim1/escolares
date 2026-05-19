import { Component, inject, signal, OnDestroy, computed } from '@angular/core';
import { CartItem } from './ui/cart-item/cart-item';
import { CartStateService } from '../shared/data-access/cart-state.service';
import { ProductItemCart } from '../shared/interfaces/product.interface';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../shared/data-access/auth.service';
import { User, Direccion, MetodoPago } from '../backend/models';
import { OrdersBackend, OrderItem, OrderStatus } from '../backend/data-access/orders.backend';
import { NotificationService } from '../shared/data-access/notification.service';
import { CurrencyService } from '../shared/data-access/currency.service';
import { StoreSettingsService } from '../shared/data-access/store-settings.service';
import { ProductsStateService } from '../products/data-access/products-state.service';

const CART_IMPORTS = [CartItem, RouterLink, FormsModule, DatePipe];

interface PaymentData {
  nombre: string;
  cedula: string;
  telefono: string;
  direccion: string;
  metodoPago: string;
  referencia: string;
  fotoComprobante: string;
  bancoEmisor?: string;
  cedulaTitular?: string;
  correo?: string;
}

type DeliveryType = 'express' | 'programado';

interface ShippingRate {
  id: string;
  label: string;
  ref: number;
}

const PAGO_MOVIL_INFO = {
  banco: 'Banesco',
  titular: 'Escolares C.A',
  rif: 'J-304883676',
  telefono: '0414-4000800',
};

const TRANSFERENCIA_INFO = {
  banco: 'Banesco',
  titular: 'Escolares C.A',
  rif: 'J-304883676',
  numero_cuenta: '0134-0187-08-1871037067',
};

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [...CART_IMPORTS],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export default class CartComponent implements OnDestroy {
  state = inject(CartStateService).state;
  authService = inject(AuthService);
  private ordersBackend = inject(OrdersBackend);
  private notificationService = inject(NotificationService);
  private http = inject(HttpClient);
  currencyService = inject(CurrencyService);
  storeSettings = inject(StoreSettingsService);
  private router = inject(Router);
  private productsState = inject(ProductsStateService);

  constructor() {
    // Trigger product loading for recommendations
    this.productsState.changePage$.next(1);

    // Auto-show recommendations modal when cart has products
    setTimeout(() => {
      const products = this.state().products;
      if (products.length > 0 && this.recommendedProducts().length > 0) {
        this.showRecommendationsModal.set(true);
      }
    }, 100);
  }

  // Recommended products for last-minute addition (excludes products already in cart)
  recommendedProducts = computed(() => {
    const allProducts = this.productsState.allProducts();
    const cartProductIds = new Set(this.state().products.map(p => p.product.id));
    return allProducts
      .filter(p => !cartProductIds.has(p.id) && p.estado !== 'agotado')
      .sort(() => Math.random() - 0.5)
      .slice(0, 8);
  });

  // Format price based on current currency display
  formatPrice(priceInUsd: number): string {
    return this.currencyService.formatPrice(priceInUsd);
  }

showCheckoutModal = signal(false);
   showRecommendationsModal = signal(false);
   checkoutStep = signal(1);
  shippingError = signal('');
  paymentError = signal('');
  selectedAddressId = signal<string>('');
  selectedShippingRateId = signal<string>('rate-0');
  deliveryType = signal<DeliveryType>('express');
  scheduledFor = signal('');
  showAddAddress = signal(false);
  selectedSavedPaymentId = signal('');
  newAddressNombre = '';
  newAddressDireccion = '';
  paymentData = signal<PaymentData>({
    nombre: '',
    cedula: '',
    telefono: '',
    direccion: '',
    metodoPago: 'pago_movil',
    referencia: '',
    fotoComprobante: '',
    bancoEmisor: '',
    cedulaTitular: '',
    correo: '',
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
  qrPollingSubscription: any = null;
  qrToken = signal('');

  showAddressModal = signal(false);
  showAddAddressModal = signal(false);
  showAddressSavedModal = signal(false);

  getPagoMovilInfo() {
    return PAGO_MOVIL_INFO;
  }

  getTransferenciaInfo() {
    return TRANSFERENCIA_INFO;
  }


  abrirQRModal() {
    this.qrLoading.set(true);
    this.showQRModal.set(true);
    this.qrCodeData.set('');
    this.qrExpiracion.set('');
    this.qrToken.set('');
    
    const subscription = this.http.post<any>('/api/pago/generate-qr', {}).subscribe({
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
        if (err.name !== 'AbortError') {
          console.error('Error generating QR:', err);
          this.qrLoading.set(false);
          if (this.showQRModal()) {
            alert('Error al generar código QR. Asegúrate de que el servidor esté actualizado.');
            this.showQRModal.set(false);
          }
        }
      }
    });
    
    this.qrPollingSubscription = subscription;
  }

  iniciarPollingQR() {
    const token = this.qrToken();
    if (!token) return;
    
    this.qrPollingInterval = setInterval(() => {
      if (!this.showQRModal()) {
        this.detenerPollingQR();
        return;
      }
      
      const subscription = this.http.get<any>(`/api/pago/check/${token}`).subscribe({
        next: (res) => {
          if (res.success && res.imagen) {
            this.paymentData.update(p => ({ ...p, fotoComprobante: res.imagen }));
            this.qrFotoRecibida.set(true);
            this.detenerPollingQR();
            setTimeout(() => {
              this.cerrarQRModal();
            }, 3000);
          }
        },
        error: (err) => {
          if (err.name !== 'AbortError') {
            console.error('Error polling QR:', err);
          }
        }
      });
      
      this.qrPollingSubscription = subscription;
    }, 2000);
  }

  detenerPollingQR() {
    if (this.qrPollingInterval) {
      clearInterval(this.qrPollingInterval);
      this.qrPollingInterval = null;
    }
    if (this.qrPollingSubscription) {
      this.qrPollingSubscription.unsubscribe();
      this.qrPollingSubscription = null;
    }
  }

  cerrarQRModal() {
    this.detenerPollingQR();
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

  get userPaymentMethods(): MetodoPago[] {
    const u = this.user;
    return u?.metodosPago || [];
  }

paymentMethods = [
    { value: 'pago_movil', label: 'Pago Móvil' },
    // { value: 'zelle', label: 'Zelle' },
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'punto_venta', label: 'Punto de Venta' },
  ];

  shippingRates: ShippingRate[] = [
    { id: 'rate-0', label: 'Propina - Ref 0.00', ref: 0.0 },
    { id: 'rate-05', label: 'Propina - Ref 0.50', ref: 0.5 },
    { id: 'rate-10-a', label: 'Propina - Ref 1.00', ref: 1.0 },
    { id: 'rate-15', label: 'Propina - Ref 1.50', ref: 1.5 },
    { id: 'rate-20', label: 'Propina - Ref 2.00', ref: 2.0 },
  ];

  price = () => {
    const products = this.state().products;
    return products.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  };

  shippingCost = () => this.getSelectedShippingRate().ref;

  totalWithShipping = () => this.price() + this.shippingCost();

  ivaTotal = () => {
    const products = this.state().products;
    return products.reduce((acc, item) => {
      if (item.product.iva) {
        const percentage = item.product.ivaPercentage || 16;
        const priceWithVat = item.product.price * item.quantity;
        const vatAmount = priceWithVat * (percentage / (100 + percentage));
        return acc + vatAmount;
      }
      return acc;
    }, 0);
  };

  getSelectedShippingRate(): ShippingRate {
    return this.shippingRates.find((rate) => rate.id === this.selectedShippingRateId()) || this.shippingRates[0];
  }

  setDeliveryType(type: DeliveryType) {
    this.deliveryType.set(type);
    if (type === 'express') {
      this.scheduledFor.set('');
      this.shippingError.set('');
    }
  }

  getMinScheduleDateTime(): string {
    return this.formatDateTimeLocal(new Date());
  }

  getMaxScheduleDateTime(): string {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 3);
    return this.formatDateTimeLocal(maxDate);
  }

  private formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private validateShippingStep(): boolean {
    if (this.deliveryType() !== 'programado') {
      this.shippingError.set('');
      return true;
    }

    const scheduled = this.scheduledFor();
    if (!scheduled) {
      this.shippingError.set('Debes seleccionar fecha y hora para programar el pedido.');
      return false;
    }

    const selectedDate = new Date(scheduled);
    if (Number.isNaN(selectedDate.getTime())) {
      this.shippingError.set('La fecha programada no es válida.');
      return false;
    }

    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 3);

    if (selectedDate < now) {
      this.shippingError.set('La fecha programada no puede ser anterior al momento actual.');
      return false;
    }

    if (selectedDate > maxDate) {
      this.shippingError.set('Solo puedes programar el pedido hasta 3 días después de la compra.');
      return false;
    }

    this.shippingError.set('');
    return true;
  }

  onRemove(id: number | string) {
    this.state.remove(id);
  }

  onIncrease(product: ProductItemCart) {
    this.state.update({
      product: product.product,
      quantity: product.quantity + 1,
    });
  }

  onDecrease(product: ProductItemCart) {
    this.state.update({
      ...product,
      quantity: product.quantity - 1,
    });
  }

  clearCart() {
    if (confirm('¿Estás seguro de que deseas vaciar el carrito? Se eliminarán todos los productos.')) {
      this.state.clear();
    }
  }

  addRecommendedProduct(product: ProductItemCart['product']) {
    this.state.add({ product, quantity: 1 });
    this.notificationService.success(
      'Producto agregado',
      `${product.title} se ha agregado a tu carrito`
    );
  }

  closeRecommendationsModal() {
    this.showRecommendationsModal.set(false);
  }

  openCheckout() {
    // Check if purchases are disabled
    if (this.storeSettings.comprasDeshabilitadas()) {
      alert('Las compras están temporalmente deshabilitadas. Por favor intenta más tarde.');
      return;
    }

    const currentUser = this.authService.user();
    const addresses = currentUser?.direcciones || [];
    const defaultAddress = addresses.length > 0 ? addresses[0] : null;
    
    const paymentMethods = currentUser?.metodosPago || [];
    const defaultPaymentMethod = paymentMethods.find((m) => m.principal) || paymentMethods[0];

    this.selectedAddressId.set(defaultAddress?.id || '');
    this.selectedSavedPaymentId.set(defaultPaymentMethod?.id || '');
    this.paymentData.set({
      nombre: currentUser?.nombreCompleto || '',
      cedula: currentUser?.cedula || '',
      telefono: currentUser?.telefono || '',
      direccion: defaultAddress?.direccion || currentUser?.direccion || '',
      metodoPago: defaultPaymentMethod?.tipo || 'pago_movil',
      referencia: defaultPaymentMethod?.referencia || '',
      fotoComprobante: '',
      bancoEmisor: '',
      cedulaTitular: '',
      correo: '',
    });
    this.showCheckoutModal.set(true);
    this.checkoutStep.set(1);
    this.shippingError.set('');
    this.selectedShippingRateId.set('rate-0');
    this.deliveryType.set('express');
    this.scheduledFor.set('');
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

  onSavedPaymentChange(paymentId: string) {
    this.selectedSavedPaymentId.set(paymentId);
    const selected = this.userPaymentMethods.find((m) => m.id === paymentId);
    if (!selected) return;

    this.paymentData.update((p) => ({
      ...p,
      metodoPago: selected.tipo,
      referencia: selected.referencia || p.referencia,
    }));
    this.paymentError.set('');
  }

  guardarMetodoPagoActual() {
    if (!this.authService.isLoggedIn()) {
      alert('Debes iniciar sesión para guardar métodos de pago.');
      return;
    }

    const data = this.paymentData();
    const tipo = data.metodoPago as MetodoPago['tipo'];
    if (tipo === 'pago_movil' || tipo === 'transferencia') {
      alert('Para guardar Pago Móvil o Transferencia, usa "Mis métodos de pago" y completa banco/teléfono/titular.');
      return;
    }
    if (tipo === 'zelle' && !data.referencia.trim()) {
      alert('Para guardar Zelle debes indicar una referencia.');
      return;
    }
    const existing = this.userPaymentMethods;
    const alias = `Método ${existing.length + 1}`;
    const nuevoMetodo: MetodoPago = {
      id: Date.now().toString(),
      alias,
      tipo: data.metodoPago as MetodoPago['tipo'],
      referencia: data.referencia || '',
      principal: existing.length === 0,
    };

    this.authService.updateProfile({
      metodosPago: [...existing, nuevoMetodo],
    })?.subscribe({
      next: () => {
        this.selectedSavedPaymentId.set(nuevoMetodo.id);
        alert('Método de pago guardado.');
      },
      error: () => {
        alert('No se pudo guardar el método de pago.');
      },
    });
  }

  toggleAddAddress() {
    this.showAddAddressModal.set(true);
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
        this.showAddAddressModal.set(false);
        this.showAddressSavedModal.set(true);
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
    this.cerrarQRModal();
    if (this.orderPlaced()) {
      this.orderPlaced.set(false);
      this.paymentData.set({
        nombre: '',
        cedula: '',
        telefono: '',
        direccion: '',
        metodoPago: 'pago_movil',
        referencia: '',
        fotoComprobante: '',
        bancoEmisor: '',
        cedulaTitular: '',
        correo: '',
      });
    }
  }

  nextStep() {
    if (this.checkoutStep() === 2 && !this.validateShippingStep()) {
      return;
    }

    if (this.checkoutStep() < 3) {
      this.checkoutStep.update(s => s + 1);
      if (this.checkoutStep() === 3) {
        this.currentOrderId.set('temp');
      }
    }
  }

  private validarPagoCheckout(): boolean {
    const data = this.paymentData();
    const metodo = data.metodoPago;
    const referencia = data.referencia.trim();
    const tieneComprobante = !!data.fotoComprobante;

    if (metodo === 'efectivo') {
      // Para efectivo, la foto del comprobante es obligatoria
      if (!data.fotoComprobante) {
        this.paymentError.set('Para pago en efectivo debes adjuntar una foto del comprobante.');
        return false;
      }
      this.paymentError.set('');
      return true;
    }

    if (metodo === 'zelle') {
      if (!referencia) {
        this.paymentError.set('Para Zelle debes ingresar número de referencia.');
        return false;
      }
      if (!data.correo?.trim()) {
        this.paymentError.set('Para Zelle debes ingresar el correo electrónico asociado.');
        return false;
      }
      this.paymentError.set('');
      return true;
    }

    if (metodo === 'pago_movil') {
      // Validar datos del titular
      if (!data.bancoEmisor?.trim()) {
        this.paymentError.set('Para Pago Móvil debes indicar el banco emisor.');
        return false;
      }
      if (!data.telefono?.trim()) {
        this.paymentError.set('Para Pago Móvil debes indicar el número de teléfono del titular.');
        return false;
      }
      if (!data.cedulaTitular?.trim()) {
        this.paymentError.set('Para Pago Móvil debes indicar la cédula del titular.');
        return false;
      }
      // Validar referencia O foto (al menos uno)
      if (!referencia && !tieneComprobante) {
        this.paymentError.set('Para Pago Móvil debes ingresar número de referencia o adjuntar el comprobante de pago.');
        return false;
      }
      this.paymentError.set('');
      return true;
    }

    if (metodo === 'transferencia') {
      // Validar datos del titular
      if (!data.bancoEmisor?.trim()) {
        this.paymentError.set('Para Transferencia debes indicar el banco emisor.');
        return false;
      }
      if (!data.cedulaTitular?.trim()) {
        this.paymentError.set('Para Transferencia debes indicar la cédula del titular.');
        return false;
      }
      // Validar referencia O foto (al menos uno)
      if (!referencia && !tieneComprobante) {
        this.paymentError.set('Para Transferencia debes ingresar número de referencia o adjuntar el comprobante de pago.');
        return false;
      }
      this.paymentError.set('');
      return true;
    }

    if (metodo === 'punto_venta') {
      // Punto de Venta no requiere foto ni referencia, solo procesa el pedido
      this.paymentError.set('');
      return true;
    }

    this.paymentError.set('');
    return true;
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
      total: this.totalWithShipping(),
      nombre: this.paymentData().nombre,
      cedula: this.paymentData().cedula,
      telefono: this.paymentData().telefono,
      direccion: this.paymentData().direccion,
      metodoPago: this.paymentData().metodoPago,
      referencia: this.paymentData().referencia,
      fotoComprobante: this.paymentData().fotoComprobante,
      bancoEmisor: this.paymentData().bancoEmisor,
      cedulaTitular: this.paymentData().cedulaTitular,
      correo: this.paymentData().correo,
      status: 'confirmar' as OrderStatus,
      deliveryType: this.deliveryType(),
      scheduledFor: this.deliveryType() === 'programado' ? this.scheduledFor() : '',
      shippingRef: this.shippingCost(),
      shippingLabel: this.getSelectedShippingRate().label,
    };

    this.ordersBackend.createOrder(orderData).subscribe({
      next: (order) => {
        this.currentOrderId.set(order.id);
        this.notificationService.success(
          'Pedido Creado',
          'Tu pedido ha sido creado exitosamente. N\u00FAmero: #' + order.id.slice(-8)
        );
      },
      error: (err) => {
        console.error('Error guardando orden:', err);
      }
    });
  }

  confirmarPedido() {
    if (!this.currentOrderId()) return;
    if (!this.validarPagoCheckout()) return;

    const items: OrderItem[] = this.state().products.map(item => ({
      productId: item.product.id,
      title: item.product.title,
      price: item.product.price,
      quantity: item.quantity,
      image: item.product.image,
    }));

    const orderData = {
      items,
      total: this.totalWithShipping(),
      nombre: this.paymentData().nombre,
      cedula: this.paymentData().cedula,
      telefono: this.paymentData().telefono,
      direccion: this.paymentData().direccion,
      metodoPago: this.paymentData().metodoPago,
      referencia: this.paymentData().referencia,
      fotoComprobante: this.paymentData().fotoComprobante,
      bancoEmisor: this.paymentData().bancoEmisor,
      cedulaTitular: this.paymentData().cedulaTitular,
      correo: this.paymentData().correo,
      status: 'pendiente' as OrderStatus,
      deliveryType: this.deliveryType(),
      scheduledFor: this.deliveryType() === 'programado' ? this.scheduledFor() : '',
      shippingRef: this.shippingCost(),
      shippingLabel: this.getSelectedShippingRate().label,
    };

    this.ordersBackend.createOrder(orderData).subscribe({
      next: (order) => {
        this.state().products.forEach(item => {
          this.state.remove(item.product.id);
        });
        this.orderPlaced.set(true);
        this.notificationService.success(
          'Pedido Confirmado',
          'Tu pedido ha sido confirmado y est\u00E1 pendiente de procesamiento'
        );
        this.currentOrderId.set('');
        // Redirigir a la página de pedidos con el ID del pedido recién creado
        this.router.navigate(['/panel/pedidos'], { queryParams: { orderId: order.id } });
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
    if (!this.validarPagoCheckout()) return;
    const items: OrderItem[] = this.state().products.map(item => ({
      productId: item.product.id,
      title: item.product.title,
      price: item.product.price,
      quantity: item.quantity,
      image: item.product.image,
    }));

    const orderData = {
      items,
      total: this.totalWithShipping(),
      nombre: this.paymentData().nombre,
      cedula: this.paymentData().cedula,
      telefono: this.paymentData().telefono,
      direccion: this.paymentData().direccion,
      metodoPago: this.paymentData().metodoPago,
      referencia: this.paymentData().referencia,
      fotoComprobante: this.paymentData().fotoComprobante,
      bancoEmisor: this.paymentData().bancoEmisor,
      cedulaTitular: this.paymentData().cedulaTitular,
      correo: this.paymentData().correo,
      deliveryType: this.deliveryType(),
      scheduledFor: this.deliveryType() === 'programado' ? this.scheduledFor() : '',
      shippingRef: this.shippingCost(),
      shippingLabel: this.getSelectedShippingRate().label,
    };

    this.ordersBackend.createOrder(orderData).subscribe({
      next: (order) => {
        console.log('Order created:', order);
        this.notificationService.success(
          'Pedido Creado',
          'Tu pedido ha sido creado exitosamente. N\u00FAmero: #' + order.id.slice(-8)
        );
        this.state().products.forEach(item => {
          this.state.remove(item.product.id);
        });
        this.orderPlaced.set(true);
        // Redirigir a la página de pedidos con el ID del pedido recién creado
        this.router.navigate(['/panel/pedidos'], { queryParams: { orderId: order.id } });
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
      try {
        this.cameraStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            console.warn('Error stopping track:', e);
          }
        });
      } catch (e) {
        console.warn('Error stopping camera stream:', e);
      }
      this.cameraStream = null;
    }
    this.showCamera.set(false);
  }

  eliminarComprobante() {
    this.paymentData.update(p => ({ ...p, fotoComprobante: '' }));
  }

   onDragOver(event: DragEvent) {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
    
    const file = event.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    
    this.processImageFile(file);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.processImageFile(file);
    input.value = '';
  }

  private processImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      this.paymentData.update(p => ({ ...p, fotoComprobante: result }));
    };
    reader.readAsDataURL(file);
  }

   enviarComprobanteWhatsApp() {
    const metodo = this.paymentMethods.find(m => m.value === this.paymentData().metodoPago)?.label || this.paymentData().metodoPago;
    const data = this.paymentData();
    const pmInfo = PAGO_MOVIL_INFO;
    
    const mensaje = `*DATOS PARA PAGO MÓVIL*\n\n` +
      `*Banco:* ${pmInfo.banco}\n` +
      `*Titular:* ${pmInfo.titular}\n` +
      `*RIF:* ${pmInfo.rif}\n` +
      `*Teléfono:* ${pmInfo.telefono}\n\n` +
      `*Monto:* $${this.price().toFixed(2)}\n` +
      `*Referencia:* ${data.referencia}\n\n` +
      `*Datos del Titular del Pago:*\n` +
      `- Banco Emisor: ${data.bancoEmisor || 'No especificado'}\n` +
      `- Teléfono Titular: ${data.telefono || 'No especificado'}\n` +
      `- Cédula Titular: ${data.cedulaTitular || 'No especificado'}\n\n` +
      `Adjunto foto del comprobante.`;

    const url = `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  get showCameraForPayment(): boolean {
    return this.showCamera() && this.checkoutStep() === 3;
  }

  ngOnDestroy() {
    this.detenerPollingQR();
    this.cerrarCamera();
    if (this.showQRModal()) {
      this.showQRModal.set(false);
    }
  }
}
