import { Routes } from '@angular/router';

import HomeComponent from './home/home';
import Panel from './panel/panel';
import { Marcas } from './marcas/marcas';
import { AboutMe } from './about-me/about-me';
import { HowBuy } from './how-buy/how-buy';
import { Feedback } from './feedback/feedback';
import { Lineas } from './lineas/lineas';
import { Offers } from './offers/offers';
import { adminGuard } from './shared/guards/admin.guard';
import { Admin } from './admin/admin';

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
    path: 'about-me',
    component: AboutMe,
  },
  {
    path: 'how-buy',
    component: HowBuy,
  },
  {
    path: 'feedback',
    component: Feedback,
  },
  {
    path: 'lineas',
    component: Lineas,
  },
  {
    path: 'offers',
    component: Offers,
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
    path: 'register',
    loadComponent: () => import('./register/register').then((m) => m.Register),
  },
  {
    path: 'admin',
    component: Admin,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        redirectTo: 'inicio',
        pathMatch: 'full',
      },
      {
        path: 'inicio',
        loadComponent: () => import('./admin/inicio/inicio').then((m) => m.AdminInicio),
      },
      {
        path: 'inicio-gestion',
        loadComponent: () => import('./admin/inicio-gestion/inicio-gestion').then((m) => m.AdminInicioGestion),
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
      {
        path: 'lineas',
        loadComponent: () => import('./admin/lineas/admin-lineas').then((m) => m.AdminLineas),
      },
      {
        path: 'ofertas',
        loadComponent: () => import('./admin/ofertas/admin-ofertas').then((m) => m.AdminOfertas),
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./admin/usuarios/admin-usuarios').then((m) => m.AdminUsuarios),
      },
      {
        path: 'roles',
        loadComponent: () => import('./admin/roles/admin-roles').then((m) => m.AdminRoles),
      },
      {
        path: 'costo-tasa',
        loadComponent: () => import('./admin/costo-tasa/costo-tasa').then((m) => m.CostoTasa),
      },
      {
        path: 'registro',
        loadComponent: () => import('./admin/registro/registro').then((m) => m.AdminRegistro),
      },
      {
        path: 'facturacion',
        loadComponent: () => import('./admin/facturacion/facturacion').then((m) => m.AdminFacturacion),
      },
      {
        path: 'cuentas-por-pagar',
        loadComponent: () => import('./admin/cuentas-por-pagar/cuentas-por-pagar').then((m) => m.CuentasPorPagar),
      },
      {
        path: 'historico-costos',
        loadComponent: () => import('./admin/historico-costos/historico-costos').then((m) => m.HistoricoCostos),
      },
      {
        path: 'retenciones',
        loadComponent: () => import('./admin/retenciones/retenciones').then((m) => m.Retenciones),
      },
      {
        path: 'pedidos',
        loadComponent: () => import('./admin/pedidos/admin-pedidos').then((m) => m.AdminPedidos),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
