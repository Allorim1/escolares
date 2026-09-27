import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

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
  imports: [CommonModule],
  templateUrl: './creditos-eliminaciones.html',
  styleUrl: './creditos-eliminaciones.css',
})
export class CreditosEliminaciones implements OnInit {
  private http = inject(HttpClient);
  private readonly API = '/api/creditos/admin';

  solicitudes = signal<SolicitudEliminacion[]>([]);
  loading = signal(false);
  procesandoId = signal<string | null>(null);

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.loading.set(true);
    this.http.get<SolicitudEliminacion[]>(`${this.API}/eliminaciones`).subscribe({
      next: (data) => { this.solicitudes.set(data); this.loading.set(false); },
      error: (err) => { console.error('Error cargando solicitudes de eliminación:', err); this.loading.set(false); },
    });
  }

  aprobar(s: SolicitudEliminacion) {
    if (!confirm(`¿Eliminar la cuenta de ${s.nombre}? Sus datos personales y documentos se borran; no se puede deshacer.`)) return;
    this.procesandoId.set(s.id);
    this.http.post(`${this.API}/usuarios/${s.id}/eliminacion/aprobar`, {}).subscribe({
      next: () => { this.procesandoId.set(null); this.cargar(); },
      error: (err) => { this.procesandoId.set(null); alert(err.error?.error || 'Error al eliminar la cuenta'); },
    });
  }

  rechazar(s: SolicitudEliminacion) {
    const motivoSugerido = s.tieneCreditoPendiente ? 'Tienes un crédito activo pendiente; salda tu deuda antes de eliminar la cuenta' : '';
    const motivo = prompt('Motivo del rechazo (lo verá el cliente):', motivoSugerido);
    if (motivo === null) return;
    this.procesandoId.set(s.id);
    this.http.post(`${this.API}/usuarios/${s.id}/eliminacion/rechazar`, { motivo }).subscribe({
      next: () => { this.procesandoId.set(null); this.cargar(); },
      error: (err) => { this.procesandoId.set(null); alert(err.error?.error || 'Error al rechazar'); },
    });
  }
}
