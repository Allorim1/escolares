import { Component, signal, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

interface CostoGuardado {
  _id?: any;
  nombre?: string;
  costo: number;
  iva: number;
  cargoPersonalizado: number;
  cargoPersonalizadoPorcentaje: number;
  dolar: number;
  euro: number;
  binance: number;
  pvpBsf: number;
  pvpDolar: number;
  tasaPvp: string;
  ivaActivo: boolean;
  fecha: Date;
  idProducto?: number;
}

interface Reporte {
  _id?: any;
  nombre: string;
  numero: number;
  tipo: 'Nota' | 'Factura';
  fecha: Date;
  data: CostoGuardado[];
}

interface ProductoHistorico {
  idProducto: number;
  nombreProducto: string;
  mejorProveedor: string;
  menorCosto: number;
  mayorUtilidad: number;
  mayorUtilidadPorcentaje: number;
  registros: {
    proveedor: string;
    numeroReporte: number;
    costo: number;
    utilidad: number;
    utilidadPorcentaje: number;
    pvpDolar: number;
    tasaPvp: string;
  }[];
}

@Component({
  selector: 'app-historico-costos',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './historico-costos.html',
  styleUrl: './historico-costos.css',
})
export class HistoricoCostos implements OnInit {
  private http = inject(HttpClient);

  reportes = signal<Reporte[]>([]);
  productosHistoricos = signal<ProductoHistorico[]>([]);
  loading = signal(true);
  filtroNombre = '';
  productosExpandidos = new Set<string>();

  private readonly API_COSTOS = '/api/costos';

  ngOnInit() {
    this.loadReportes();
  }

  loadReportes() {
    this.loading.set(true);
    this.http
      .get<Reporte[]>(this.API_COSTOS)
      .pipe(
        catchError((err) => {
          console.error('Error loading reportes:', err);
          return of([]);
        }),
      )
      .subscribe((data) => {
        this.reportes.set(data);
        this.calcularHistorico();
        this.loading.set(false);
      });
  }

  calcularHistorico() {
    const productosMap = new Map<string, ProductoHistorico>();

    for (const reporte of this.reportes()) {
      for (let i = 0; i < reporte.data.length; i++) {
        const item = reporte.data[i];
        
        if (!item.nombre || !item.nombre.trim()) {
          continue;
        }

        const nombreKey = item.nombre.toLowerCase();
        const nombreProducto = item.nombre;
        const idProducto = item.idProducto || 0;

        if (!productosMap.has(nombreKey)) {
          productosMap.set(nombreKey, {
            idProducto,
            nombreProducto,
            mejorProveedor: reporte.nombre,
            menorCosto: item.costo,
            mayorUtilidad: item.cargoPersonalizado,
            mayorUtilidadPorcentaje: item.cargoPersonalizadoPorcentaje || 0,
            registros: [],
          });
        }

        const producto = productosMap.get(nombreKey)!;

        if (idProducto && idProducto !== producto.idProducto) {
          producto.idProducto = idProducto;
        }

        if (item.costo < producto.menorCosto) {
          producto.menorCosto = item.costo;
          producto.mejorProveedor = reporte.nombre;
        }

        if (item.cargoPersonalizado > producto.mayorUtilidad) {
          producto.mayorUtilidad = item.cargoPersonalizado;
          producto.mayorUtilidadPorcentaje = item.cargoPersonalizadoPorcentaje || 0;
        }

        producto.registros.push({
          proveedor: reporte.nombre,
          numeroReporte: reporte.numero,
          costo: item.costo,
          utilidad: item.cargoPersonalizado,
          utilidadPorcentaje: item.cargoPersonalizadoPorcentaje || 0,
          pvpDolar: item.pvpDolar,
          tasaPvp: item.tasaPvp,
        });
      }
    }

    const productosArray = Array.from(productosMap.values());
    this.productosHistoricos.set(productosArray);
  }

  get productosFiltrados() {
    if (!this.filtroNombre.trim()) {
      return this.productosHistoricos();
    }
    const filtro = this.filtroNombre.toLowerCase();
    return this.productosHistoricos().filter(
      (p) =>
        p.nombreProducto.toLowerCase().includes(filtro) ||
        p.mejorProveedor.toLowerCase().includes(filtro) ||
        p.idProducto.toString().includes(filtro)
    );
  }

  formatNumero(numero: number): string {
    return numero.toString().padStart(7, '0');
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-VE').format(valor);
  }

  toggleRegistros(nombreProducto: string) {
    const key = nombreProducto.toLowerCase();
    if (this.productosExpandidos.has(key)) {
      this.productosExpandidos.delete(key);
    } else {
      this.productosExpandidos.add(key);
    }
  }
}
