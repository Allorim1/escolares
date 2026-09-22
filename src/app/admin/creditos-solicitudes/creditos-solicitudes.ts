import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

type Status = 'solicitado' | 'activo' | 'pagado' | 'rechazado';

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
  status: Status;
  createdAt: string;
  motivoRechazo?: string;
}

const PESTANAS: { value: Status | 'todos'; label: string }[] = [
  { value: 'solicitado', label: 'Pendientes' },
  { value: 'activo', label: 'Activos' },
  { value: 'pagado', label: 'Pagados' },
  { value: 'rechazado', label: 'Rechazados' },
  { value: 'todos', label: 'Todos' },
];

@Component({
  selector: 'app-creditos-solicitudes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './creditos-solicitudes.html',
  styleUrl: './creditos-solicitudes.css',
})
export class CreditosSolicitudes implements OnInit {
  private http = inject(HttpClient);
  private readonly API = '/api/creditos/admin/solicitudes';

  readonly pestanas = PESTANAS;
  pestanaActiva = signal<Status | 'todos'>('solicitado');
  solicitudes = signal<Solicitud[]>([]);
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
    this.http.get<Solicitud[]>(url).subscribe({
      next: (data) => { this.solicitudes.set(data); this.loading.set(false); },
      error: (err) => { console.error('Error cargando solicitudes:', err); this.loading.set(false); },
    });
  }

  etiqueta(status: Status): { texto: string; clase: string } {
    switch (status) {
      case 'activo': return { texto: 'Activo', clase: 'badge-primary' };
      case 'pagado': return { texto: 'Pagado', clase: 'badge-success' };
      case 'rechazado': return { texto: 'Rechazado', clase: 'badge-danger' };
      default: return { texto: 'Pendiente', clase: 'badge-warning' };
    }
  }

  aprobar(s: Solicitud) {
    if (!confirm(`¿Aprobar el crédito de ${s.usuarioNombre} por $${s.monto}?`)) return;
    this.procesandoId.set(s.id);
    this.http.post(`${this.API}/${s.id}/aprobar`, {}).subscribe({
      next: () => { this.procesandoId.set(null); this.cargar(); },
      error: (err) => { this.procesandoId.set(null); alert(err.error?.error || 'Error al aprobar'); },
    });
  }

  rechazar(s: Solicitud) {
    const motivo = prompt('Motivo del rechazo (lo verá el usuario):');
    if (motivo === null) return;
    this.procesandoId.set(s.id);
    this.http.post(`${this.API}/${s.id}/rechazar`, { motivo }).subscribe({
      next: () => { this.procesandoId.set(null); this.cargar(); },
      error: (err) => { this.procesandoId.set(null); alert(err.error?.error || 'Error al rechazar'); },
    });
  }

  registrarPago(s: Solicitud) {
    if (!confirm(`¿Registrar el pago de la cuota ${s.cuotasPagadas + 1} de ${s.cuotas}?`)) return;
    this.procesandoId.set(s.id);
    this.http.post(`${this.API}/${s.id}/registrar-pago`, {}).subscribe({
      next: () => { this.procesandoId.set(null); this.cargar(); },
      error: (err) => { this.procesandoId.set(null); alert(err.error?.error || 'Error al registrar el pago'); },
    });
  }
}
