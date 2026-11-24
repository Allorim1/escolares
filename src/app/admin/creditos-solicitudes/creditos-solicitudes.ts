import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge';

type Status = 'pendiente_aceptacion' | 'esperando_pago' | 'solicitado' | 'activo' | 'pagado' | 'rechazado';

interface Solicitud {
  id: string;
  usuarioId: string;
  usuarioNombre?: string;
  usuarioTelefono?: string;
  monto: number;
  cuotas: number;
  cuotaMonto: number;
  total: number;
  cuotasPagadas: number;
  proposito: string;
  productoNombre?: string;
  items?: { nombre: string; cantidad: number }[];
  status: Status;
  createdAt: string;
  motivoRechazo?: string;
  pagoInicial?: number;
  factura?: { iva: number; total: number };
  /** DÃ­as de atraso de la cuota mÃ¡s vieja sin pagar (0 si va al dÃ­a o no estÃ¡ activo). */
  diasAtraso?: number;
}

const PESTANAS: { value: Status | 'todos'; label: string }[] = [
  { value: 'pendiente_aceptacion', label: 'Por confirmar (cliente)' },
  { value: 'esperando_pago', label: 'Falta el pago inicial' },
  { value: 'solicitado', label: 'Pendientes' },
  { value: 'activo', label: 'Activos' },
  { value: 'pagado', label: 'Pagados' },
  { value: 'rechazado', label: 'Rechazados' },
  { value: 'todos', label: 'Todos' },
];

@Component({
  selector: 'app-creditos-solicitudes',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, SkeletonComponent, StatusBadgeComponent],
  templateUrl: './creditos-solicitudes.html',
  styleUrl: './creditos-solicitudes.css',
})
export class CreditosSolicitudes implements OnInit {
  private http = inject(HttpClient);
  private notifications = inject(NotificationModalService);
  private readonly API = '/api/creditos/admin/solicitudes';

  readonly pestanas = PESTANAS;
  pestanaActiva = signal<Status | 'todos'>('pendiente_aceptacion');
  solicitudes = signal<Solicitud[]>([]);
  loading = signal(false);
  procesandoId = signal<string | null>(null);
  paginaActual = signal(1);
  readonly pageSize = 10;

  async ngOnInit() {
    this.cargar();
  }

  async cambiarPestana(valor: Status | 'todos') {
    this.pestanaActiva.set(valor);
    this.paginaActual.set(1);
    this.cargar();
  }

  async cargar() {
    this.loading.set(true);
    const estado = this.pestanaActiva();
    const url = estado === 'todos' ? this.API : `${this.API}?status=${estado}`;
    this.http.get<Solicitud[]>(url).subscribe({
      next: (data) => { this.solicitudes.set(data); this.paginaActual.set(1); this.loading.set(false); },
      error: (err) => { console.error('Error cargando solicitudes:', err); this.loading.set(false); this.notifications.fromHttpError(err, 'Error al cargar solicitudes'); },
    });
  }

  etiqueta(status: Status): { texto: string; clase: string; tone: 'success'|'warning'|'danger'|'info'|'neutral' } {
    switch (status) {
      case 'pendiente_aceptacion': return { texto: 'Por confirmar', clase: 'badge-tertiary', tone: 'info' };
      case 'esperando_pago': return { texto: 'Falta el pago inicial', clase: 'badge-warning', tone: 'warning' };
      case 'activo': return { texto: 'Activo', clase: 'badge-primary', tone: 'info' };
      case 'pagado': return { texto: 'Pagado', clase: 'badge-success', tone: 'success' };
      case 'rechazado': return { texto: 'Rechazado', clase: 'badge-danger', tone: 'danger' };
      default: return { texto: 'Pendiente', clase: 'badge-warning', tone: 'warning' };
    }
  }

  descripcion(s: Solicitud): string {
    if (s.items?.length) return s.items.map((i) => `${i.cantidad}Ã— ${i.nombre}`).join(', ');
    return s.productoNombre || s.proposito || 'â€”';
  }

