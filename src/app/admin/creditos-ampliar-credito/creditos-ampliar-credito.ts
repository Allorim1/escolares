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
  limite: number;
  extensionCredito?: number;
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

interface Puntualidad {
  cuotasEvaluadas: number;
  cuotasATiempo: number;
  porcentaje: number;
}

@Component({
  selector: 'app-creditos-ampliar-credito',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creditos-ampliar-credito.html',
  styleUrl: './creditos-ampliar-credito.css',
})
export class CreditosAmpliarCredito {
  private http = inject(HttpClient);
  private notificaciones = inject(NotificationModalService);
  private readonly API = '/api/creditos/admin';

  // Búsqueda de usuario
  buscarTexto = '';
  usuariosEncontrados = signal<CreditoUsuarioBusqueda[]>([]);
  buscando = signal(false);
  usuarioSeleccionado = signal<CreditoUsuarioBusqueda | null>(null);

  puntualidad = signal<Puntualidad | null>(null);
  cargandoPuntualidad = signal(false);

  historial = signal<SolicitudHistorial[]>([]);
  cargandoHistorial = signal(false);

  extensionNueva = signal<number | null>(null);
  guardando = signal(false);

  private timeoutBusqueda: ReturnType<typeof setTimeout> | null = null;

  limiteBase = computed(() => {
    const u = this.usuarioSeleccionado();
    if (!u) return 0;
    return Math.round((u.limite - (u.extensionCredito ?? 0)) * 100) / 100;
  });

  onBuscar() {
    if (this.timeoutBusqueda) clearTimeout(this.timeoutBusqueda);
    const termino = this.buscarTexto.trim();
    if (!termino) {
      this.usuariosEncontrados.set([]);
      return;
    }
    this.timeoutBusqueda = setTimeout(() => {
      this.buscando.set(true);
      this.http.get<CreditoUsuarioBusqueda[]>(`${this.API}/usuarios/buscar?q=${encodeURIComponent(termino)}`).subscribe({
        next: (data) => { this.usuariosEncontrados.set(data); this.buscando.set(false); },
        error: () => this.buscando.set(false),
      });
    }, 300);
  }

  seleccionar(u: CreditoUsuarioBusqueda) {
    this.usuarioSeleccionado.set(u);
    this.usuariosEncontrados.set([]);
    this.buscarTexto = '';
    this.extensionNueva.set(u.extensionCredito ?? 0);
    this.cargarPuntualidad(u.id);
    this.cargarHistorial(u.id);
  }

  cambiarUsuario() {
    this.usuarioSeleccionado.set(null);
    this.puntualidad.set(null);
    this.historial.set([]);
    this.extensionNueva.set(null);
  }

  cargarPuntualidad(usuarioId: string) {
    this.cargandoPuntualidad.set(true);
    this.http.get<Puntualidad>(`${this.API}/usuarios/${usuarioId}/puntualidad`).subscribe({
      next: (data) => { this.puntualidad.set(data); this.cargandoPuntualidad.set(false); },
      error: () => { this.puntualidad.set(null); this.cargandoPuntualidad.set(false); },
    });
  }

  cargarHistorial(usuarioId: string) {
    this.cargandoHistorial.set(true);
    this.http.get<SolicitudHistorial[]>(`${this.API}/solicitudes?usuarioId=${usuarioId}`).subscribe({
      next: (data) => { this.historial.set(data); this.cargandoHistorial.set(false); },
      error: () => { this.historial.set([]); this.cargandoHistorial.set(false); },
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

  clasePuntualidad(): string {
    const p = this.puntualidad();
    if (!p) return '';
    if (p.porcentaje >= 80) return 'buena';
    if (p.porcentaje >= 50) return 'regular';
    return 'mala';
  }

  guardarExtension() {
    const u = this.usuarioSeleccionado();
    const monto = this.extensionNueva();
    if (!u || monto == null || monto < 0) return;

    this.guardando.set(true);
    this.http.post<CreditoUsuarioBusqueda>(`${this.API}/usuarios/${u.id}/extension-credito`, { monto }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.notificaciones.success(`Ahora ${u.nombre} tiene $${monto.toFixed(2)} de crédito adicional.`, 'Crédito ampliado');
        // Se refresca desde la búsqueda para traer el disponible/limite recalculados.
        this.http.get<CreditoUsuarioBusqueda[]>(`${this.API}/usuarios/buscar?q=${encodeURIComponent(u.telefono)}`).subscribe((data) => {
          const actualizado = data.find((x) => x.id === u.id);
          if (actualizado) this.usuarioSeleccionado.set(actualizado);
        });
      },
      error: (err) => {
        this.guardando.set(false);
        this.notificaciones.error(err.error?.error || 'No se pudo ampliar el crédito', 'Error');
      },
    });
  }
}
