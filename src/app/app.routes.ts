import HomeComponent from './home/home';
import { Marcas } from './marcas/marcas';
import { AboutMe } from './about-me/about-me';
import { HowBuy } from './how-buy/how-buy';
import { Feedback } from './feedback/feedback';
import { Lineas } from './lineas/lineas';
import Panel from './panel/panel';
import { Admin } from './admin/admin';
import { adminOrRepartidorGuard } from './shared/guards/admin-or-repartidor.guard';
import { noAuthGuard } from './shared/guards/no-auth.guard';
import { Login } from './login/login';
import { authGuard } from './shared/guards/auth.guard';
import { repartidorGuard } from './shared/guards/repartidor.guard';
import { Routes } from '@angular/router';

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
    path: 'terminos',
    loadComponent: () => import('./terminos/terminos').then((m) => m.Terminos),
  },
  {
    path: 'privacidad',
    loadComponent: () => import('./privacidad/privacidad').then((m) => m.Privacidad),
  },
{
    path: 'panel',
    component: Panel,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'perfil',
        pathMatch: 'full',
      },
      {
        path: 'perfil',
        loadComponent: () => import('./panel/perfil/perfil').then((m) => m.Perfil),
      },
      {
        path: 'ajustes',
        loadComponent: () => import('./panel/ajustes').then((m) => m.Ajustes),
      },
      {
        path: 'pedidos',
        loadComponent: () => import('./panel/pedidos/pedidos').then((m) => m.default),
      },
      {
        path: 'direcciones',
        loadComponent: () => import('./panel/direcciones/direcciones').then((m) => m.Direcciones),
      },
      {
        path: 'historico-compra',
        loadComponent: () => import('./panel/historico-compra/historico-compra').then((m) => m.HistoricoCompra),
      },
      {
        path: 'favoritos',
        loadComponent: () => import('./panel/favoritos/favoritos').then((m) => m.Favoritos),
      },
      {
        path: 'metodos-pago',
        loadComponent: () => import('./panel/metodos-pago/metodos-pago').then((m) => m.MetodosPago),
      },
    ],
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register').then((m) => m.Register),
    canActivate: [noAuthGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login),
    canActivate: [noAuthGuard],
  },
{
        path: 'admin',
        component: Admin,
        canActivate: [adminOrRepartidorGuard],
        children: [
          {
            path: '',
            loadComponent: () => import('./admin/admin-redirect').then((m) => m.AdminRedirectComponent),
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
             path: 'noticias',
             loadComponent: () => import('./admin/noticias/admin-noticias').then((m) => m.AdminNoticiasComponent),
           },
          {
            path: 'pedidos',
            loadComponent: () => import('./admin/pedidos/admin-pedidos').then((m) => m.AdminPedidos),
          },
          {
            path: 'galeria',
            loadComponent: () => import('./admin/galeria/galeria').then((m) => m.Galeria),
          },
          {
            path: 'manuales',
            loadComponent: () => import('./admin/manuales/admin-manuales').then((m) => m.AdminManuales),
          },
          {
            path: 'chat',
            loadComponent: () => import('./admin/chat/chat').then((m) => m.Chat),
          },
          {
            path: 'cierre-caja',
            loadComponent: () => import('./admin/cierre-caja/cierre-caja').then((m) => m.CierreCaja),
          },
          {
            path: 'gastos',
            loadComponent: () => import('./admin/gastos/gastos').then((m) => m.Gastos),
          },
          {
            path: 'nomina',
            loadComponent: () => import('./admin/nomina/nomina').then((m) => m.Nomina),
          },
          {
            path: 'libro-compras',
            loadComponent: () => import('./admin/libro-compras/libro-compras').then((m) => m.LibroCompras),
          },
          {
            path: 'categorias',
            loadComponent: () => import('./admin/categorias/admin-categorias').then((m) => m.AdminCategorias),
          },
          {
            path: 'producto-categorias',
            loadComponent: () => import('./admin/producto-categorias/admin-producto-categorias').then((m) => m.AdminProductoCategorias),
          },
          {
            path: 'repartidores',
            loadComponent: () => import('./admin/repartidores/admin-repartidores').then((m) => m.AdminRepartidoresComponent),
          },
          {
            path: 'redes-sociales',
            loadComponent: () => import('./admin/redes-sociales/admin-redes-sociales').then((m) => m.AdminRedesSociales),
          },
          {
            path: 'conversion',
            loadComponent: () => import('./admin/conversion/conversion').then((m) => m.Conversion),
          },
          {
            path: 'historico-costos',
            loadComponent: () => import('./admin/historico-costos/historico-costos').then((m) => m.HistoricoCostos),
          },
{
             path: 'ofertas',
             loadComponent: () => import('./admin/ofertas/admin-ofertas').then((m) => m.AdminOfertas),
           },
{
              path: 'cotizaciones',
              loadComponent: () => import('./admin/cotizaciones/cotizaciones').then((m) => m.Cotizaciones),
            },
           {
             path: 'retenciones',
             loadComponent: () => import('./admin/retenciones/retenciones').then((m) => m.Retenciones),
           },
          {
            path: 'repartidor',
            loadComponent: () => import('./admin/repartidor/admin-repartidor').then((m) => m.AdminRepartidorComponent),
          },
        ],
      },
      {
        path: 'repartidor',
        loadComponent: () => import('./repartidor/repartidor').then((m) => m.RepartidorComponent),
        canActivate: [repartidorGuard],
      },
  {
    path: 'noticias',
    loadComponent: () => import('./noticias/noticias').then((m) => m.NoticiasComponent),
  },
  {
    path: 'notifications',
     loadComponent: () => import('./shared/ui/notifications/notifications').then((m) => m.NotificationsComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];