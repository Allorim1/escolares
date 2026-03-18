import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../shared/data-access/auth.service';

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
export class Admin {
  authService = inject(AuthService);

  categorias = signal<MenuCategory[]>([
    {
      name: 'Panel Admin',
      expanded: true,
      items: [
        { label: 'Costos y Tasas', route: 'costo-tasa' },
        { label: 'Histórico Costos', route: 'historico-costos' },
        { label: 'Registro', route: 'registro' },
        { label: 'Facturación', route: 'facturacion' },
        { label: 'Cuentas por Pagar', route: 'cuentas-por-pagar' },
        { label: 'Retenciones', route: 'retenciones' },
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