  async aprobar(s: Solicitud) {
    const ok = await this.notifications.confirm({ titulo: 'Confirmar acciÃ³n', mensaje: `Â¿Aprobar el crÃ©dito de ${s.usuarioNombre} por $${s.monto}?`, tipo: 'warning', confirmarTexto: 'Confirmar' });
    if (!ok) return;
    this.procesandoId.set(s.id);
    this.http.post(`${this.API}/${s.id}/aprobar`, {}).subscribe({
      next: () => { this.procesandoId.set(null); this.cargar(); },
      error: (err) => { this.procesandoId.set(null); this.notifications.fromHttpError(err, 'Error al aprobar'); },
    });
  }

  async rechazar(s: Solicitud) {
    const motivo = prompt('Motivo del rechazo (lo verÃ¡ el usuario):');
    if (motivo === null) return;
    this.procesandoId.set(s.id);
    this.http.post(`${this.API}/${s.id}/rechazar`, { motivo }).subscribe({
      next: () => { this.procesandoId.set(null); this.cargar(); },
      error: (err) => { this.procesandoId.set(null); this.notifications.fromHttpError(err, 'Error al rechazar'); },
    });
  }

  async cancelar(s: Solicitud) {
    const motivo = prompt('Â¿Por quÃ© la cancelas? (opcional; se guarda como motivo)');
    if (motivo === null) return;
    this.procesandoId.set(s.id);
    this.http.post(`${this.API}/${s.id}/cancelar`, { motivo }).subscribe({
      next: () => { this.procesandoId.set(null); this.cargar(); },
      error: (err) => { this.procesandoId.set(null); this.notifications.fromHttpError(err, 'Error al cancelar'); },
    });
  }

  /** El staff confirma que ya recibiÃ³ (efectivo/transferencia) el pago inicial del cliente. */
  async confirmarPago(s: Solicitud) {
    const ok = await this.notifications.confirm({ titulo: 'Confirmar acciÃ³n', mensaje: `Â¿Confirmar que recibiste $${(s.pagoInicial ?? 0).toFixed(2)} de pago inicial de ${s.usuarioNombre}?`, tipo: 'warning', confirmarTexto: 'Confirmar' });
    if (!ok) return;
    this.procesandoId.set(s.id);
    this.http.post(`${this.API}/${s.id}/confirmar-pago`, {}).subscribe({
      next: () => { this.procesandoId.set(null); this.cargar(); },
      error: (err) => { this.procesandoId.set(null); this.notifications.fromHttpError(err, 'Error al confirmar el pago'); },
    });
  }

  async registrarPago(s: Solicitud) {
    const ok = await this.notifications.confirm({ titulo: 'Confirmar acciÃ³n', mensaje: `Â¿Registrar el pago de la cuota ${s.cuotasPagadas + 1} de ${s.cuotas}?`, tipo: 'warning', confirmarTexto: 'Confirmar' });
    if (!ok) return;
    this.procesandoId.set(s.id);
    this.http.post(`${this.API}/${s.id}/registrar-pago`, {}).subscribe({
      next: () => { this.procesandoId.set(null); this.cargar(); },
      error: (err) => { this.procesandoId.set(null); this.notifications.fromHttpError(err, 'Error al registrar el pago'); },
    });
  }

  /** Abre un caso en el Centro de Ayuda contra esta compra (solo si lleva mÃ¡s de 7 dÃ­as de atraso). */
  get totalPaginas(): number { return Math.max(1, Math.ceil(this.solicitudes().length / this.pageSize)); }
  get paginadas(): Solicitud[] { const s=(this.paginaActual()-1)*this.pageSize; return this.solicitudes().slice(s,s+this.pageSize); }
  irPagina(p:number){ if(p<1||p>this.totalPaginas) return; this.paginaActual.set(p); }

  async abrirCaso(s: Solicitud) {
    const ok = await this.notifications.confirm({ titulo: 'Confirmar acciÃ³n', mensaje: `Â¿Abrir un caso de pago atrasado para ${s.usuarioNombre} (${s.diasAtraso} dÃ­as)?`, tipo: 'warning', confirmarTexto: 'Confirmar' });
    if (!ok) return;
    this.procesandoId.set(s.id);
    this.http.post('/api/creditos/admin/tickets/pago-atrasado', { solicitudId: s.id }).subscribe({
      next: () => { this.procesandoId.set(null); this.cargar(); },
      error: (err) => { this.procesandoId.set(null); this.notifications.fromHttpError(err, 'Error al abrir el caso'); },
    });
  }
}
