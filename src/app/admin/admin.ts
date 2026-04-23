import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../shared/data-access/auth.service';
import { ApiKeyStatusService } from '../shared/data-access/api-key-status.service';
import { RolesBackend } from '../backend/data-access/roles.backend';
import { CategoriasBackend } from '../backend/data-access/categorias.backend';

interface MenuItem {
  label: string;
  route: string;
  permiso?: string;
}

interface MenuCategory {
  name: string;
  expanded: boolean;
  items: MenuItem[];
}

const DEFAULT_CATEGORIAS: MenuCategory[] = [
  {
    name: 'Panel Admin',
    expanded: false,
    items: [
      { label: 'Pedidos', route: 'pedidos', permiso: 'pedidos_ver' },
      { label: 'Costos y Tasas', route: 'costo-tasa', permiso: 'tasas_gestionar' },
      { label: 'Histórico Costos', route: 'historico-costos', permiso: 'tasas_ver' },
      { label: 'Registro', route: 'registro', permiso: 'facturas_registrar' },
      { label: 'Facturación', route: 'facturacion', permiso: 'facturas_gestionar' },
      { label: 'Gastos', route: 'gastos', permiso: 'gastos_gestionar' },
      { label: 'Nómina', route: 'nomina', permiso: 'nomina_ver' },
      { label: 'Galería de Documentos', route: 'galeria', permiso: 'documentos_ver' },
      { label: 'Conversión', route: 'conversion', permiso: 'conversion_gestionar' },
      { label: 'Chat', route: 'chat', permiso: 'chat_ver' },
      { label: 'Cierre de Caja', route: 'cierre-caja', permiso: 'caja_ver' },
    ]
  },
  {
    name: 'Cuentas por Pagar',
    expanded: false,
    items: [
      { label: 'Proveedores', route: 'cuentas-por-pagar', permiso: 'ver_proveedores' },
      { label: 'Retenciones', route: 'retenciones', permiso: 'ver_retenciones' },
      { label: 'Libro de Compras', route: 'libro-compras', permiso: 'ver_libro_compras' },
    ]
  },
  {
    name: 'Panel Web',
    expanded: false,
    items: [
      { label: 'Inicio', route: 'inicio-gestion', permiso: 'inicio_gestionar' },
      { label: 'Productos', route: 'productos', permiso: 'productos_gestionar' },
      { label: 'Marcas', route: 'marcas', permiso: 'marcas_ver' },
      { label: 'Líneas', route: 'lineas', permiso: 'lineas_ver' },
      { label: 'Ofertas', route: 'ofertas', permiso: 'ofertas_ver' },
      { label: 'Usuarios', route: 'usuarios', permiso: 'usuarios_gestionar' },
      { label: 'Roles', route: 'roles', permiso: 'roles_gestionar' },
      { label: 'Manuales', route: 'manuales', permiso: 'manuales_ver' },
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
  private categoriasBackend = inject(CategoriasBackend);

  userPermissions = signal<string[]>([]);
  apiKeyStatusLoaded = signal(false);
  categorias = signal<MenuCategory[]>([]);

  ngOnInit() {
    this.checkApiKeyStatus();
    this.loadUserPermissions();
  }

  loadUserPermissions() {
    const user = this.authService.user();
    if (!user) {
      console.log('No user found, setting default categories');
      this.setCategoriesWithExpanded();
      return;
    }

    if (user.rol === 'root') {
      this.rolesBackend.getPermisos().subscribe({
        next: (permisos) => {
          const permisosIds = permisos.map(p => p.id);
          console.log('Permisos cargados (root):', permisosIds);
          this.userPermissions.set(permisosIds);
          this.setCategoriesWithExpanded();
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
        },
        error: (err) => {
          console.error('Error cargando rol:', err);
          console.error('Error status:', err.status);
          console.error('Error message:', err.error);
          console.error('User rolId:', user.rolId);
          this.userPermissions.set([]);
          this.setCategoriesWithExpanded();
        }
      });
    } else {
      console.log('Usuario sin rolId, no se cargan permisos');
      this.setCategoriesWithExpanded();
    }
  }

  setCategoriesWithExpanded() {
    const permissions = this.userPermissions();
    const user = this.authService.user();
    const isRoot = user?.rol === 'root';

    const categories = DEFAULT_CATEGORIAS.map(cat => {
      const hasVisibleItems = cat.items.some(item => {
        if (!item.permiso) return true;
        if (isRoot) return true;
        return permissions.includes(item.permiso);
      });
      return { ...cat, expanded: hasVisibleItems };
    });
    this.categorias.set(categories);
  }

  hasPermission(permiso?: string): boolean {
    const user = this.authService.user();
    if (!user) return false;
    if (user.rol === 'root') return true;
    if (!permiso) return true;
    return this.userPermissions().includes(permiso);
  }

  checkApiKeyStatus() {
    this.http.get<{ apiKeyExpired?: boolean; error?: string }>('/api/tasas').subscribe({
      next: (data) => {
        console.log('API tasas response:', data);
        if (data.apiKeyExpired) {
          this.apiKeyStatusService.setApiKeyExpired(true);
        }
        this.apiKeyStatusLoaded.set(true);
      },
      error: (err: any) => {
        console.error('Error checking API key status:', err);
        if (err.status === 401 || err.error?.apiKeyExpired || err.name === 'TimeoutError') {
          this.apiKeyStatusService.setApiKeyExpired(true);
        }
        this.apiKeyStatusLoaded.set(true);
      }
    });
  }

  isRoot(): boolean {
    return this.authService.user()?.rol === 'root';
  }

  public toggleCategoria(index: number) {
    this.categorias.update(cats => {
      const newCats = [...cats];
      newCats[index].expanded = !newCats[index].expanded;
      return newCats;
    });
  }

  getVisibleItems(items: MenuItem[]): MenuItem[] {
    return items.filter(item => !item.permiso || this.hasPermission(item.permiso));
  }

  logout() {
    this.authService.logout();
  }
}
