import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../data-access/auth.service';
import { ProductsService } from '../../../products/data-access/products.service';
import { CartStateService } from '../../data-access/cart-state.service';
import { CurrencyService } from '../../data-access/currency.service';
import { Product, ProductItemCart } from '../../../shared/interfaces/product.interface';
import { NoticiasService } from '../../data-access/noticias.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, FormsModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css'],
})
export class Header {
  authService = inject(AuthService);
  private router = inject(Router);
  private productsService = inject(ProductsService);
  private cartState = inject(CartStateService);
  private noticiasService = inject(NoticiasService);
  currencyService = inject(CurrencyService);
  cartPreviewOpen = signal(false);
  notificationCount = signal(0);

  cartCount = () => this.cartState.state().products.reduce((sum, p) => sum + p.quantity, 0);
  cartPreviewItems = () => this.cartState.state().products.slice(0, 4);
  cartPreviewTotal = () =>
    this.cartState.state().products.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  constructor() {
      this.productsService.getProducts().subscribe((response: any) => {
        // Handle both {products: [...]} and array responses
        const products = Array.isArray(response) ? response : (response?.products || []);
        this.allProducts.set(products);
      });
      this.initDarkMode();
      this.loadNotificationCount();
    }

  private loadNotificationCount() {
    this.noticiasService.getNoticias().subscribe({
      next: (noticias) => {
        const unreadCount = noticias.filter(n => n.activa).length;
        this.notificationCount.set(unreadCount);
      },
      error: (error) => {
        console.error('Error loading notification count:', error);
      }
    });
  }

  private initDarkMode() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('escolares-dark');
      if (saved === 'true') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }
  }

  private loadSearchHistory(): string[] {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('escolares-search-history');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private saveSearchHistory(history: string[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('escolares-search-history', JSON.stringify(history));
    }
  }

  private addToSearchHistory(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    
    const current = this.searchHistory();
    const filtered = current.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
    const updated = [trimmed, ...filtered].slice(0, 10);
    this.searchHistory.set(updated);
    this.saveSearchHistory(updated);
  }

  clearSearchHistory() {
    this.searchHistory.set([]);
    this.saveSearchHistory([]);
  }

  removeFromHistory(item: string) {
    const current = this.searchHistory();
    const updated = current.filter(h => h !== item);
    this.searchHistory.set(updated);
    this.saveSearchHistory(updated);
  }

  selectFromHistory(item: string) {
    this.searchQuery = item;
    this.onSearchInput();
  }

  toggleDarkMode() {
    const current = document.documentElement.getAttribute('data-theme');
    const isDark = current === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('escolares-dark', String(!isDark));
  }

  isDarkMode(): boolean {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  mobileMenuOpen = signal(false);
  userDropdownOpen = signal(false);
  private dropdownTimer: any = null;
  private cartPreviewTimer: any = null;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.mobile-menu-btn') && !target.closest('.mobile-nav')) {
      this.mobileMenuOpen.set(false);
    }
    if (!target.closest('.user-dropdown')) {
      this.userDropdownOpen.set(false);
    }
    if (!target.closest('.header-search')) {
      this.showDropdown.set(false);
    }
  }

  onUserDropdownEnter() {
    if (this.dropdownTimer) {
      clearTimeout(this.dropdownTimer);
      this.dropdownTimer = null;
    }
    this.userDropdownOpen.set(true);
  }

  onUserDropdownLeave() {
    this.dropdownTimer = setTimeout(() => {
      this.userDropdownOpen.set(false);
    }, 500);
  }

  onCartPreviewEnter() {
    if (this.cartPreviewTimer) {
      clearTimeout(this.cartPreviewTimer);
      this.cartPreviewTimer = null;
    }
    this.cartPreviewOpen.set(true);
  }

  onCartPreviewLeave() {
    this.cartPreviewTimer = setTimeout(() => {
      this.cartPreviewOpen.set(false);
    }, 500);
  }

  isRoot(): boolean {
    return this.authService.user()?.rol === 'root';
  }

  isRepartidor(): boolean {
    return this.authService.user()?.rol === 'repartidor';
  }

  toggleCurrency() {
    this.currencyService.toggleCurrency();
  }

  formatPrice(priceInUsd: number): string {
    return this.currencyService.formatPrice(priceInUsd);
  }

  openCartPreview() {
    this.cartPreviewOpen.set(true);
  }

  closeCartPreview() {
    this.cartPreviewOpen.set(false);
  }

  hasMoreCartItems(): boolean {
    return this.cartState.state().products.length > this.cartPreviewItems().length;
  }

  getCartItemTotal(item: ProductItemCart): number {
    return item.product.price * item.quantity;
  }

  searchQuery = '';
  suggestions = signal<Product[]>([]);
  showDropdown = signal(false);
  allProducts = signal<Product[]>([]);
  selectedCategory = signal<string>('');
  searchHistory = signal<string[]>(this.loadSearchHistory());

