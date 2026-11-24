import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge';

interface SolicitudEliminacion {
  id: string;
  nombre: string;
  telefono: string;
  email?: string;
  motivo?: string;
  solicitadaEn: string;
  tieneCreditoPendiente: boolean;
}

/** Solicitudes de eliminación de cuenta que mandan los clientes desde la app. No se borran
 *  de una vez: si tienen un crédito activo con saldo pendiente hay que rechazarlas hasta que
 *  lo salden (el aviso ya viene marcado en cada fila). */
@Component({
  selector: 'app-creditos-eliminaciones',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, SkeletonComponent, StatusBadgeComponent],
  templateUrl: './creditos-eliminaciones.html',
  styleUrl: './creditos-eliminaciones.css',
})
export class CreditosEliminaciones implements OnInit {
  private http = inject(HttpClient);
  private notifications = inject(NotificationModalService);
  private readonly API = '/api/creditos/admin';

  solicitudes = signal<SolicitudEliminacion[]>([]);
  loading = signal(false);
  procesandoId = signal<string | null>(null);
  paginaActual = signal(1);
  readonly pageSize = 10;

  get totalPaginas(): number { return Math.max(1, Math.ceil(this.solicitudes().length / this.pageSize)); }
  get paginadas(): SolicitudEliminacion[] { const s=(this.paginaActual()-1)*this.pageSize; return this.solicitudes().slice(s,s+this.pageSize); }
  irPagina(p:number){ if(p<1||p>this.totalPaginas) return; this.paginaActual.set(p); }

  async ngOnInit() {
    this.cargar();
  }

  async cargar() {
    this.loading.set(true);
    this.http.get<SolicitudEliminacion[]>(`${this.API}/eliminaciones`).subscribe({
      next: (data) => { this.solicitudes.set(data); this.paginaActual.set(1); this.loading.set(false); },
      error: (err) => { console.error('Error cargando solicitudes de eliminación:', err); this.loading.set(false); this.notifications.fromHttpError(err, 'Error cargando solicitudes de eliminación:'); },
    });
  }

  async aprobar(s: SolicitudEliminacion) {
    const ok = await this.notifications.confirm({ titulo: 'Confirmar eliminación', mensaje: `¿Eliminar la cuenta de ${s.nombre}? Sus datos personales y documentos se borran; no se puede deshacer.`, tipo: 'danger', confirmarTexto: 'Eliminar' });
    if (!ok) return;
    this.procesandoId.set(s.id);
    this.http.post(`${this.API}/usuarios/${s.id}/eliminacion/aprobar`, {}).subscribe({
      next: () => { this.procesandoId.set(null); this.cargar(); },
      error: (err) => { this.procesandoId.set(null); this.notifications.fromHttpError(err, 'Error al eliminar la cuenta'); },
    });
  }

  rechazar(s: SolicitudEliminacion) {
    const motivoSugerido = s.tieneCreditoPendiente ? 'Tienes un crédito activo pendiente; salda tu deuda antes de eliminar la cuenta' : '';
    const motivo = prompt('Motivo del rechazo (lo verá el cliente):', motivoSugerido);
    if (motivo === null) return;
    this.procesandoId.set(s.id);
    this.http.post(`${this.API}/usuarios/${s.id}/eliminacion/rechazar`, { motivo }).subscribe({
      next: () => { this.procesandoId.set(null); this.cargar(); },
      error: (err) => { this.procesandoId.set(null); this.notifications.fromHttpError(err, 'Error al rechazar'); },
    });
  }
}