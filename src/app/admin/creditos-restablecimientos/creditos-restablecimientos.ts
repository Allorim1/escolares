import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton';

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
  imports: [CommonModule, EmptyStateComponent, SkeletonComponent],
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

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.loading.set(true);
    this.http.get<SolicitudRestablecimiento[]>(`${this.API}/restablecimientos`).subscribe({
      next: (data) => { this.solicitudes.set(data); this.loading.set(false); },
      error: (err) => { console.error('Error al cargar restablecimientos', err); this.loading.set(false); this.notifications.fromHttpError(err, 'Error al cargar restablecimientos'); },
    });
  }

  restablecer(s: SolicitudRestablecimiento) {
    if (!confirm(`¿Generar una contraseña temporal para ${s.nombre}? Confirma primero su identidad por teléfono.`)) return;
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
