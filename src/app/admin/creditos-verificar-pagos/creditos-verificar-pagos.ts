import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';

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
  pago_movil: 'Pago Móvil',
  transferencia: 'Transferencia',
};

@Component({
  selector: 'app-creditos-verificar-pagos',
  standalone: true,
  imports: [CommonModule],
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

  ngOnInit() {
    this.cargar();
  }

  cambiarPestana(valor: Status | 'todos') {
    this.pestanaActiva.set(valor);
    this.cargar();
  }

  cargar() {
    this.loading.set(true);
    const estado = this.pestanaActiva();
    const url = estado === 'todos' ? this.API : `${this.API}?status=${estado}`;
    this.http.get<Pago[]>(url).subscribe({
      next: (data) => { this.pagos.set(data); this.loading.set(false); },
      error: (err) => { console.error('Error cargando pagos:', err); this.loading.set(false); },
    });
  }

  metodoLabel(metodo: Metodo): string {
    return METODO_LABEL[metodo];
  }

  etiqueta(status: Status): { texto: string; clase: string } {
    switch (status) {
      case 'pendiente_verificacion': return { texto: 'Por verificar', clase: 'badge-warning' };
      case 'verificado': return { texto: 'Verificado', clase: 'badge-success' };
      case 'rechazado': return { texto: 'Rechazado', clase: 'badge-danger' };
    }
  }

  verificar(p: Pago) {
    if (!confirm(`¿Confirmas que $${p.monto.toFixed(2)} de ${p.usuarioNombre} (${this.metodoLabel(p.metodo)}) llegó al banco?`)) return;
    this.procesandoId.set(p.id);
    this.http.post(`${this.API}/${p.id}/verificar`, {}).subscribe({
      next: () => {
        this.procesandoId.set(null);
        this.notificaciones.success('El pago quedó reflejado en la factura.', 'Pago verificado');
        this.cargar();
      },
      error: (err) => {
        this.procesandoId.set(null);
        this.notificaciones.error(err.error?.error || 'Error al verificar el pago', 'Error');
      },
    });
  }

  rechazar(p: Pago) {
    const motivo = prompt('¿Por qué se rechaza? (lo verá el cliente)');
    if (motivo === null) return;
    this.procesandoId.set(p.id);
    this.http.post(`${this.API}/${p.id}/rechazar`, { motivo }).subscribe({
      next: () => {
        this.procesandoId.set(null);
        this.cargar();
      },
      error: (err) => {
        this.procesandoId.set(null);
        this.notificaciones.error(err.error?.error || 'Error al rechazar el pago', 'Error');
      },
    });
  }
}
