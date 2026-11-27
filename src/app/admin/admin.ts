import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../shared/data-access/auth.service';
import { ApiKeyStatusService } from '../shared/data-access/api-key-status.service';
import { RolesBackend } from '../backend/data-access/roles.backend';
import { TasaResponse } from '../shared/data-access/currency.service';

interface MenuItem {
  label: string;
  route: string;
  permiso?: string;
  soloRoot?: boolean;
}

interface QuickItem {
  label: string;
  route: string;
  icon: string;
  permiso?: string;
}

interface MenuCategory {
  name: string;
  icon: string;
  items: MenuItem[];
}

interface SearchResult {
  label: string;
  route: string;
  category: string;
}

const QUICK_ITEMS: QuickItem[] = [
  { label: 'Pedidos', route: 'pedidos', icon: 'orders', permiso: 'pedidos_ver' },
  { label: 'Registro', route: 'registro', icon: 'registro', permiso: 'facturas_registrar' },
  { label: 'Chat', route: 'chat', icon: 'chat', permiso: 'chat_ver' },
  { label: 'Productos', route: 'productos', icon: 'products', permiso: 'productos_gestionar' },
  { label: 'Usuarios', route: 'usuarios', icon: 'users', permiso: 'usuarios_gestionar' },
  { label: 'Cotizaciones', route: 'cotizaciones', icon: 'quotes', permiso: 'cotizaciones_gestionar' },
  { label: 'Créditos', route: 'creditos-verificaciones', icon: 'credits', permiso: 'creditos_gestionar' },
  { label: 'WhatsApp', route: 'whatsapp', icon: 'whatsapp', permiso: 'whatsapp_gestionar' },
];

