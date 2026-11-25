import { Component, inject, signal, OnDestroy, computed } from '@angular/core';
import { CartItem } from './ui/cart-item/cart-item';
import { CartStateService } from '../shared/data-access/cart-state.service';
import { ProductItemCart } from '../shared/interfaces/product.interface';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../shared/data-access/auth.service';
import { User, Direccion, MetodoPago } from '../backend/models';
import { OrdersBackend, OrderItem, OrderStatus } from '../backend/data-access/orders.backend';
import { NotificationService } from '../shared/data-access/notification.service';
import { NotificationModalService } from '../shared/ui/notification-modal/notification-modal.service';
import { CurrencyService } from '../shared/data-access/currency.service';
import { StoreSettingsService } from '../shared/data-access/store-settings.service';
import { ProductsStateService } from '../products/data-access/products-state.service';
import { Subscription } from 'rxjs';

const CART_IMPORTS = [CartItem, RouterLink, FormsModule];

interface PaymentData {
  nombre: string;
  cedula: string;
  telefono: string;
  direccion: string;
  direccionCompleta?: string;
  placeId?: string;
  latitud?: number;
  longitud?: number;
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
   private notificationModal = inject(NotificationModalService);
   private http = inject(HttpClient);
   currencyService = inject(CurrencyService);
   storeSettings = inject(StoreSettingsService);
   private router = inject(Router);
   private productsState = inject(ProductsStateService);

   // Saved for later products
   savedForLater = signal<ProductItemCart['product'][]>(this.loadSavedForLater());

   private loadSavedForLater(): ProductItemCart['product'][] {
     if (typeof window !== 'undefined') {
       try {
         const saved = localStorage.getItem('escolares-saved-for-later');
         return saved ? JSON.parse(saved) : [];
       } catch {
         return [];
       }
     }
     return [];
   }

   private saveSavedForLater(products: ProductItemCart['product'][]) {
     if (typeof window !== 'undefined') {
       localStorage.setItem('escolares-saved-for-later', JSON.stringify(products));
     }
   }

   saveForLater(product: ProductItemCart['product']) {
     const current = this.savedForLater();
     if (!current.find(p => p.id === product.id)) {
       const updated = [...current, product];
       this.savedForLater.set(updated);
       this.saveSavedForLater(updated);
     }
     this.state.remove(product.id);
     this.notificationService.success(
       'Guardado para más tarde',
       `${product.title} se ha guardado para comprar después`
     );
   }

   moveToCart(product: ProductItemCart['product']) {
     const current = this.savedForLater();
     const updated = current.filter(p => p.id !== product.id);
     this.savedForLater.set(updated);
     this.saveSavedForLater(updated);
     this.state.add({ product, quantity: 1 });
     this.notificationService.success(
       'Producto agregado',
       `${product.title} se ha agregado al carrito`
     );
   }

