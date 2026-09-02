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

interface ProximoGesto {
  _id?: string;
  nombre: string;
  fechaProximoPago?: string;
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
   { label: 'Costos', route: 'costo-tasa', icon: '💰', permiso: 'tasas_gestionar' },
   { label: 'Registro', route: 'registro', icon: '📝', permiso: 'facturas_registrar' },
   { label: 'Facturación', route: 'facturacion', icon: '🧾', permiso: 'facturas_gestionar' },
   { label: 'Gastos', route: 'gastos', icon: '💸', permiso: 'gastos_gestionar' },
   { label: 'Nómina', route: 'nomina', icon: '👥', permiso: 'nomina_ver' },
   { label: 'Asistencias', route: 'asistencias', icon: '📅', permiso: 'nomina_ver' },
   { label: 'Cierre', route: 'cierre-caja', icon: '🔒', permiso: 'caja_ver' },
   { label: 'Chat', route: 'chat', icon: '💬', permiso: 'chat_ver' },
    { label: 'Cuentas', route: 'cuentas-por-pagar', icon: '🏦', permiso: 'ver_proveedores' },
    { label: 'Constancias', route: 'constancias', icon: '📄', permiso: 'constancias_gestionar' },
    { label: 'Metas', route: 'conversion', icon: '📊', permiso: 'conversion_gestionar' },
   { label: 'Productos', route: 'productos', icon: '🛍️', permiso: 'productos_gestionar' },
   { label: 'Usuarios', route: 'usuarios', icon: '👤', permiso: 'usuarios_gestionar' },
   { label: 'Roles', route: 'roles', icon: '🔑', permiso: 'roles_gestionar' },
   { label: 'Cotizaciones\n/ N. Entrega', route: 'cotizaciones', icon: '⌨️', permiso: 'cotizaciones_gestionar' },
   { label: 'Sesiones', route: 'sesiones', icon: '🔐', permiso: 'sesiones_gestionar' },
 ];

