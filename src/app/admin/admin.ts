import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../shared/data-access/auth.service';
import { ApiKeyStatusService } from '../shared/data-access/api-key-status.service';
import { RolesBackend } from '../backend/data-access/roles.backend';
import { NotificationModalService } from '../shared/ui/notification-modal/notification-modal.service';
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
  items: MenuItem[];
}

const QUICK_ITEMS: QuickItem[] = [
  { label: 'Pedidos', route: 'pedidos', icon: '📦', permiso: 'pedidos_ver' },
  { label: 'Registro', route: 'registro', icon: '📝', permiso: 'facturas_registrar' },
  { label: 'Chat', route: 'chat', icon: '💬', permiso: 'chat_ver' },
  { label: 'Productos', route: 'productos', icon: '🛍️', permiso: 'productos_gestionar' },
  { label: 'Usuarios', route: 'usuarios', icon: '👤', permiso: 'usuarios_gestionar' },
  { label: 'Roles', route: 'roles', icon: '🔑', permiso: 'roles_gestionar' },
  { label: 'Cotizaciones', route: 'cotizaciones', icon: '📄', permiso: 'cotizaciones_gestionar' },
  { label: 'Sesiones', route: 'sesiones', icon: '🖥️', permiso: 'sesiones_gestionar' },
  { label: 'WhatsApp', route: 'whatsapp', icon: '📱', permiso: 'whatsapp_gestionar' },
];

const DEFAULT_CATEGORIAS: MenuCategory[] = [
  {
    name: 'Panel Admin',
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
    items: [{ label: 'Mis Pedidos', route: 'repartidor' }],
  },
  {
    name: 'Seguridad',
    items: [
      { label: 'Usuarios', route: 'usuarios', permiso: 'usuarios_gestionar' },
      { label: 'Roles', route: 'roles', permiso: 'roles_gestionar' },
      { label: 'Control de Sesiones', route: 'sesiones', permiso: 'sesiones_gestionar' },
      { label: 'Contraseñas', route: 'contrasenas', soloRoot: true },
    ],
  },
  {
    name: 'Empresas',
    items: [
      { label: 'Clientes', route: 'clientes' },
      { label: 'Lista Negra', route: 'lista-negra' },
      { label: 'WhatsApp', route: 'whatsapp', permiso: 'whatsapp_gestionar' },
    ],
  },
  {
    name: 'Créditos Escolares',
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
  imports: [RouterLink, RouterOutlet],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin implements OnInit {
  authService = inject(AuthService);
  private http = inject(HttpClient);
  apiKeyStatusService = inject(ApiKeyStatusService);
  private rolesBackend = inject(RolesBackend);
  private notificationModal = inject(NotificationModalService);

  userPermissions = signal<string[]>([]);
  apiKeyStatusLoaded = signal(false);
  categorias = signal<MenuCategory[]>([]);
  quickItems = signal<QuickItem[]>([]);
  quickAccessOpen = signal(false);
  categoriaExpandida = signal<string | null>(null);

  ngOnInit() {
    this.checkApiKeyStatus();
    this.loadUserPermissions();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    const categoriaSideboard = target?.closest('.categoria-sideboard-menu');
    const categoriaHeader = target?.closest('.categoria-header');
    if (!categoriaSideboard && !categoriaHeader && this.categoriaExpandida()) {
      this.closeCategoriaSideboard();
    }
  }

  setQuickItems() {
    const user = this.authService.user();
    const isRoot = user?.rol === 'root' || user?.rol === 'admin';
    const permissions = this.userPermissions();

    const items = QUICK_ITEMS.filter((item) => {
      if (!item.permiso) return true;
      if (isRoot) return true;
      return permissions.includes(item.permiso);
    });
    this.quickItems.set(items);
  }

  loadUserPermissions() {
    const user = this.authService.user();
    if (!user) {
      this.setCategoriesWithExpanded();
      this.setQuickItems();
      return;
    }

    if (user.rol === 'root' || user?.rol === 'admin') {
      this.rolesBackend.getPermisos().subscribe({
        next: (permisos) => {
          this.userPermissions.set(permisos.map((p) => p.id));
          this.setCategoriesWithExpanded();
          this.setQuickItems();
        },
        error: (err) => {
          console.error('Error cargando permisos (root):', err);
          this.userPermissions.set([]);
          this.setCategoriesWithExpanded();
          this.setQuickItems();
        },
      });
    } else if (user.rolId) {
      this.rolesBackend.getRol(user.rolId).subscribe({
        next: (rol) => {
          this.userPermissions.set(rol.permisos || []);
          this.setCategoriesWithExpanded();
          this.setQuickItems();
        },
        error: (err) => {
          console.error('Error cargando rol:', err);
          this.userPermissions.set([]);
          this.setCategoriesWithExpanded();
          this.setQuickItems();
        },
      });
    } else {
      this.setCategoriesWithExpanded();
      this.setQuickItems();
    }
  }

  setCategoriesWithExpanded() {
    const user = this.authService.user();
    const isRepartidor = user?.rol === 'repartidor';

    const categories = DEFAULT_CATEGORIAS
      .filter((cat) => !isRepartidor || cat.name === 'Repartidor')
      .map((cat) => ({ ...cat }));
    this.categorias.set(categories);
  }

  toggleQuickAccess() {
    this.quickAccessOpen.update((v) => !v);
  }

  closeQuickAccess() {
    this.quickAccessOpen.set(false);
  }

  toggleCategoria(nombre: string) {
    this.categoriaExpandida.update((v) => (v === nombre ? null : nombre));
  }

  closeCategoriaSideboard() {
    this.categoriaExpandida.set(null);
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
      next: (data) => {
        if (data.apiKeyExpired) {
          this.apiKeyStatusService.setApiKeyExpired(true);
        }
        this.apiKeyStatusLoaded.set(true);
      },
      error: (err) => {
        console.error('Error checking API key status:', err);
        if (err.error?.apiKeyExpired) {
          this.apiKeyStatusService.setApiKeyExpired(true);
        }
        this.apiKeyStatusLoaded.set(true);
      },
    });
  }

  isRoot(): boolean {
    return this.authService.user()?.rol === 'root';
  }

  getVisibleItems(items: MenuItem[]): MenuItem[] {
    const isRoot = this.isRoot();
    return items.filter((item) => {
      if (item.soloRoot && !isRoot) return false;
      if (!item.permiso) return true;
      return this.hasPermission(item.permiso);
    });
  }

  logout() {
    this.authService.logout();
  }
}