   removeFromSaved(productId: string | number) {
     const current = this.savedForLater();
     const updated = current.filter(p => p.id !== productId);
     this.savedForLater.set(updated);
     this.saveSavedForLater(updated);
   }

constructor() {
     // Trigger product loading for recommendations
     this.productsState.loadProducts();
   }

// Recommended products for last-minute addition (excludes products already in cart)
   recommendedProducts = computed(() => {
     const allProducts = this.productsState.allProducts() || [];
     const cartProducts = this.state().products || [];
     const cartProductIds = new Set(cartProducts.map(p => p.product.id));
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
   submitting = signal(false);
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

  showCamera = signal(false);
  videoElement: HTMLVideoElement | null = null;
  cameraStream: MediaStream | null = null;
  whatsappNumber = '584244077616';

  showAddressModal = signal(false);
  showAddAddressModal = signal(false);
  showAddressSavedModal = signal(false);

  getPagoMovilInfo() {
    return PAGO_MOVIL_INFO;
  }

  getTransferenciaInfo() {
    return TRANSFERENCIA_INFO;
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

  selectPaymentMethod(method: string) {
    this.paymentData.update(p => ({ ...p, metodoPago: method }));
  }

  shippingRates: ShippingRate[] = [
    { id: 'rate-0', label: 'Propina - Ref 0.00', ref: 0.0 },
    { id: 'rate-05', label: 'Propina - Ref 0.50', ref: 0.5 },
    { id: 'rate-10-a', label: 'Propina - Ref 1.00', ref: 1.0 },
    { id: 'rate-15', label: 'Propina - Ref 1.50', ref: 1.5 },
    { id: 'rate-20', label: 'Propina - Ref 2.00', ref: 2.0 },
  ];

price = () => {
     const products = this.state().products || [];
     return products.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
   };

   shippingCost = () => this.getSelectedShippingRate().ref;

   totalWithShipping = () => this.price() + this.shippingCost();

   ivaTotal = () => {
     const products = this.state().products || [];
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

  openCheckout() {
    if (this.storeSettings.comprasDeshabilitadas()) {
      this.notificationModal.warning('Las compras están temporalmente deshabilitadas. Por favor intenta más tarde.', 'Compras deshabilitadas');
      return;
    }

    const products = this.state().products;
    
    // Always show recommendations modal first if there are products in cart
    if (products.length > 0) {
      this.showRecommendationsModal.set(true);
      this._pendingCheckout = true;
      return;
    }

    this.startCheckout();
  }

  private _pendingCheckout = false;

  closeRecommendationsModal() {
    this.showRecommendationsModal.set(false);
    if (this._pendingCheckout) {
      this._pendingCheckout = false;
      this.startCheckout();
    }
  }

  private checkoutAttemptId = signal('');

  private startCheckout() {
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
      direccionCompleta: defaultAddress?.direccion || currentUser?.direccion || '',
      placeId: defaultAddress?.placeId || '',
      latitud: defaultAddress?.latitud,
      longitud: defaultAddress?.longitud,
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
    this.paymentError.set('');
    this.selectedShippingRateId.set('rate-0');
    this.deliveryType.set('express');
    this.scheduledFor.set('');
    this.orderPlaced.set(false);
    this.submitting.set(false);
    this.checkoutAttemptId.set(crypto.randomUUID());
    this.loadCheckoutDraft();
    setTimeout(() => (document.querySelector('.checkout-modal') as HTMLElement | null)?.focus(), 0);
  }

  onAddressChange(addressId: string) {
    this.selectedAddressId.set(addressId);
    const selected = this.userAddresses.find(a => a.id === addressId);
    if (selected) {
      this.paymentData.update(p => ({
        ...p,
        direccion: selected.direccion,
        direccionCompleta: selected.direccion || p.direccionCompleta,
        placeId: selected.placeId || '',
        latitud: selected.latitud,
        longitud: selected.longitud
      }));
    }
  }

  onSavedPaymentChange(paymentId: string) {
    this.selectedSavedPaymentId.set(paymentId);
    const selected = this.userPaymentMethods.find((m) => m.id === paymentId);
    if (selected) {
      this.paymentData.update(p => ({
        ...p,
        metodoPago: selected.tipo,
        referencia: selected.referencia || p.referencia
      }));
    }
  }

  guardarMetodoPagoActual() {
    if (!this.authService.isLoggedIn()) {
      this.notificationModal.warning('Debes iniciar sesión para guardar métodos de pago.', 'Inicio de sesión requerido');
      return;
    }
    const data = this.paymentData();
    const tipo = data.metodoPago as MetodoPago['tipo'];
    if (tipo === 'pago_movil' || tipo === 'transferencia') {
      this.notificationModal.info('Para guardar Pago Móvil o Transferencia, usa "Mis métodos de pago" y completa banco/teléfono/número de cuenta.', 'Usa Mis métodos de pago');
      return;
    }
    const existing = this.userPaymentMethods;
    const nuevoMetodo: MetodoPago = {
      id: crypto.randomUUID(),
      alias: tipo === 'zelle' ? 'Zelle' : 'Efectivo',
      tipo: data.metodoPago as MetodoPago['tipo'],
      referencia: data.referencia,
      principal: existing.length === 0,
    };
    this.authService.updateProfile({
      metodosPago: [...existing, nuevoMetodo],
    })?.subscribe({
      next: () => {
        this.selectedSavedPaymentId.set(nuevoMetodo.id);
        this.notificationService.success('Método guardado', 'Método de pago guardado correctamente.');
      },
      error: (err) => this.notificationModal.fromHttpError(err, 'No se pudo guardar el método de pago.'),
    });
  }

  toggleAddAddress() {
    this.showAddAddressModal.set(true);
    this.newAddressNombre = '';
    this.newAddressDireccion = '';
  }

  async addNewAddress() {
    if (!this.newAddressNombre || !this.newAddressDireccion) {
      this.notificationModal.warning('Por favor completa todos los campos de la dirección.', 'Datos incompletos');
      return;
    }
    if (!this.authService.isLoggedIn()) {
      this.notificationModal.warning('Debes iniciar sesión para guardar una dirección.', 'Inicio de sesión requerido');
      return;
    }
    const newDir: Direccion = {
      id: Date.now().toString(),
      nombre: this.newAddressNombre,
      direccion: this.newAddressDireccion,
    };
    const currentUser = this.authService.user();
    const currentAddresses = currentUser?.direcciones || [];
    this.authService.updateProfile({ direcciones: [...currentAddresses, newDir] })?.subscribe({
      next: () => {
        this.selectedAddressId.set(newDir.id);
        this.paymentData.update(p => ({ ...p, direccion: newDir.direccion, direccionCompleta: newDir.direccion }));
        this.showAddAddressModal.set(false);
        this.showAddressSavedModal.set(true);
        this.newAddressNombre = '';
        this.newAddressDireccion = '';
      },
      error: (err) => this.notificationModal.fromHttpError(err, 'No se pudo guardar la dirección.'),
    });
  }

  closeCheckout() {
    if (this.submitting()) return;
    this.saveCheckoutDraft();
    this.showCheckoutModal.set(false);
    this.showAddAddress.set(false);
    this.selectedAddressId.set('');
    this.newAddressNombre = '';
    this.newAddressDireccion = '';
    this.checkoutStep.set(1);
    this.paymentError.set('');
    this.shippingError.set('');
    if (this.orderPlaced()) {
      this.orderPlaced.set(false);
      this.paymentData.set({ nombre: '', cedula: '', telefono: '', direccion: '', metodoPago: 'pago_movil', referencia: '', fotoComprobante: '', bancoEmisor: '', cedulaTitular: '', correo: '' });
    }
  }

  nextStep() {
    if (this.checkoutStep() === 1) {
      if (!this.authService.isLoggedIn()) {
        this.notificationModal.warning('Debes iniciar sesión para continuar con la compra.', 'Inicio de sesión requerido');
        this.router.navigate(['/login']);
        return;
      }
      const data = this.paymentData();
      if (!data.nombre?.trim() || !data.cedula?.trim() || !data.telefono?.trim()) {
        this.notificationModal.warning('Completa tus datos de cliente antes de continuar.', 'Datos incompletos');
        return;
      }
    }
    if (this.checkoutStep() === 2) {
      if (!this.validateShippingStep()) return;
      if (!this.paymentData().direccion?.trim()) {
        this.shippingError.set('Debes seleccionar o agregar una dirección de envío.');
        return;
      }
    }
    if (this.checkoutStep() < 3) this.checkoutStep.update(s => s + 1);
    this.saveCheckoutDraft();
  }

  private checkoutDraftKey = 'checkout_draft_v1';

  private saveCheckoutDraft() {
    try {
      sessionStorage.setItem(this.checkoutDraftKey, JSON.stringify({
        paymentData: this.paymentData(), selectedAddressId: this.selectedAddressId(), selectedSavedPaymentId: this.selectedSavedPaymentId(),
        deliveryType: this.deliveryType(), scheduledFor: this.scheduledFor(), shippingRateId: this.selectedShippingRateId(), step: this.checkoutStep(),
      }));
    } catch {}
  }
  private loadCheckoutDraft() {
    try {
      const raw = sessionStorage.getItem(this.checkoutDraftKey);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d?.paymentData) this.paymentData.set({ ...this.paymentData(), ...d.paymentData });
      if (d?.selectedAddressId) this.selectedAddressId.set(d.selectedAddressId);
      if (d?.selectedSavedPaymentId) this.selectedSavedPaymentId.set(d.selectedSavedPaymentId);
      if (d?.deliveryType) this.deliveryType.set(d.deliveryType);
      if (d?.scheduledFor) this.scheduledFor.set(d.scheduledFor);
      if (d?.shippingRateId) this.selectedShippingRateId.set(d.shippingRateId);
      if (d?.step) this.checkoutStep.set(Math.min(3, Math.max(1, Number(d.step) || 1)));
    } catch {}
  }
  private clearCheckoutDraft() { try { sessionStorage.removeItem(this.checkoutDraftKey); } catch {} }

  private validarPagoCheckout(): boolean {
    const data = this.paymentData();
    const metodo = data.metodoPago;
    const referencia = (data.referencia || '').trim();
    const tieneComprobante = !!data.fotoComprobante;
    const fail = (msg: string) => { this.paymentError.set(msg); this.notificationModal.warning(msg, 'Datos de pago incompletos'); return false; };

    if (metodo === 'efectivo') {
      if (!tieneComprobante) return fail('Para pago en efectivo debes adjuntar una foto del comprobante.');
      this.paymentError.set(''); return true;
    }
    if (metodo === 'zelle') {
      if (!referencia) return fail('Para Zelle debes ingresar número de referencia.');
      if (!data.correo?.trim()) return fail('Para Zelle debes ingresar el correo electrónico asociado.');
      this.paymentError.set(''); return true;
    }
    if (metodo === 'pago_movil') {
      if (!data.bancoEmisor?.trim()) return fail('Para Pago Móvil debes indicar el banco emisor.');
      if (!data.telefono?.trim()) return fail('Para Pago Móvil debes indicar el número de teléfono del titular.');
      if (!data.cedulaTitular?.trim()) return fail('Para Pago Móvil debes indicar la cédula del titular.');
      if (!referencia && !tieneComprobante) return fail('Para Pago Móvil debes ingresar número de referencia o adjuntar el comprobante.');
      this.paymentError.set(''); return true;
    }
    if (metodo === 'transferencia') {
      if (!data.bancoEmisor?.trim()) return fail('Para Transferencia debes indicar el banco emisor.');
      if (!data.cedulaTitular?.trim()) return fail('Para Transferencia debes indicar la cédula del titular.');
      if (!referencia && !tieneComprobante) return fail('Para Transferencia debes ingresar número de referencia o adjuntar el comprobante.');
      this.paymentError.set(''); return true;
    }
    this.paymentError.set('');
    return true;
  }

  private buildOrderData(status: OrderStatus) {
    const products = this.state().products || [];
    const data = this.paymentData();
    const items: OrderItem[] = products.map(item => ({
      productId: item.product.id,
      title: item.product.title,
      price: item.product.price,
      quantity: item.quantity,
      image: item.product.image,
    }));
    return {
      items,
      total: this.totalWithShipping(),
      nombre: data.nombre,
      cedula: data.cedula,
      telefono: data.telefono,
      direccion: data.direccion,
      direccionCompleta: data.direccionCompleta || data.direccion,
      placeId: data.placeId || '',
      latitud: data.latitud,
      longitud: data.longitud,
      metodoPago: data.metodoPago,
      paymentStatus: (data.metodoPago === 'efectivo' ? 'contra_entrega' : 'pendiente') as 'pendiente'|'pagado'|'contra_entrega'|'fallido',
      referencia: data.referencia,
      fotoComprobante: data.fotoComprobante,
      bancoEmisor: data.bancoEmisor,
      cedulaTitular: data.cedulaTitular,
      correo: data.correo || this.userEmail,
      status,
      deliveryType: this.deliveryType(),
      scheduledFor: this.deliveryType() === 'programado' ? this.scheduledFor() : '',
      shippingRef: this.shippingCost(),
      shippingLabel: this.getSelectedShippingRate().label,
      idempotencyKey: this.checkoutAttemptId(),
    };
  }

  async confirmarPedido() {
    if (this.submitting()) return;
    if (!this.authService.isLoggedIn()) {
      this.notificationModal.warning('Debes iniciar sesión para confirmar tu pedido.', 'Inicio de sesión requerido');
      this.router.navigate(['/login']);
      return;
    }
    const products = this.state().products || [];
    if (products.length === 0) {
      this.notificationModal.warning('Tu carrito está vacío.', 'Carrito vacío');
      return;
    }
    if (!this.validateShippingStep()) { this.checkoutStep.set(2); return; }
    if (!this.validarPagoCheckout()) return;

    const ok = await this.notificationModal.confirm({
      titulo: 'Confirmar pedido',
      mensaje: '¿Deseas confirmar este pedido? Verifica que los datos de envío y pago sean correctos.',
      confirmarTexto: 'Confirmar pedido',
      cancelarTexto: 'Revisar',
      tipo: 'info',
    });
    if (!ok) return;

    this.submitting.set(true);
    const orderData = this.buildOrderData('pendiente');
    this.ordersBackend.createOrder(orderData).subscribe({
      next: (order) => {
        this.submitting.set(false);
        this.state.clear();
        this.clearCheckoutDraft();
        this.orderPlaced.set(true);
        this.notificationService.success('Pedido confirmado', `Tu pedido #${order.id.slice(-8)} fue creado correctamente.`);
        this.showCheckoutModal.set(false);
        this.router.navigate(['/panel/pedidos'], { queryParams: { orderId: order.id } });
      },
      error: (err) => {
        this.submitting.set(false);
        const details = Array.isArray(err?.error?.details) ? err.error.details.map((d: any) => d?.message || d?.title || JSON.stringify(d)) : [];
        const msg = err?.error?.error || 'No se pudo confirmar el pedido. Intenta de nuevo.';
        this.notificationModal.error(msg, 'No se pudo confirmar el pedido', details);
      }
    });
  }

  prevStep() {
    if (this.submitting()) return;
    if (this.checkoutStep() > 1) this.checkoutStep.update(s => s - 1);
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
      this.notificationModal.error('No se pudo acceder a la cámara.', 'Cámara no disponible');
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
      `*Método de pago:* ${metodo}\n` +
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
    this.cerrarCamera();
  }
}