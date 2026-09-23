import { Component, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';

interface CreditoUsuarioBusqueda {
  id: string;
  nombre: string;
  telefono: string;
  status: string;
  nivel: number;
  disponible: number;
  verificacion?: { documento?: string };
}

interface InvProducto {
  _id: string;
  codigo: string;
  nombre: string;
  precio: number;
  iva: number;
  stock: number;
}

interface LineaCarrito {
  producto: InvProducto;
  cantidad: number;
}

type SolicitudStatus = 'pendiente_aceptacion' | 'solicitado' | 'activo' | 'pagado' | 'rechazado';

interface SolicitudHistorialItem {
  nombre: string;
  cantidad: number;
}

interface SolicitudHistorial {
  id: string;
  status: SolicitudStatus;
  monto: number;
  cuotas: number;
  cuotaMonto: number;
  proposito: string;
  productoNombre?: string;
  items?: SolicitudHistorialItem[];
  createdAt: string;
  motivoRechazo?: string;
  factura?: { numero: string; total: number };
}

interface FacturaGenerada {
  numero: string;
  emitidaEn: string;
  subtotal: number;
  iva: number;
  total: number;
}

interface CompraRegistrada {
  clienteNombre: string;
  clienteTelefono: string;
  factura: FacturaGenerada;
  items: LineaCarrito[];
  cuotas: number;
  cuotaMonto: number;
}

@Component({
  selector: 'app-creditos-registrar-compra',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creditos-registrar-compra.html',
  styleUrl: './creditos-registrar-compra.css',
})
export class CreditosRegistrarCompra {
  private http = inject(HttpClient);
  private notificaciones = inject(NotificationModalService);

  // Búsqueda de usuario
  buscarUsuarioTexto = '';
  usuariosEncontrados = signal<CreditoUsuarioBusqueda[]>([]);
  buscandoUsuario = signal(false);
  usuarioSeleccionado = signal<CreditoUsuarioBusqueda | null>(null);

  // Historial de compras del cliente elegido (tarjeta a la derecha)
  historialCliente = signal<SolicitudHistorial[]>([]);
  cargandoHistorial = signal(false);

  // Búsqueda de producto
  buscarProductoTexto = '';
  productosEncontrados = signal<InvProducto[]>([]);
  buscandoProducto = signal(false);

  // Carrito
  carrito = signal<LineaCarrito[]>([]);

  guardando = signal(false);
  mensaje = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Factura de la última compra registrada, para mostrarla tras guardar
  facturaGenerada = signal<CompraRegistrada | null>(null);

  private timeoutUsuario: ReturnType<typeof setTimeout> | null = null;
  private timeoutProducto: ReturnType<typeof setTimeout> | null = null;

  onBuscarUsuario() {
    if (this.timeoutUsuario) clearTimeout(this.timeoutUsuario);
    const termino = this.buscarUsuarioTexto.trim();
    if (!termino) {
      this.usuariosEncontrados.set([]);
      return;
    }
    this.timeoutUsuario = setTimeout(() => {
      this.buscandoUsuario.set(true);
      this.http.get<CreditoUsuarioBusqueda[]>(`/api/creditos/admin/usuarios/buscar?q=${encodeURIComponent(termino)}`).subscribe({
        next: (data) => { this.usuariosEncontrados.set(data); this.buscandoUsuario.set(false); },
        error: () => this.buscandoUsuario.set(false),
      });
    }, 300);
  }

  seleccionarUsuario(u: CreditoUsuarioBusqueda) {
    this.usuarioSeleccionado.set(u);
    this.usuariosEncontrados.set([]);
    this.buscarUsuarioTexto = '';
    this.cargarHistorialCliente(u.id);
  }

  cambiarUsuario() {
    this.usuarioSeleccionado.set(null);
    this.carrito.set([]);
    this.mensaje.set(null);
    this.historialCliente.set([]);
  }

  /** Compras (activas, pagadas, rechazadas, etc.) del cliente elegido, para la tarjeta de historial. */
  cargarHistorialCliente(usuarioId: string) {
    this.cargandoHistorial.set(true);
    this.http.get<SolicitudHistorial[]>(`/api/creditos/admin/solicitudes?usuarioId=${usuarioId}`).subscribe({
      next: (data) => { this.historialCliente.set(data); this.cargandoHistorial.set(false); },
      error: () => { this.historialCliente.set([]); this.cargandoHistorial.set(false); },
    });
  }

  descripcionSolicitud(s: SolicitudHistorial): string {
    if (s.items?.length) return s.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(', ');
    return s.productoNombre || s.proposito || '—';
  }

  etiquetaSolicitud(status: SolicitudStatus): { texto: string; clase: string } {
    switch (status) {
      case 'pendiente_aceptacion': return { texto: 'Por confirmar', clase: 'badge-tertiary' };
      case 'solicitado': return { texto: 'Pendiente', clase: 'badge-warning' };
      case 'activo': return { texto: 'Activo', clase: 'badge-primary' };
      case 'pagado': return { texto: 'Pagado', clase: 'badge-success' };
      case 'rechazado': return { texto: 'Rechazado', clase: 'badge-danger' };
    }
  }

  onBuscarProducto() {
    if (this.timeoutProducto) clearTimeout(this.timeoutProducto);
    const termino = this.buscarProductoTexto.trim();
    if (!termino) {
      this.productosEncontrados.set([]);
      return;
    }
    this.timeoutProducto = setTimeout(() => {
      this.buscandoProducto.set(true);
      this.http.get<InvProducto[]>(`/api/inv-productos?q=${encodeURIComponent(termino)}`).subscribe({
        next: (data) => { this.productosEncontrados.set(data); this.buscandoProducto.set(false); },
        error: () => this.buscandoProducto.set(false),
      });
    }, 300);
  }

  agregarProducto(p: InvProducto) {
    const actual = this.carrito();
    const existente = actual.find((l) => l.producto._id === p._id);
    if (existente) {
      existente.cantidad += 1;
      this.carrito.set([...actual]);
    } else {
      this.carrito.set([...actual, { producto: p, cantidad: 1 }]);
    }
  }

  quitarLinea(linea: LineaCarrito) {
    this.carrito.set(this.carrito().filter((l) => l !== linea));
  }

  ivaLinea(l: LineaCarrito): number {
    return Math.round(l.producto.precio * l.cantidad * (l.producto.iva / 100) * 100) / 100;
  }

  subtotalLinea(l: LineaCarrito): number {
    return Math.round(l.producto.precio * l.cantidad * 100) / 100;
  }

  subtotal = computed(() => this.carrito().reduce((sum, l) => sum + this.subtotalLinea(l), 0));
  iva = computed(() => this.carrito().reduce((sum, l) => sum + this.ivaLinea(l), 0));
  total = computed(() => Math.round((this.subtotal() + this.iva()) * 100) / 100);

  disponibleRestante = computed(() => {
    const u = this.usuarioSeleccionado();
    if (!u) return 0;
    return Math.round((u.disponible - this.subtotal()) * 100) / 100;
  });

  excedeDisponible = computed(() => this.disponibleRestante() < 0);

  puedeRegistrar = computed(() =>
    !!this.usuarioSeleccionado() &&
    this.usuarioSeleccionado()?.status === 'verificado' &&
    this.carrito().length > 0 &&
    !this.excedeDisponible() &&
    !this.guardando(),
  );

  registrarCompra() {
    const usuario = this.usuarioSeleccionado();
    if (!usuario || !this.puedeRegistrar()) return;

    // Se capturan antes de guardar: al terminar se limpian el carrito y el cliente elegido.
    const itemsRegistrados = this.carrito();

    this.guardando.set(true);
    this.mensaje.set(null);
    const body = {
      usuarioId: usuario.id,
      items: itemsRegistrados.map((l) => ({ productoId: l.producto._id, cantidad: l.cantidad })),
    };

    this.http
      .post<{ factura?: FacturaGenerada; cuotas: number; cuotaMonto: number }>('/api/creditos/admin/compras', body)
      .subscribe({
        next: (res) => {
          this.guardando.set(false);
          if (res.factura) {
            this.facturaGenerada.set({
              clienteNombre: usuario.nombre,
              clienteTelefono: usuario.telefono,
              factura: res.factura,
              items: itemsRegistrados,
              cuotas: res.cuotas,
              cuotaMonto: res.cuotaMonto,
            });
          }
          this.notificaciones.success(
            `Compra registrada (factura ${res.factura?.numero}). El cliente ya puede aceptarla desde la app.`,
            'Compra registrada',
          );
          this.carrito.set([]);
          this.usuarioSeleccionado.set(null);
          this.historialCliente.set([]);
        },
        error: (err) => {
          this.guardando.set(false);
          const texto = err.error?.error || 'Error al registrar la compra';
          this.mensaje.set({ tipo: 'error', texto });
          this.notificaciones.error(texto, 'No se pudo registrar la compra');
        },
      });
  }

  cerrarFacturaGenerada() {
    this.facturaGenerada.set(null);
  }
}
