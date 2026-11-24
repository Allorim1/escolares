import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge';

type Status = 'pendiente_verificacion' | 'verificado' | 'rechazado';
type Metodo = 'pago_movil' | 'transferencia';

interface Pago {
  id: string;
  solicitudId: string;
  usuarioId: string;
  usuarioNombre?: string;
  usuarioTelefono?: string;
  facturaNumero?: string;
  monto: number;
  metodo: Metodo;
  status: Status;
  createdAt: string;
  motivoRechazo?: string;
}

const PESTANAS: { value: Status | 'todos'; label: string }[] = [
  { value: 'pendiente_verificacion', label: 'Pendientes' },
  { value: 'verificado', label: 'Verificados' },
  { value: 'rechazado', label: 'Rechazados' },
  { value: 'todos', label: 'Todos' },
];

const METODO_LABEL: Record<Metodo, string> = {
  pago_movil: 'Pago MÃ³vil',
  transferencia: 'Transferencia',
};

@Component({
  selector: 'app-creditos-verificar-pagos',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, SkeletonComponent, StatusBadgeComponent],
  templateUrl: './creditos-verificar-pagos.html',
  styleUrl: './creditos-verificar-pagos.css',
})
export class CreditosVerificarPagos implements OnInit {
  private http = inject(HttpClient);
  private notificaciones = inject(NotificationModalService);
  private readonly API = '/api/creditos/admin/pagos';

  readonly pestanas = PESTANAS;
  pestanaActiva = signal<Status | 'todos'>('pendiente_verificacion');
  pagos = signal<Pago[]>([]);
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
    this.http.get<Pago[]>(url).subscribe({
      next: (data) => { this.pagos.set(data); this.loading.set(false); },
      error: (err) => { console.error('Error cargando pagos:', err); this.loading.set(false); this.notificaciones.fromHttpError(err, 'Error al cargar pagos'); },
    });
  }

  metodoLabel(metodo: Metodo): string {
    return METODO_LABEL[metodo];
  }

  etiqueta(status: Status): { texto: string; clase: string; tone: 'success'|'warning'|'danger'|'info'|'neutral' } {
    switch (status) {
      case 'pendiente_verificacion': return { texto: 'Por verificar', clase: 'badge-warning', tone: 'warning' };
      case 'verificado': return { texto: 'Verificado', clase: 'badge-success', tone: 'success' };
      case 'rechazado': return { texto: 'Rechazado', clase: 'badge-danger', tone: 'danger' };
    }
  }

  get totalPaginas(): number { return Math.max(1, Math.ceil(this.pagos().length / this.pageSize)); }
  get pagosPaginados(): Pago[] { const s=(this.paginaActual()-1)*this.pageSize; return this.pagos().slice(s, s+this.pageSize); }
  irPagina(p:number){ if(p<1||p>this.totalPaginas) return; this.paginaActual.set(p); }

  async verificar(p: Pago) {
    const ok = await this.notificaciones.confirm({ titulo: 'Confirmar acciÃ³n', mensaje: `Â¿Confirmas que $${p.monto.toFixed(2)} de ${p.usuarioNombre} (${this.metodoLabel(p.metodo)}) llegÃ³ al banco?`, tipo: 'warning', confirmarTexto: 'Confirmar' });
    if (!ok) return;
    this.procesandoId.set(p.id);
    this.http.post(`${this.API}/${p.id}/verificar`, {}).subscribe({
      next: () => {
        this.procesandoId.set(null);
        this.notificaciones.success('El pago quedÃ³ reflejado en la factura.', 'Pago verificado');
        this.cargar();
      },
      error: (err) => {
        this.procesandoId.set(null);
        this.notificaciones.fromHttpError(err, 'Error al verificar el pago', 'Error');
      },
    });
  }

  rechazar(p: Pago) {
    const motivo = prompt('Â¿Por quÃ© se rechaza? (lo verÃ¡ el cliente)');
    if (motivo === null) return;
    this.procesandoId.set(p.id);
    this.http.post(`${this.API}/${p.id}/rechazar`, { motivo }).subscribe({
      next: () => {
        this.procesandoId.set(null);
        this.cargar();
      },
      error: (err) => {
        this.procesandoId.set(null);
        this.notificaciones.fromHttpError(err, 'Error al rechazar el pago', 'Error');
      },
    });
  }
}
