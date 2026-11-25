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
    // Catálogo de productos que sellhub (EscolaresPRO) marca con "Ver en web".
    // De momento es privado: sin enlace en el menú y con noindex.
    path: 'catalogo',
    loadComponent: () => import('./catalogo/catalogo').then((m) => m.Catalogo),
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
    children: [
      {
        path: ':id',
        loadComponent: () => import('./lineas/productos-linea/productos-linea').then((m) => m.ProductosLinea),
      },
    ],
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
    path: 'eliminar-cuenta',
    loadComponent: () => import('./eliminar-cuenta/eliminar-cuenta').then((m) => m.EliminarCuenta),
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
            path: 'registro',
            loadComponent: () => import('./admin/registro/registro').then((m) => m.AdminRegistro),
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
            path: 'manuales',
            loadComponent: () => import('./admin/manuales/admin-manuales').then((m) => m.AdminManuales),
          },
          {
            path: 'chat',
            loadComponent: () => import('./admin/chat/chat').then((m) => m.Chat),
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
             path: 'ofertas',
             loadComponent: () => import('./admin/ofertas/admin-ofertas').then((m) => m.AdminOfertas),
           },
{
                path: 'cotizaciones',
                loadComponent: () => import('./admin/cotizaciones/cotizaciones').then((m) => m.Cotizaciones),
              },
{
             path: 'repartidor',
             loadComponent: () => import('./admin/repartidor/admin-repartidor').then((m) => m.AdminRepartidorComponent),
           },
              {
                path: 'clientes',
                loadComponent: () => import('./admin/clientes/clientes').then((m) => m.Clientes),
              },
              {
                path: 'clientes/:id',
                loadComponent: () => import('./admin/clientes/clientes-detalle').then((m) => m.ClientesDetalle),
              },
               {
                 path: 'lista-negra',
                 loadComponent: () => import('./admin/lista-negra/lista-negra').then((m) => m.ListaNegra),
               },
               {
                 path: 'whatsapp',
                 loadComponent: () => import('./admin/whatsapp/whatsapp').then((m) => m.WhatsApp),
               },
             {
               path: 'sesiones',
               loadComponent: () => import('./admin/sesiones/admin-sesiones').then((m) => m.AdminSesiones),
             },
            {
              path: 'estadisticas',
              loadComponent: () => import('./admin/estadisticas/estadisticas').then((m) => m.Estadisticas),
            },
          {
            path: 'contrasenas',
            loadComponent: () => import('./admin/contrasenas/contrasenas').then((m) => m.AdminContrasenas),
          },
          {
            path: 'creditos-verificaciones',
            loadComponent: () => import('./admin/creditos-verificaciones/creditos-verificaciones').then((m) => m.CreditosVerificaciones),
          },
          {
            path: 'creditos-verificaciones/:id',
            loadComponent: () => import('./admin/creditos-verificaciones-detalle/creditos-verificaciones-detalle').then((m) => m.CreditosVerificacionesDetalle),
          },
          {
            path: 'creditos-solicitudes',
            loadComponent: () => import('./admin/creditos-solicitudes/creditos-solicitudes').then((m) => m.CreditosSolicitudes),
          },
          {
            path: 'creditos-registrar-compra',
            loadComponent: () => import('./admin/creditos-registrar-compra/creditos-registrar-compra').then((m) => m.CreditosRegistrarCompra),
          },
          {
            path: 'creditos-asignar-compra',
            loadComponent: () => import('./admin/creditos-asignar-compra/creditos-asignar-compra').then((m) => m.CreditosAsignarCompra),
          },
          {
            path: 'creditos-verificar-pagos',
            loadComponent: () => import('./admin/creditos-verificar-pagos/creditos-verificar-pagos').then((m) => m.CreditosVerificarPagos),
          },
          {
            path: 'creditos-eliminaciones',
            loadComponent: () => import('./admin/creditos-eliminaciones/creditos-eliminaciones').then((m) => m.CreditosEliminaciones),
          },
          {
            path: 'creditos-tickets',
            loadComponent: () => import('./admin/creditos-tickets/creditos-tickets').then((m) => m.CreditosTickets),
          },
          {
            path: 'creditos-tickets/:id',
            loadComponent: () => import('./admin/creditos-tickets-detalle/creditos-tickets-detalle').then((m) => m.CreditosTicketsDetalle),
          },
          {
            path: 'creditos-restablecimientos',
            loadComponent: () => import('./admin/creditos-restablecimientos/creditos-restablecimientos').then((m) => m.CreditosRestablecimientos),
          },
          {
            path: 'creditos-reportes',
            loadComponent: () => import('./admin/creditos-reportes/creditos-reportes').then((m) => m.CreditosReportes),
          },
          {
            path: 'creditos-ubicaciones',
            loadComponent: () => import('./admin/creditos-ubicaciones/creditos-ubicaciones').then((m) => m.CreditosUbicaciones),
          },
          {
            path: 'creditos-ampliar-credito',
            loadComponent: () => import('./admin/creditos-ampliar-credito/creditos-ampliar-credito').then((m) => m.CreditosAmpliarCredito),
          },
          {
            path: 'creditos-productos',
            loadComponent: () => import('./admin/creditos-productos/creditos-productos').then((m) => m.CreditosProductos),
          },
          {
            path: 'creditos-reglas',
            loadComponent: () => import('./admin/creditos-reglas/creditos-reglas').then((m) => m.CreditosReglas),
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