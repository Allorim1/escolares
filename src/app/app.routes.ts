import { Routes } from '@angular/router';

import HomeComponent from './home/home';
import Panel from './panel/panel';
import { Marcas } from './marcas/marcas';
import { adminGuard } from './shared/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'products',
    loadChildren: () => import('./products/features/product-shell/product.route'),
  },
  {
    path: 'cart',
    loadComponent: () => import('./cart/cart').then((m) => m.default),
  },
  {
    path: 'marcas',
    component: Marcas,
  },
  {
    path: 'panel',
    component: Panel,
    children: [
      {
        path: 'perfil',
        loadComponent: () => import('./panel/perfil/perfil').then((m) => m.Perfil),
      },
      {
        path: 'pedidos',
        loadComponent: () => import('./panel/pedidos/pedidos').then((m) => m.default),
      },
      {
        path: '',
        redirectTo: 'perfil',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./admin/admin').then((m) => m.Admin),
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./admin/productos/admin-productos').then((m) => m.AdminProductos),
      },
      {
        path: 'marcas',
        loadComponent: () => import('./admin/marcas/admin-marcas').then((m) => m.AdminMarcas),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
