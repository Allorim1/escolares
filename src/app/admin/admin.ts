import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../shared/data-access/auth.service';
import { ApiKeyStatusService } from '../shared/data-access/api-key-status.service';

interface MenuItem {
  label: string;
  route: string;
}

interface MenuCategory {
  name: string;
  expanded: boolean;
  items: MenuItem[];
}

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

  apiKeyStatusLoaded = signal(false);

  ngOnInit() {
    this.checkApiKeyStatus();
  }

  checkApiKeyStatus() {
    this.http.get<{ apiKeyExpired: boolean }>('/api/settings/tasas-status').subscribe({
      next: (data) => {
        console.log('API Key Status:', data);
        this.apiKeyStatusService.setApiKeyExpired(data.apiKeyExpired);
        this.apiKeyStatusLoaded.set(true);
      },
      error: (err) => {
        console.error('Error checking API key status:', err);
        this.apiKeyStatusLoaded.set(true);
      }
    });
  }

  isRoot(): boolean {
    return this.authService.user()?.rol === 'root';
  }

  categorias = signal<MenuCategory[]>([
    {
      name: 'Panel Admin',
      expanded: true,
      items: [
        { label: 'Pedidos', route: 'pedidos' },
        { label: 'Costos y Tasas', route: 'costo-tasa' },
        { label: 'Histórico Costos', route: 'historico-costos' },
        { label: 'Registro', route: 'registro' },
        { label: 'Facturación', route: 'facturacion' },
        { label: 'Cuentas por Pagar', route: 'cuentas-por-pagar' },
        { label: 'Retenciones', route: 'retenciones' },
        { label: 'Galería', route: 'galeria' },
        { label: 'Conversión', route: 'conversion' },
      ]
    },
{
      name: 'Panel Web',
      expanded: true,
      items: [
        { label: 'Inicio', route: 'inicio-gestion' },
        { label: 'Productos', route: 'productos' },
        { label: 'Marcas', route: 'marcas' },
        { label: 'Líneas', route: 'lineas' },
        { label: 'Ofertas', route: 'ofertas' },
        { label: 'Usuarios', route: 'usuarios' },
      ]
    }
  ]);

  toggleCategoria(index: number) {
    this.categorias.update(cats => {
      const newCats = [...cats];
      newCats[index].expanded = !newCats[index].expanded;
      return newCats;
    });
  }

  logout() {
    this.authService.logout();
  }
}