const DEFAULT_CATEGORIAS: MenuCategory[] = [
  {
    name: 'Panel Admin',
    icon: 'admin',
    items: [
      { label: 'Pedidos', route: 'pedidos', permiso: 'pedidos_ver' },
      { label: 'Registro', route: 'registro', permiso: 'facturas_registrar' },
      { label: 'Cotizaciones', route: 'cotizaciones', permiso: 'cotizaciones_gestionar' },
      { label: 'Chat', route: 'chat', permiso: 'chat_ver' },
      { label: 'Repartidores', route: 'repartidores', permiso: 'repartidores_gestionar' },
      { label: 'Estadísticas', route: 'estadisticas', permiso: 'estadisticas_ver' },
    ],
  },
  {
    name: 'Panel Web',
    icon: 'web',
    items: [
      { label: 'Inicio', route: 'inicio-gestion', permiso: 'inicio_gestionar' },
      { label: 'Productos', route: 'productos', permiso: 'productos_gestionar' },
      { label: 'Categorías de Productos', route: 'producto-categorias', permiso: 'productos_gestionar' },
      { label: 'Marcas', route: 'marcas', permiso: 'marcas_gestionar' },
      { label: 'Líneas', route: 'lineas', permiso: 'lineas_gestionar' },
      { label: 'Ofertas', route: 'ofertas', permiso: 'ofertas_ver' },
      { label: 'Noticias', route: 'noticias', permiso: 'noticias_gestionar' },
      { label: 'Manuales', route: 'manuales', permiso: 'manuales_ver' },
      { label: 'Redes Sociales', route: 'redes-sociales', permiso: 'redes_sociales_gestionar' },
    ],
  },
  {
    name: 'Repartidor',
    icon: 'delivery',
    items: [{ label: 'Mis Pedidos', route: 'repartidor' }],
  },
  {
    name: 'Seguridad',
    icon: 'security',
    items: [
      { label: 'Usuarios', route: 'usuarios', permiso: 'usuarios_gestionar' },
      { label: 'Roles', route: 'roles', permiso: 'roles_gestionar' },
      { label: 'Control de Sesiones', route: 'sesiones', permiso: 'sesiones_gestionar' },
      { label: 'Contraseñas', route: 'contrasenas', soloRoot: true },
    ],
  },
  {
    name: 'Empresas',
    icon: 'business',
    items: [
      { label: 'Clientes', route: 'clientes' },
      { label: 'Lista Negra', route: 'lista-negra' },
      { label: 'WhatsApp', route: 'whatsapp', permiso: 'whatsapp_gestionar' },
    ],
  },
  {
    name: 'Créditos Escolares',
    icon: 'credits',
    items: [
      { label: 'Verificaciones', route: 'creditos-verificaciones', permiso: 'creditos_gestionar' },
      { label: 'Reportes', route: 'creditos-reportes', permiso: 'creditos_gestionar' },
      { label: 'Registrar Compra', route: 'creditos-registrar-compra', permiso: 'creditos_gestionar' },
      { label: 'Asignar Compra', route: 'creditos-asignar-compra', soloRoot: true },
      { label: 'Verificar Pagos', route: 'creditos-verificar-pagos', permiso: 'creditos_gestionar' },
      { label: 'Eliminación de cuentas', route: 'creditos-eliminaciones', permiso: 'creditos_gestionar' },
      { label: 'Centro de Ayuda', route: 'creditos-tickets', permiso: 'creditos_gestionar' },
      { label: 'Restablecer contraseñas', route: 'creditos-restablecimientos', permiso: 'creditos_gestionar' },
      { label: 'Ampliar Crédito', route: 'creditos-ampliar-credito', permiso: 'creditos_gestionar' },
      { label: 'Ubicación de Clientes', route: 'creditos-ubicaciones', permiso: 'creditos_gestionar' },
      { label: 'Solicitudes de Crédito', route: 'creditos-solicitudes', permiso: 'creditos_gestionar' },
      { label: 'Productos', route: 'creditos-productos', permiso: 'creditos_gestionar' },
      { label: 'Reglas', route: 'creditos-reglas', permiso: 'creditos_gestionar' },
    ],
  },
];

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin implements OnInit, OnDestroy {
  authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);
  apiKeyStatusService = inject(ApiKeyStatusService);
  private rolesBackend = inject(RolesBackend);

  userPermissions = signal<string[]>([]);
  apiKeyStatusLoaded = signal(false);
  categorias = signal<MenuCategory[]>([]);
  quickItems = signal<QuickItem[]>([]);
  quickAccessOpen = signal(false);
  categoriaExpandida = signal<string | null>(null);
  mobileNavOpen = signal(false);
  searchQuery = signal('');
  currentUrl = signal(this.router.url);

  private navSub?: Subscription;

  readonly visibleCategorias = computed(() => {
    return this.categorias()
      .map((cat) => ({ ...cat, items: this.getVisibleItems(cat.items) }))
      .filter((cat) => cat.items.length > 0);
  });

  readonly searchResults = computed<SearchResult[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return [];
    const results: SearchResult[] = [];
    for (const cat of this.visibleCategorias()) {
      for (const item of cat.items) {
        const haystack = `${item.label} ${cat.name}`.toLowerCase();
        if (haystack.includes(q)) results.push({ label: item.label, route: item.route, category: cat.name });
      }
    }
    return results.slice(0, 12);
  });

  readonly activeCategory = computed(() => {
    const url = this.currentUrl();
    for (const cat of this.visibleCategorias()) {
      if (cat.items.some((item) => url.startsWith(`/admin/${item.route}`))) return cat.name;
    }
    return null;
  });

  readonly expandedCategory = computed(() => {
    const name = this.categoriaExpandida();
    if (!name) return null;
    return this.visibleCategorias().find((c) => c.name === name) || null;
  });

  ngOnInit() {
    this.checkApiKeyStatus();
    this.loadUserPermissions();
    this.navSub = this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      this.currentUrl.set(e.urlAfterRedirects);
      this.closePanels();
    });
  }

  ngOnDestroy() {
    this.navSub?.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    const insideSideboard = target?.closest('.sideboard-panel');
    const insideTrigger = target?.closest('[data-sideboard-trigger]');
    const insideSidebar = target?.closest('.admin-sidebar');
    if (!insideSideboard && !insideTrigger && !insideSidebar && (this.categoriaExpandida() || this.quickAccessOpen())) {
      this.closePanels();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.searchQuery()) { this.searchQuery.set(''); return; }
    if (this.quickAccessOpen() || this.categoriaExpandida() || this.mobileNavOpen()) this.closePanels();
  }

  setQuickItems() {
    const user = this.authService.user();
    const isRoot = user?.rol === 'root' || user?.rol === 'admin';
    const permissions = this.userPermissions();
    this.quickItems.set(
      QUICK_ITEMS.filter((item) => {
        if (!item.permiso) return true;
        if (isRoot) return true;
        return permissions.includes(item.permiso);
      }),
    );
  }

  loadUserPermissions() {
    const user = this.authService.user();
    if (!user) { this.setCategories(); this.setQuickItems(); return; }

    if (user.rol === 'root' || user.rol === 'admin') {
      this.rolesBackend.getPermisos().subscribe({
        next: (permisos) => { this.userPermissions.set(permisos.map((p) => p.id)); this.setCategories(); this.setQuickItems(); },
        error: () => { this.userPermissions.set([]); this.setCategories(); this.setQuickItems(); },
      });
    } else if (user.rolId) {
      this.rolesBackend.getRol(user.rolId).subscribe({
        next: (rol) => { this.userPermissions.set(rol.permisos || []); this.setCategories(); this.setQuickItems(); },
        error: () => { this.userPermissions.set([]); this.setCategories(); this.setQuickItems(); },
      });
    } else {
      this.setCategories();
      this.setQuickItems();
    }
  }

  setCategories() {
    const user = this.authService.user();
    const isRepartidor = user?.rol === 'repartidor';
    this.categorias.set(DEFAULT_CATEGORIAS.filter((cat) => !isRepartidor || cat.name === 'Repartidor').map((cat) => ({ ...cat })));
  }

  toggleQuickAccess() {
    const next = !this.quickAccessOpen();
    this.closeCategoriaSideboard();
    this.quickAccessOpen.set(next);
  }

  toggleCategoria(nombre: string) {
    const next = this.categoriaExpandida() === nombre ? null : nombre;
    this.quickAccessOpen.set(false);
    this.categoriaExpandida.set(next);
  }

  closeQuickAccess() { this.quickAccessOpen.set(false); }
  closeCategoriaSideboard() { this.categoriaExpandida.set(null); }
  closePanels() { this.quickAccessOpen.set(false); this.categoriaExpandida.set(null); this.mobileNavOpen.set(false); }

  toggleMobileNav() { this.mobileNavOpen.update((v) => !v); if (!this.mobileNavOpen()) this.closePanels(); }

  onSearchInput(value: string) {
    this.searchQuery.set(value);
    if (value.trim()) { this.quickAccessOpen.set(false); this.categoriaExpandida.set(null); }
  }

  clearSearch() { this.searchQuery.set(''); }

  navigateFromSearch(route: string) {
    this.clearSearch();
    this.closePanels();
    this.router.navigate(['/admin', route]);
  }

  hasPermission(permiso?: string): boolean {
    const user = this.authService.user();
    if (!user) return false;
    if (user.rol === 'root') return true;
    if (!permiso) return true;
    return this.userPermissions().includes(permiso);
  }

  checkApiKeyStatus() {
    this.http.get<TasaResponse>('/api/tasas').subscribe({
      next: (data) => { if (data.apiKeyExpired) this.apiKeyStatusService.setApiKeyExpired(true); this.apiKeyStatusLoaded.set(true); },
      error: (err) => { if (err.error?.apiKeyExpired) this.apiKeyStatusService.setApiKeyExpired(true); this.apiKeyStatusLoaded.set(true); },
    });
  }

  isRoot(): boolean { return this.authService.user()?.rol === 'root'; }

  getVisibleItems(items: MenuItem[]): MenuItem[] {
    const isRoot = this.isRoot();
    return items.filter((item) => {
      if (item.soloRoot && !isRoot) return false;
      if (!item.permiso) return true;
      return this.hasPermission(item.permiso);
    });
  }

  isRouteActive(route: string): boolean {
    return this.currentUrl().startsWith(`/admin/${route}`);
  }

  logout() { this.authService.logout(); }
}
