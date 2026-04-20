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
    expanded: true,
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
    expanded: true,
    items: [
      { label: 'Proveedores', route: 'cuentas-por-pagar', permiso: 'cuentas_ver' },
      { label: 'Retenciones', route: 'retenciones', permiso: 'retenciones_ver' },
      { label: 'Libro de Compras', route: 'libro-compras', permiso: 'libro_compras_ver' },
    ]
  },
  {
    name: 'Panel Web',
    expanded: true,
    items: [
      { label: 'Inicio', route: 'inicio-gestion', permiso: 'inicio_gestionar' },
      { label: 'Productos', route: 'productos', permiso: 'productos_gestionar' },
      { label: 'Marcas', route: 'marcas', permiso: 'marcas_ver' },
      { label: 'Líneas', route: 'lineas', permiso: 'lineas_ver' },
      { label: 'Ofertas', route: 'ofertas', permiso: 'ofertas_ver' },
      { label: 'Usuarios', route: 'usuarios', permiso: 'usuarios_gestionar' },
{ label: 'Roles', route: 'roles', permiso: 'roles_gestionar' },
        { label: 'Categorías Menú', route: 'categorias', permiso: 'categorias_gestionar' },
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

  categorias = signal<MenuCategory[]>(DEFAULT_CATEGORIAS);

  ngOnInit() {
    this.checkApiKeyStatus();
    this.loadUserPermissions();
    this.loadCategorias();
  }

  loadCategorias() {
    const user = this.authService.user();
    if (user?.rol === 'root') {
      this.categorias.set(DEFAULT_CATEGORIAS);
      return;
    }
    
    this.categoriasBackend.getAll().subscribe({
      next: (categorias) => {
        if (categorias && categorias.length > 0) {
          this.categorias.set(categorias.map(c => ({
            name: c.nombre,
            expanded: c.expanded,
            items: c.items || []
          })));
        } else {
          this.categorias.set(DEFAULT_CATEGORIAS);
        }
      },
      error: () => {
        this.categorias.set(DEFAULT_CATEGORIAS);
      }
    });
  }

  loadUserPermissions() {
    const user = this.authService.user();
    if (!user) return;
    
    if (user.rol === 'root') {
      this.rolesBackend.getPermisos().subscribe({
        next: (permisos) => {
          this.userPermissions.set(permisos.map(p => p.id));
        }
      });
    } else if (user.rolId) {
      this.rolesBackend.getRol(user.rolId).subscribe({
        next: (rol) => {
          this.userPermissions.set(rol.permisos || []);
        },
        error: () => {
          this.userPermissions.set([]);
        }
      });
    }
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

  toggleCategoria(index: number) {
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
