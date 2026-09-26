import { Component, computed, signal, inject } from '@angular/core';
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

interface SolicitudAsignada {
  id: string;
  cuotas: number;
  cuotaMonto: number;
  factura: Factura;
  pagoInicialAsignado: number;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Asignar una compra a un cliente sin que tenga que escanear un QR: root define el monto y
 *  el inicial de una vez, y el cliente solo la acepta o la rechaza desde su app. Pensado para
 *  compras acordadas fuera de tienda (por teléfono, a distancia, etc.). Solo para root: el
 *  permiso 'creditos_gestionar' no basta (ver soloRoot en el menú y requireRoot en el backend). */
@Component({
  selector: 'app-creditos-asignar-compra',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creditos-asignar-compra.html',
  styleUrl: './creditos-asignar-compra.css',
})
export class CreditosAsignarCompra {
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

  // Reglas del negocio, solo para poder mostrar el IVA/total estimados mientras se escribe
  // (el backend vuelve a calcularlos: esto es solo para la vista previa).
  private ivaTasa = signal(0);

  // Monto e inicial de la compra a asignar
  monto = signal<number | null>(null);
  pagoInicial = signal<number | null>(null);

  montoEnBs = computed(() => {
    const m = this.monto();
    return m && m > 0 ? this.currency.convertToBs(m) : 0;
  });
  montoEnBsFormateado = computed(() => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(this.montoEnBs()));

  iva = computed(() => round((this.monto() ?? 0) * this.ivaTasa()));
  total = computed(() => round((this.monto() ?? 0) + this.iva()));

  guardando = signal(false);
  mensaje = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Compra ya asignada: se muestra un resumen y se limpia el formulario para la siguiente.
  compraAsignada = signal<SolicitudAsignada | null>(null);

  private timeoutUsuario: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.http.get<{ ivaTasa: number }>('/api/creditos/admin/reglas').subscribe({
      next: (r) => this.ivaTasa.set(r.ivaTasa),
      error: () => undefined,
    });
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
    this.pagoInicial.set(null);
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

  pagoInicialInvalido = computed(() => {
    const m = this.monto();
    const p = this.pagoInicial();
    if (!m || m <= 0) return true;
    if (p == null || !Number.isFinite(p)) return true;
    return p < this.iva() - 0.01 || p > this.total() + 0.01;
  });

  puedeRegistrar = computed(() =>
    !!this.usuarioSeleccionado() &&
    this.usuarioSeleccionado()?.status === 'verificado' &&
    !!this.monto() && this.monto()! > 0 &&
    !this.excedeDisponible() &&
    !this.pagoInicialInvalido() &&
    !this.guardando(),
  );

  /** Rellena el inicial con el mínimo (el IVA) la primera vez que hay un monto válido, para
   *  no dejar el campo vacío; root puede cambiarlo a cualquier valor entre eso y el total. */
  onMontoChange(valor: number | null) {
    this.monto.set(valor);
    if (this.pagoInicial() == null && valor && valor > 0) {
      this.pagoInicial.set(this.iva());
    }
  }

  asignarCompra() {
    const usuario = this.usuarioSeleccionado();
    const monto = this.monto();
    const pagoInicial = this.pagoInicial();
    if (!usuario || !monto || pagoInicial == null || !this.puedeRegistrar()) return;

    this.guardando.set(true);
    this.mensaje.set(null);
    const body = { usuarioId: usuario.id, monto, pagoInicial };

    this.http.post<SolicitudAsignada>('/api/creditos/admin/compras/manual', body).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.compraAsignada.set(res);
        this.notificaciones.success('Le aparecerá en "Por confirmar" en su app para que la acepte o la rechace.', 'Compra asignada');
        this.cargarHistorialCliente(usuario.id);
      },
      error: (err) => {
        this.guardando.set(false);
        const texto = err.error?.error || 'Error al asignar la compra';
        this.mensaje.set({ tipo: 'error', texto });
        this.notificaciones.error(texto, 'No se pudo asignar la compra');
      },
    });
  }

  /** Cierra el resumen y vuelve al formulario para asignar otra compra al mismo cliente. */
  asignarOtraCompra() {
    this.compraAsignada.set(null);
    this.monto.set(null);
    this.pagoInicial.set(null);
    this.mensaje.set(null);
  }
}
