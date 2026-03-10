import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Factura {
  _id?: string;
  cliente: string;
  productos: any[];
  total: number;
  estado: 'pendiente' | 'pagado';
  fecha: Date;
  fechaPago?: Date;
}

export interface ResumenFacturas {
  dineroEntrante: number;
  dineroReal: number;
  brecha: number;
  totalFacturas: number;
  pendientes: number;
  pagadas: number;
  porMes: { mes: string; entrante: number; real: number }[];
}

@Injectable({
  providedIn: 'root',
})
export class FacturaService {
  private readonly API_URL = '/api/facturas';

  facturas = signal<Factura[]>([]);
  resumen = signal<ResumenFacturas | null>(null);

  constructor(private http: HttpClient) {
    this.loadFacturas();
    this.loadResumen();
  }

  loadFacturas() {
    this.http.get<Factura[]>(this.API_URL).subscribe({
      next: (data) => this.facturas.set(data),
      error: (err) => console.error('Error cargando facturas:', err),
    });
  }

  loadResumen() {
    this.http.get<ResumenFacturas>(`${this.API_URL}/resumen`).subscribe({
      next: (data) => this.resumen.set(data),
      error: (err) => console.error('Error cargando resumen:', err),
    });
  }

  crearFactura(cliente: string, productos: any[], total: number) {
    const factura = { cliente, productos, total, estado: 'pendiente' };
    this.http.post(this.API_URL, factura).subscribe({
      next: () => {
        this.loadFacturas();
        this.loadResumen();
      },
      error: (err) => console.error('Error creando factura:', err),
    });
  }

  marcarPagada(id: string) {
    this.http.put(`${this.API_URL}/${id}`, { estado: 'pagado' }).subscribe({
      next: () => {
        this.loadFacturas();
        this.loadResumen();
      },
      error: (err) => console.error('Error marcando factura:', err),
    });
  }

  eliminarFactura(id: string) {
    this.http.delete(`${this.API_URL}/${id}`).subscribe({
      next: () => {
        this.loadFacturas();
        this.loadResumen();
      },
      error: (err) => console.error('Error eliminando factura:', err),
    });
  }
}
