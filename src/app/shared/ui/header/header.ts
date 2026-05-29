import { Component, inject, signal, computed, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../data-access/auth.service';
import { ProductsService } from '../../../products/data-access/products.service';
import { CartStateService } from '../../data-access/cart-state.service';
import { CurrencyService } from '../../data-access/currency.service';
import { Product, ProductItemCart } from '../../../shared/interfaces/product.interface';
import { NoticiasService } from '../../data-access/noticias.service';

@Component({
  selector: 'app-header',
  imports: [FormsModule, RouterLink],
  templateUrl: './header.html',
  styleUrls: ['./header.css'],
})
export class Header implements OnInit, OnDestroy {
  authService = inject(AuthService);
  private router = inject(Router);
  private productsService = inject(ProductsService);
  private cartState = inject(CartStateService);
  private noticiasService = inject(NoticiasService);
  currencyService = inject(CurrencyService);
  cartPreviewOpen = signal(false);
  unreadCount = computed(() => this.noticiasService.userNotificaciones().filter(n => !n.leido).length);
  isAdminRoute = signal(false);

  cartCount = () => this.cartState.state().products.reduce((sum, p) => sum + p.quantity, 0);
  cartPreviewItems = () => this.cartState.state().products.slice(0, 4);
  cartPreviewTotal = () =>
    this.cartState.state().products.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  notifications = () => this.noticiasService.userNotificaciones();
  hasNotifications = () => this.noticiasService.userNotificaciones().length > 0;

  private notificationsSubscription: any;

  constructor() {
    this.productsService.getProducts().subscribe((response: any) => {
      const products = Array.isArray(response) ? response : (response?.products || []);
      this.allProducts.set(products);
    });
    this.initDarkMode();
    this.loadNotificationCount();
  }

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.loadUserNotifications();
    }
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.isAdminRoute.set(event.urlAfterRedirects.startsWith('/admin') || event.urlAfterRedirects.startsWith('/repartidor'));
      }
    });
  }

  ngOnDestroy() {
    if (this.notificationsSubscription) {
      this.notificationsSubscription.unsubscribe();
    }
  }

  private loadNotificationCount() {
    this.noticiasService.getNoticias().subscribe({
      error: (err: Error) => {
        console.error('Error loading notification count:', err);
      }
    });
  }

  private loadUserNotifications() {
    this.notificationsSubscription = this.noticiasService.getUserNotifications().subscribe({
      error: (err: Error) => {
        console.error('Error loading user notifications:', err);
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
  notificationsOpen = signal(false);
  notificationsTimer: any = null;

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
    const notifBtn = target.closest('.notification-btn');
    const notifDropdown = target.closest('.notifications-dropdown');
    if (!notifBtn && !notifDropdown) {
      this.notificationsOpen.set(false);
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

  onNotificationsEnter() {
    if (this.notificationsTimer) {
      clearTimeout(this.notificationsTimer);
      this.notificationsTimer = null;
    }
    this.notificationsOpen.set(true);
  }

  onNotificationsLeave() {
    this.notificationsTimer = setTimeout(() => {
      this.notificationsOpen.set(false);
    }, 500);
  }

  openNotifications() {
    this.notificationsOpen.set(true);
  }

  closeNotifications(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.notificationsOpen.set(false);
  }

  navigateToNoticia(id: string) {
    this.closeNotifications();
    const notificacion = this.noticiasService.userNotificaciones().find(n => n.noticiaId === id);
    if (notificacion) {
      this.noticiasService.markNotificationAsRead(notificacion.id).subscribe({
        next: () => {},
        error: (err: Error) => {
          console.error('Error marking notification as read:', err);
        }
      });
    }
    setTimeout(() => {
      this.router.navigate(['/noticias'], { fragment: id });
    }, 100);
  }

  truncateContent(content: string, length: number = 100): string {
    if (!content) return '';
    return content.length > length ? content.substring(0, length) + '...' : content;
  }

  toggleUserDropdown() {
    this.userDropdownOpen.update(v => !v);
  }

  closeUserDropdown() {
    this.userDropdownOpen.set(false);
  }

  openLogin() {
    this.router.navigate(['/login']);
  }

  openRegister() {
    this.router.navigate(['/register']);
  }
}