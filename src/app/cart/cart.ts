import { Component, inject, signal } from '@angular/core';
import { CartItem } from './ui/cart-item/cart-item';
import { CartStateService } from '../shared/data-access/cart-state.service';
import { ProductItemCart } from '../shared/interfaces/product.interface';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User, Direccion } from '../shared/data-access/auth.service';
import { OrdersBackend, OrderItem } from '../backend/data-access/orders.backend';

const CART_IMPORTS = [CartItem, CurrencyPipe, RouterLink, FormsModule];

interface PaymentData {
  nombre: string;
  cedula: string;
  telefono: string;
  direccion: string;
  metodoPago: string;
  referencia: string;
}

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
  });
  orderPlaced = signal(false);

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
    });
    this.showCheckoutModal.set(true);
    this.checkoutStep.set(1);
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
    if (this.orderPlaced()) {
      this.orderPlaced.set(false);
      this.paymentData.set({
        nombre: '',
        cedula: '',
        telefono: '',
        direccion: '',
        metodoPago: 'zelle',
        referencia: '',
      });
    }
  }

  nextStep() {
    if (this.checkoutStep() < 3) {
      this.checkoutStep.update(s => s + 1);
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
}