const DEFAULT_CATEGORIAS: MenuCategory[] = [
 {
       name: 'Panel Admin',
       items: [
         { label: 'Pedidos', route: 'pedidos', permiso: 'pedidos_ver' },
         { label: 'Costos y Tasas', route: 'costo-tasa', permiso: 'tasas_gestionar' },
         { label: 'Histórico Costos', route: 'historico-costos', permiso: 'tasas_ver' },
         { label: 'Registro', route: 'registro', permiso: 'facturas_registrar' },
         { label: 'Facturación', route: 'facturacion', permiso: 'facturas_gestionar' },
         { label: 'Cotizaciones', route: 'cotizaciones', permiso: 'cotizaciones_gestionar' },
         { label: 'Gastos', route: 'gastos', permiso: 'gastos_gestionar' },
         { label: 'Nómina', route: 'nomina', permiso: 'nomina_ver' },
         { label: 'Control de Asistencias', route: 'asistencias', permiso: 'nomina_ver' },
          { label: 'Galería de Documentos', route: 'galeria', permiso: 'documentos_ver' },
          { label: 'Constancias y Recibos', route: 'constancias', permiso: 'constancias_gestionar' },
          { label: 'Histórico Metas de Ventas', route: 'conversion', permiso: 'conversion_gestionar' },
         { label: 'Chat', route: 'chat', permiso: 'chat_ver' },
          { label: 'Cierre de Caja', route: 'cierre-caja', permiso: 'caja_ver' },
          { label: 'Repartidores', route: 'repartidores', permiso: 'repartidores_gestionar' },
          { label: 'Estadísticas', route: 'estadisticas', permiso: 'estadisticas_ver' },
        ]
      },
     {
       name: 'Cuentas por Pagar',
       items: [
         { label: 'Proveedores', route: 'cuentas-por-pagar', permiso: 'ver_proveedores' },
         { label: 'Retenciones', route: 'retenciones', permiso: 'ver_retenciones' },
         { label: 'Libro de Compras', route: 'libro-compras', permiso: 'ver_libro_compras' },
       ]
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
         ]
       },
      {
        name: 'Repartidor',
        items: [
          { label: 'Mis Pedidos', route: 'repartidor' },
        ]
      },
          {
            name: 'Seguridad',
            items: [
              { label: 'Usuarios', route: 'usuarios', permiso: 'usuarios_gestionar' },
              { label: 'Roles', route: 'roles', permiso: 'roles_gestionar' },
              { label: 'Control de Sesiones', route: 'sesiones', permiso: 'sesiones_gestionar' },
              { label: 'Contraseñas', route: 'contrasenas', soloRoot: true },
              { label: 'Gastos Operativos', route: 'gastos-operativos', permiso: 'gastos_gestionar', soloRoot: true },
            ]
          },
        {
          name: 'Empresas',
          items: [
            { label: 'Clientes', route: 'clientes' },
            { label: 'Relación de Cuentas', route: 'relacion-cuentas' },
            { label: 'Relación de Libros', route: 'relacion-libros' },
          ]
        }
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
    this.verificarGastosProximosVencer();
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

       const items = QUICK_ITEMS.filter(item => {
         if (!item.permiso) return true;
         if (isRoot) return true;
         return permissions.includes(item.permiso);
       });
       this.quickItems.set(items);
     }

  loadUserPermissions() {
    const user = this.authService.user();
    if (!user) {
       console.log('No user found, setting default categories');
       this.setCategoriesWithExpanded();
       this.setQuickItems();
       return;
     }

     if (user.rol === 'root' || user.rol === 'admin') {
       this.rolesBackend.getPermisos().subscribe({
         next: (permisos) => {
           const permisosIds = permisos.map(p => p.id);
           console.log('Permisos cargados (root):', permisosIds);
           this.userPermissions.set(permisosIds);
           this.setCategoriesWithExpanded();
           this.setQuickItems();
         },
         error: (err) => {
           console.error('Error cargando permisos (root):', err);
           this.userPermissions.set([]);
           this.setCategoriesWithExpanded();
           this.setQuickItems();
         }
       });
     } else if (user.rolId) {
       console.log('Intentando cargar rol con ID:', user.rolId);
       this.rolesBackend.getRol(user.rolId).subscribe({
         next: (rol) => {
           console.log('Rol cargado:', rol.nombre, 'Permisos:', rol.permisos);
           this.userPermissions.set(rol.permisos || []);
           console.log('userPermissions después de cargar rol:', this.userPermissions());
           this.setCategoriesWithExpanded();
           this.setQuickItems();
         },
         error: (err) => {
           console.error('Error cargando rol:', err);
           console.error('Error status:', err.status);
           console.error('Error message:', err.error);
           console.error('User rolId:', user.rolId);
           this.userPermissions.set([]);
           this.setCategoriesWithExpanded();
           this.setQuickItems();
         }
       });
     } else {
       console.log('Usuario sin rolId, no se cargan permisos');
       this.setCategoriesWithExpanded();
       this.setQuickItems();
     }
  }

 setCategoriesWithExpanded() {
       const permissions = this.userPermissions();
       const user = this.authService.user();
       const isRoot = user?.rol === 'root' || user?.rol === 'admin';
       const isRepartidor = user?.rol === 'repartidor';

      const categories = DEFAULT_CATEGORIAS
        .filter(cat => !isRepartidor || cat.name === 'Repartidor')
        .map(cat => {
          const hasVisibleItems = cat.items.some(item => {
            if (item.soloRoot && !isRoot) return false;
            if (!item.permiso) return true;
            if (isRoot) return true;
            return permissions.includes(item.permiso);
          });
          return { ...cat };
        });
      this.categorias.set(categories);
    }

  toggleQuickAccess() {
    this.quickAccessOpen.update(v => !v);
  }

  closeQuickAccess() {
    this.quickAccessOpen.set(false);
  }

  toggleCategoria(nombre: string) {
    this.categoriaExpandida.update(v => v === nombre ? null : nombre);
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
        console.log('API tasas response:', data);
        if (data.apiKeyExpired) {
          this.apiKeyStatusService.setApiKeyExpired(true);
        }
        this.apiKeyStatusLoaded.set(true);
      },
      error: (err: any) => {
        console.error('Error checking API key status:', err);
        if (err.error?.apiKeyExpired) {
          this.apiKeyStatusService.setApiKeyExpired(true);
        }
        this.apiKeyStatusLoaded.set(true);
      }
    });
  }

  isRoot(): boolean {
    return this.authService.user()?.rol === 'root';
  }

  getVisibleItems(items: MenuItem[]): MenuItem[] {
    const isRoot = this.isRoot();
    return items.filter(item => {
      if (item.soloRoot && !isRoot) return false;
      if (!item.permiso) return true;
      return this.hasPermission(item.permiso);
    });
  }

  verificarGastosProximosVencer() {
    const user = this.authService.user();
    if (!user || user.rol !== 'root') return;

    this.http.get<ProximoGesto[]>('/api/gastos-operativos/proximos-vencer?dias=7').subscribe({
      next: (gastos) => {
        if (!gastos || gastos.length === 0) return;
        const nombres = gastos.map(g => `${g.nombre} (${new Date(g.fechaProximoPago || '').toLocaleDateString('es-VE')})`).join('\n');
        this.notificationModal.warning(
          `Tienes ${gastos.length} gasto(s) operativo(s) próximo(s) a vencer:\n\n${nombres}`,
          'Gastos Operativos - Próximos a Vencer'
        );
      },
      error: (err) => console.error('Error verificando gastos próximos a vencer:', err),
    });
  }

  logout() {
    this.authService.logout();
  }
}
