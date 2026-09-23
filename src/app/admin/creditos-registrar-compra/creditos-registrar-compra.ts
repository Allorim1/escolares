import { Component, OnDestroy, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';
import { CurrencyService } from '../../shared/data-access/currency.service';

interface CreditoUsuarioBusqueda {
  id: string;
  nombre: string;
  telefono: string;
  status: string;
  nivel: number;
  disponible: number;
  verificacion?: { documento?: string };
}

type SolicitudStatus = 'pendiente_aceptacion' | 'esperando_pago' | 'solicitado' | 'activo' | 'pagado' | 'rechazado';

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

interface Factura {
  numero: string;
  emitidaEn: string;
  subtotal: number;
  iva: number;
  total: number;
}

interface SolicitudRegistrada {
  id: string;
  status: SolicitudStatus;
  cuotas: number;
  cuotaMonto: number;
  factura: Factura;
  pagoInicial?: number;
  motivoRechazo?: string;
  qrCode?: string;
}

/** Compra recién registrada: se muestra el QR y se hace polling hasta que el cliente
 *  elija su pago inicial; a partir de ahí se espera que el staff confirme que lo recibió. */
interface CompraEnCurso {
  id: string;
  clienteNombre: string;
  clienteTelefono: string;
  qrCode: string;
  factura: Factura;
  cuotas: number;
  cuotaMonto: number;
  pagoInicial?: number;
  estado: 'esperando' | 'esperando_pago' | 'confirmada' | 'rechazada';
  motivoRechazo?: string;
}

const POLL_INTERVAL_MS = 3000;

@Component({
  selector: 'app-creditos-registrar-compra',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creditos-registrar-compra.html',
  styleUrl: './creditos-registrar-compra.css',
})
export class CreditosRegistrarCompra implements OnDestroy {
  private http = inject(HttpClient);
  private notificaciones = inject(NotificationModalService);
  readonly currency = inject(CurrencyService);

  // Búsqueda de usuario
  buscarUsuarioTexto = '';
  usuariosEncontrados = signal<CreditoUsuarioBusqueda[]>([]);
  buscandoUsuario = signal(false);
  usuarioSeleccionado = signal<CreditoUsuarioBusqueda | null>(null);

  // Historial de compras del cliente elegido (tarjeta a la derecha)
  historialCliente = signal<SolicitudHistorial[]>([]);
  cargandoHistorial = signal(false);

  // Monto de la compra a registrar
  monto = signal<number | null>(null);
  montoEnBs = computed(() => {
    const m = this.monto();
    return m && m > 0 ? this.currency.convertToBs(m) : 0;
  });
  montoEnBsFormateado = computed(() => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(this.montoEnBs()));

  guardando = signal(false);
  mensaje = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Compra registrada: QR mostrado + estado (esperando/confirmada/rechazada por el cliente)
  compraEnCurso = signal<CompraEnCurso | null>(null);

  private timeoutUsuario: ReturnType<typeof setTimeout> | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  ngOnDestroy() {
    this.detenerPolling();
  }

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
    this.monto.set(null);
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
      case 'esperando_pago': return { texto: 'Falta el pago inicial', clase: 'badge-warning' };
      case 'solicitado': return { texto: 'Pendiente', clase: 'badge-warning' };
      case 'activo': return { texto: 'Activo', clase: 'badge-primary' };
      case 'pagado': return { texto: 'Pagado', clase: 'badge-success' };
      case 'rechazado': return { texto: 'Rechazado', clase: 'badge-danger' };
    }
  }

  disponibleRestante = computed(() => {
    const u = this.usuarioSeleccionado();
    const m = this.monto();
    if (!u) return 0;
    return Math.round((u.disponible - (m || 0)) * 100) / 100;
  });

  excedeDisponible = computed(() => this.disponibleRestante() < 0);

  puedeRegistrar = computed(() =>
    !!this.usuarioSeleccionado() &&
    this.usuarioSeleccionado()?.status === 'verificado' &&
    !!this.monto() && this.monto()! > 0 &&
    !this.excedeDisponible() &&
    !this.guardando(),
  );

  registrarCompra() {
    const usuario = this.usuarioSeleccionado();
    const monto = this.monto();
    if (!usuario || !monto || !this.puedeRegistrar()) return;

    this.guardando.set(true);
    this.mensaje.set(null);
    const body = { usuarioId: usuario.id, monto };

    this.http.post<SolicitudRegistrada>('/api/creditos/admin/compras', body).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.compraEnCurso.set({
          id: res.id,
          clienteNombre: usuario.nombre,
          clienteTelefono: usuario.telefono,
          qrCode: res.qrCode || '',
          factura: res.factura,
          cuotas: res.cuotas,
          cuotaMonto: res.cuotaMonto,
          estado: 'esperando',
        });
        this.notificaciones.success('Muéstrale el QR al cliente para que lo escanee desde la app.', 'Compra registrada');
        this.iniciarPolling(res.id);
      },
      error: (err) => {
        this.guardando.set(false);
        const texto = err.error?.error || 'Error al registrar la compra';
        this.mensaje.set({ tipo: 'error', texto });
        this.notificaciones.error(texto, 'No se pudo registrar la compra');
      },
    });
  }

  private iniciarPolling(id: string) {
    this.detenerPolling();
    this.pollingInterval = setInterval(() => {
      this.http.get<SolicitudRegistrada>(`/api/creditos/admin/solicitudes/${id}`).subscribe({
        next: (s) => {
          if (s.status === 'esperando_pago') {
            // El cliente ya eligió cuánto paga de inicial: ahora se espera al staff, no al cliente.
            this.detenerPolling();
            this.compraEnCurso.update((c) => (c ? { ...c, estado: 'esperando_pago', pagoInicial: s.pagoInicial, cuotaMonto: s.cuotaMonto } : c));
            this.notificaciones.success('El cliente confirmó la compra. Cóbrale el pago inicial y márcalo como recibido.', 'Falta el pago inicial');
          } else if (s.status === 'rechazado') {
            this.detenerPolling();
            this.compraEnCurso.update((c) => (c ? { ...c, estado: 'rechazada', motivoRechazo: s.motivoRechazo } : c));
          }
          // Si sigue 'pendiente_aceptacion', se sigue esperando: el próximo tick vuelve a consultar.
        },
        // Un fallo puntual de red no debe cortar el polling; se reintenta en el próximo tick.
        error: () => undefined,
      });
    }, POLL_INTERVAL_MS);
  }

  private detenerPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /** El staff confirma que ya recibió (efectivo/transferencia) el pago inicial del cliente. */
  confirmarPagoRecibido() {
    const c = this.compraEnCurso();
    if (!c) return;
    this.guardando.set(true);
    this.http.post(`/api/creditos/admin/solicitudes/${c.id}/confirmar-pago`, {}).subscribe({
      next: () => {
        this.guardando.set(false);
        this.compraEnCurso.update((cur) => (cur ? { ...cur, estado: 'confirmada' } : cur));
        this.notificaciones.success('Crédito activado.', '¡Listo!');
      },
      error: (err) => {
        this.guardando.set(false);
        this.notificaciones.error(err.error?.error || 'No se pudo confirmar el pago', 'Error');
      },
    });
  }

  /** Cierra la compra actual y vuelve al inicio del flujo para atender al siguiente cliente. */
  registrarOtraCompra() {
    this.detenerPolling();
    this.compraEnCurso.set(null);
    this.usuarioSeleccionado.set(null);
    this.monto.set(null);
    this.historialCliente.set([]);
    this.mensaje.set(null);
  }
}
