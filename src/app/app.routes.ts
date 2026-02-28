import { Routes } from '@angular/router';

import HomeComponent from './home/home';
import Panel from './panel/panel';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'products',
    loadChildren: () =>
      import('./products/features/product-shell/product.route'),
  },
  {
    path: 'cart',
    loadComponent: () => import('./cart/cart').then(m => m.default),
  },
  {
    path: 'panel',
    component: Panel,
    children: [
      {
        path: 'perfil',
        loadComponent: () => import('./panel/perfil/perfil').then(m => m.Perfil),
      },
      {
        path: 'pedidos',
        loadComponent: () => import('./panel/pedidos/pedidos').then(m => m.default),
      },
      {
        path: '',
        redirectTo: 'perfil',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
