import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge';

interface SolicitudRestablecimiento {
  id: string;
  nombre: string;
  telefono: string;
  solicitadaEn: string;
}

/** Clientes sin email registrado que pidieron "olvidé mi contraseña" desde la app: no se les
 *  puede mandar un código, así que hay que llamarlos y darles una contraseña temporal a mano. */
@Component({
  selector: 'app-creditos-restablecimientos',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, SkeletonComponent, StatusBadgeComponent],
  templateUrl: './creditos-restablecimientos.html',
  styleUrl: './creditos-restablecimientos.css',
})
export class CreditosRestablecimientos implements OnInit {
  private http = inject(HttpClient);
  private notifications = inject(NotificationModalService);
  private readonly API = '/api/creditos/admin';

  solicitudes = signal<SolicitudRestablecimiento[]>([]);
  loading = signal(false);
  procesandoId = signal<string | null>(null);
  paginaActual = signal(1);
  readonly pageSize = 10;

  get totalPaginas(): number { return Math.max(1, Math.ceil(this.solicitudes().length / this.pageSize)); }
  get paginadas(): SolicitudRestablecimiento[] { const s=(this.paginaActual()-1)*this.pageSize; return this.solicitudes().slice(s,s+this.pageSize); }
  irPagina(p:number){ if(p<1||p>this.totalPaginas) return; this.paginaActual.set(p); }

  async ngOnInit() {
    this.cargar();
  }

  async cargar() {
    this.loading.set(true);
    this.http.get<SolicitudRestablecimiento[]>(`${this.API}/restablecimientos`).subscribe({
      next: (data) => { this.solicitudes.set(data); this.paginaActual.set(1); this.loading.set(false); },
      error: (err) => { console.error('Error al cargar restablecimientos', err); this.loading.set(false); this.notifications.fromHttpError(err, 'Error al cargar restablecimientos'); },
    });
  }

  async restablecer(s: SolicitudRestablecimiento) {
    const ok = await this.notifications.confirm({ titulo: 'Confirmar acción', mensaje: `¿Generar una contraseña temporal para ${s.nombre}? Confirma primero su identidad por teléfono.`, tipo: 'warning', confirmarTexto: 'Confirmar' });
    if (!ok) return;
    this.procesandoId.set(s.id);
    this.http.post<{ passwordTemporal: string }>(`${this.API}/usuarios/${s.id}/restablecer-password`, {}).subscribe({
      next: (res) => {
        this.procesandoId.set(null);
        this.notifications.success(`Contraseña temporal para ${s.nombre}: ${res.passwordTemporal}. Díctasela por teléfono.`, 'Contraseña temporal generada');
        this.cargar();
      },
      error: (err) => { this.procesandoId.set(null); this.notifications.fromHttpError(err, 'Error al restablecer la contraseña'); },
    });
  }
}