categories = computed(() => {
     const cats = new Set<string>();
     const products = this.allProducts() || [];
     products.forEach(p => {
       if (p.category) cats.add(p.category);
     });
     return Array.from(cats).sort();
   });

  dropdownAnchor = signal<'category' | 'search' | null>(null);

  showLoginModal = signal(false);
  showRegisterModal = signal(false);
  loginUsername = signal('');
  loginPassword = signal('');
  registerUsername = signal('');
  registerEmail = signal('');
  registerPassword = signal('');
  registerConfirmPassword = signal('');
  registerNombreCompleto = signal('');
  registerGenero = signal<'hombre' | 'mujer' | 'no_especificado'>('no_especificado');
  registerTipoDocumento = signal<'cedula' | 'rif' | 'pasaporte' | 'extranjero' | 'gobierno' | 'rif_personal_natural' | 'rif_v' | 'rif_e'>('cedula');
  registerNumeroDocumento = signal('');
  registerTelefono = signal('');
  registerTelefonoPrefijo = signal('0412');
  registerDireccion = signal('');

  registerAceptaTerminos = signal(false);
  registerMayorEdad = signal(false);
  registerError = signal('');

  telefonoPrefijos = ['0412', '0414', '0424', '0416', '0426', '0434', '0251'];

  formComplete = computed(() => {
    return this.registerUsername().trim() !== '' &&
           this.registerEmail().trim() !== '' &&
           this.registerPassword().trim() !== '' &&
           this.registerConfirmPassword().trim() !== '' &&
           this.registerNumeroDocumento().trim() !== '' &&
           this.registerTelefono().trim() !== '' &&
           this.registerDireccion().trim() !== '' &&
           this.registerNombreCompleto().trim() !== '' &&
           this.registerMayorEdad() &&
           this.registerAceptaTerminos();
  });

  onSearchInput() {
    const query = this.searchQuery.toLowerCase().trim();
    if (query.length > 0 || this.selectedCategory()) {
      let filtered = this.allProducts();
      
      if (this.selectedCategory()) {
        filtered = filtered.filter((p: Product) => p.category === this.selectedCategory());
      }
      
      if (query.length > 0) {
        filtered = filtered.filter((p: Product) => p.title.toLowerCase().includes(query));
      }
      
      this.suggestions.set(filtered.slice(0, 5));
      this.dropdownAnchor.set('search');
      this.showDropdown.set(true);
    } else if (this.searchHistory().length > 0 && !this.selectedCategory()) {
      this.suggestions.set([]);
      this.dropdownAnchor.set('search');
      this.showDropdown.set(true);
    } else {
      this.suggestions.set([]);
      this.dropdownAnchor.set(null);
      this.showDropdown.set(false);
    }
  }

  selectCategory(category: string) {
    this.selectedCategory.set(category);
    this.onSearchInput();
    this.showDropdown.set(false);
  }

  toggleCategoryDropdown() {
    if (this.dropdownAnchor() === 'category') {
      this.showDropdown.set(false);
      this.dropdownAnchor.set(null);
    } else {
      this.suggestions.set([]);
      this.dropdownAnchor.set('category');
      this.showDropdown.set(true);
    }
  }

  clearCategory() {
    this.selectedCategory.set('');
    this.onSearchInput();
  }

  selectProduct(product: Product) {
    this.router.navigate(['/products'], {
      queryParams: { search: product.title },
    });
    this.showDropdown.set(false);
    this.searchQuery = '';
  }

  search() {
    const query = this.searchQuery.trim();
    if (query || this.selectedCategory()) {
      if (query) this.addToSearchHistory(query);
      
      const queryParams: any = {};
      if (query) queryParams.search = query;
      if (this.selectedCategory()) queryParams.category = this.selectedCategory();
      
      this.router.navigate(['/products'], { queryParams });
      this.showDropdown.set(false);
    }
  }

  hideDropdown() {
    setTimeout(() => {
      this.showDropdown.set(false);
    }, 300);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }

  toggleUserDropdown() {
    this.userDropdownOpen.update(v => !v);
  }

  closeUserDropdown() {
    this.userDropdownOpen.set(false);
  }

  openLogin() {
    this.showLoginModal.set(true);
    this.showRegisterModal.set(false);
  }

  openRegister() {
    this.showRegisterModal.set(true);
    this.showLoginModal.set(false);
  }

   closeModals() {
     this.showLoginModal.set(false);
     this.showRegisterModal.set(false);
     this.loginUsername.set('');
     this.loginPassword.set('');
     this.registerUsername.set('');
     this.registerEmail.set('');
     this.registerPassword.set('');
     this.registerConfirmPassword.set('');
     this.registerNumeroDocumento.set('');
     this.registerTelefono.set('');
     this.registerDireccion.set('');
     // Reset nuevos campos
     this.registerNombreCompleto.set('');
     this.registerGenero.set('no_especificado');
     this.registerTipoDocumento.set('cedula');
     this.registerTelefonoPrefijo.set('0412');
     this.registerAceptaTerminos.set(false);
     this.registerMayorEdad.set(false);
   }

  doLogin() {
    if (this.loginUsername() && this.loginPassword()) {
      this.authService.login(this.loginUsername(), this.loginPassword());
      const checkLogin = setInterval(() => {
        if (this.authService.isLoggedIn()) {
          this.closeModals();
          clearInterval(checkLogin);
        }
        if (!this.authService.loginLoading() && !this.authService.isLoggedIn()) {
          clearInterval(checkLogin);
        }
      }, 100);
    }
  }

  doRegister() {
    if (!this.registerUsername() || !this.registerEmail() || !this.registerPassword() || !this.registerNumeroDocumento() || !this.registerTelefono() || !this.registerDireccion() || !this.registerNombreCompleto()) {
      this.registerError.set('Todos los campos son requeridos');
      return;
    }
    if (!this.registerAceptaTerminos()) {
      this.registerError.set('Debes aceptar los términos y condiciones');
      return;
    }
    if (!this.registerMayorEdad()) {
      this.registerError.set('Debes confirmar que eres mayor de edad');
      return;
    }
    if (this.registerPassword() !== this.registerConfirmPassword()) {
      this.registerError.set('Las contraseñas no coinciden');
      return;
    }

     // Construir documento completo
     let documentoCompleto = '';
     const tipo = this.registerTipoDocumento();
     const numero = this.registerNumeroDocumento();

     switch (tipo) {
       case 'cedula':
         documentoCompleto = 'V-' + numero;
         break;
       case 'rif':
         documentoCompleto = 'J-' + numero; // Assuming juridica as default since Tipo de Persona was removed
         break;
       case 'rif_personal_natural':
         documentoCompleto = 'V-' + numero;
         break;
       case 'rif_v':
         documentoCompleto = 'V-' + numero;
         break;
       case 'rif_e':
         documentoCompleto = 'E-' + numero;
         break;
       case 'pasaporte':
         documentoCompleto = numero;
         break;
       case 'extranjero':
         documentoCompleto = 'E-' + numero;
         break;
       case 'gobierno':
         documentoCompleto = 'G-' + numero;
         break;
       default:
         documentoCompleto = numero;
     }

    const telefonoCompleto = this.registerTelefonoPrefijo() + '-' + this.registerTelefono();

     this.authService.register(this.registerUsername(), this.registerEmail(), this.registerPassword(), {
       rif: documentoCompleto,
       telefono: telefonoCompleto,
       direccion: this.registerDireccion(),
       nombreCompleto: this.registerNombreCompleto(),
       genero: this.registerGenero(),
       tipoDocumento: this.registerTipoDocumento(),
       numeroDocumento: this.registerNumeroDocumento(),
     });
    const checkRegister = setInterval(() => {
      if (this.authService.registerSuccess()) {
        this.closeModals();
        this.openLogin();
        clearInterval(checkRegister);
      }
    }, 100);
  }
}
