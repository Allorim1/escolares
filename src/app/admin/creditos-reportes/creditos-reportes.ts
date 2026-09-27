import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface Reportes {
  usuarios: { total: number; verificados: number };
  credito: {
    totalOtorgado: number;
    saldoPendienteActivos: number;
    clientesActivos: number;
    clientesConMora: number;
    clientesConMoraGrave: number;
    montoEnMoraGrave: number;
  };
  porEstado: Record<string, { cantidad: number; monto: number }>;
  porNivel: Record<string, number>;
  tickets: { abierto: number; en_proceso: number; cerrado: number; pagoAtrasado: number };
}

const NOMBRE_ESTADO: Record<string, string> = {
  pendiente_aceptacion: 'Por confirmar',
  esperando_pago: 'Falta el pago inicial',
  solicitado: 'Pendientes',
  activo: 'Activos',
  pagado: 'Pagados',
  rechazado: 'Rechazados',
};

/** Reportes del negocio de créditos: cuánto se ha otorgado, cuánto está pendiente de cobro,
 *  mora y el estado del Centro de Ayuda. Todo calculado al vuelo en el backend. */
@Component({
  selector: 'app-creditos-reportes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './creditos-reportes.html',
  styleUrl: './creditos-reportes.css',
})
export class CreditosReportes implements OnInit {
  private http = inject(HttpClient);

  reportes = signal<Reportes | null>(null);
  loading = signal(false);

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.loading.set(true);
    this.http.get<Reportes>('/api/creditos/admin/reportes').subscribe({
      next: (data) => { this.reportes.set(data); this.loading.set(false); },
      error: (err) => { console.error('Error cargando reportes:', err); this.loading.set(false); },
    });
  }

  filas(): { estado: string; nombre: string; cantidad: number; monto: number }[] {
    const r = this.reportes();
    if (!r) return [];
    return Object.entries(r.porEstado).map(([estado, v]) => ({
      estado,
      nombre: NOMBRE_ESTADO[estado] ?? estado,
      cantidad: v.cantidad,
      monto: v.monto,
    }));
  }

  filasNivel(): { nivel: string; cantidad: number }[] {
    const r = this.reportes();
    if (!r) return [];
    return Object.entries(r.porNivel)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([nivel, cantidad]) => ({ nivel, cantidad }));
  }
}
