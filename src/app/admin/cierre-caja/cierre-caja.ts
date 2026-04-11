import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CurrencyService } from '../../shared/data-access/currency.service';

interface CierreCajaData {
  _id?: string;
  fecha: Date;
  usuario: string;
  saldoInicial: number;
  cajas: any;
  totalGastos: number;
  saldoFinal: number;
  observaciones: string;
  diferencia?: number;
}

interface RCEntry {
  monto: number;
  hora: Date;
  descripcion: string;
}

interface CajaData {
  id: string;
  nombre: string;
  metodos: { id: string; nombre: string }[];
}

@Component({
  selector: 'app-cierre-caja',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cierre-caja.html',
  styleUrl: './cierre-caja.css',
})
export class CierreCaja implements OnInit {
  private http = inject(HttpClient);
  private currencyService = inject(CurrencyService);

  cierres = signal<CierreCajaData[]>([]);
  loading = signal(false);

  fechaBuscar = '';
  cierresFiltrados: CierreCajaData[] = [];

  cajaDataList: CajaData[] = [
    { id: '1A', nombre: 'Caja 1A', metodos: [
      { id: 'efectivo', nombre: 'Efectivo' },
      { id: 'debito', nombre: 'Débito' },
      { id: 'huella', nombre: 'Biopago' },
      { id: 'divisa', nombre: 'Divisa' },
      { id: 'pagoMovil', nombre: 'Pago Móvil' },
      { id: 'rc', nombre: 'RC' },
      { id: 'gastos', nombre: 'Gastos' }
    ]},
    { id: '2B', nombre: 'Caja 2B', metodos: [
      { id: 'efectivo', nombre: 'Efectivo' },
      { id: 'debito', nombre: 'Débito' },
      { id: 'huella', nombre: 'Biopago' },
      { id: 'divisa', nombre: 'Divisa' },
      { id: 'pagoMovil', nombre: 'Pago Móvil' },
      { id: 'rc', nombre: 'RC' },
      { id: 'gastos', nombre: 'Gastos' }
    ]},
    { id: '3C', nombre: 'Caja 3C', metodos: [
      { id: 'efectivo', nombre: 'Efectivo' },
      { id: 'debito', nombre: 'Débito' },
      { id: 'huella', nombre: 'Biopago' },
      { id: 'divisa', nombre: 'Divisa' },
      { id: 'pagoMovil', nombre: 'Pago Móvil' },
      { id: 'rc', nombre: 'RC' },
      { id: 'gastos', nombre: 'Gastos' }
    ]},
    { id: '4D', nombre: 'Caja 4D', metodos: [
      { id: 'efectivo', nombre: 'Efectivo' },
      { id: 'debito', nombre: 'Débito' },
      { id: 'huella', nombre: 'Biopago' },
      { id: 'divisa', nombre: 'Divisa' },
      { id: 'pagoMovil', nombre: 'Pago Móvil' },
      { id: 'rc', nombre: 'RC' },
      { id: 'gastos', nombre: 'Gastos' }
    ]}
  ];

  cajasValues: Record<string, Record<string, number>> = {};
  rcEntries: Record<string, RCEntry[]> = {};

  nuevoCierre = {
    saldoInicial: 0,
    totalGastos: 0,
    observaciones: ''
  };
  
  saldoCalculado = 0;
  diferencia = 0;
  totalIngresosCalculado = 0;
  rcNuevoMonto = 0;
  rcDescripcion = '';

  ngOnInit() {
    this.inicializarCajas();
    this.cargarCierres();
  }

  private inicializarCajas() {
    this.cajaDataList.forEach(caja => {
      this.cajasValues[caja.id] = {};
      this.rcEntries[caja.id] = [];
      caja.metodos.forEach(metodo => {
        this.cajasValues[caja.id][metodo.id] = 0;
      });
    });
  }

  agregarRC(cajaId: string, monto: number, descripcion: string = '') {
    if (monto <= 0 || !cajaId) return;
    
    if (!this.rcEntries[cajaId]) {
      this.rcEntries[cajaId] = [];
    }
    
    this.rcEntries[cajaId].push({
      monto,
      hora: new Date(),
      descripcion
    });
    
    this.cajasValues[cajaId]['rc'] = (this.cajasValues[cajaId]['rc'] || 0) + monto;
    this.calcularSaldo();
  }

  eliminarRC(cajaId: string, index: number) {
    const entries = this.rcEntries[cajaId];
    if (!entries || index < 0 || index >= entries.length) return;
    
    const entry = entries[index];
    this.cajasValues[cajaId]['rc'] = (this.cajasValues[cajaId]['rc'] || 0) - entry.monto;
    entries.splice(index, 1);
    this.calcularSaldo();
  }

  getRCEntries(cajaId: string): RCEntry[] {
    return this.rcEntries[cajaId] || [];
  }

  formatearHora(fecha: Date | string): string {
    return new Date(fecha).toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getValorAbsoluto(valor: number): number {
    return Math.abs(valor);
  }

  getTasa(): number {
    return this.currencyService.currentTasa() || 0;
  }

  getDivisaConvertido(cajaId: string): number {
    const divisa = this.cajasValues[cajaId]?.['divisa'] || 0;
    const tasa = this.getTasa();
    return divisa * tasa;
  }

  cargarCierres() {
    this.loading.set(true);
    const url = this.fechaBuscar 
      ? `/api/cierre-caja?fecha=${this.fechaBuscar}`
      : '/api/cierre-caja';
    
    this.http.get<CierreCajaData[]>(url).subscribe({
      next: (data) => {
        this.cierres.set(data);
        this.cierresFiltrados = data;
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  buscarPorFecha() {
    this.cargarCierres();
  }

  getCajaTotal(cajaId: string, aplicarNegativos: boolean = false): number {
    const caja = this.cajasValues[cajaId];
    if (!caja) return 0;
    
    let total = 0;
    const negativos = ['gastos'];
    const tasa = this.getTasa();
    
    for (const [metodoId, valor] of Object.entries(caja)) {
      const val = valor || 0;
      if (metodoId === 'rc') continue;
      if (metodoId === 'divisa') {
        total += val * tasa;
      } else if (aplicarNegativos && negativos.includes(metodoId)) {
        total -= val;
      } else {
        total += val;
      }
    }
    
    const rcs = this.rcEntries[cajaId];
    if (rcs) {
      for (const rc of rcs) {
        if (aplicarNegativos) {
          total -= rc.monto;
        } else {
          total += rc.monto;
        }
      }
    }
    
    return total;
  }

  calcularSaldo() {
    this.totalIngresosCalculado = 0;
    this.cajaDataList.forEach(caja => {
      this.totalIngresosCalculado += this.getCajaTotal(caja.id, true);
    });
    
    this.saldoCalculado = this.nuevoCierre.saldoInicial + this.totalIngresosCalculado - this.nuevoCierre.totalGastos;
    this.diferencia = this.saldoCalculado - this.nuevoCierre.saldoInicial;
  }

  guardarCierre() {
    this.calcularSaldo();
    
    const cierre: CierreCajaData = {
      fecha: new Date(),
      usuario: 'Usuario',
      saldoInicial: this.nuevoCierre.saldoInicial,
      cajas: JSON.parse(JSON.stringify(this.cajasValues)),
      totalGastos: this.nuevoCierre.totalGastos,
      saldoFinal: this.saldoCalculado,
      observaciones: this.nuevoCierre.observaciones,
      diferencia: this.diferencia
    };

    this.http.post('/api/cierre-caja', cierre).subscribe({
      next: () => {
        this.cargarCierres();
        this.limpiarFormulario();
        alert('Cierre de caja guardado');
      },
      error: (err) => console.error('Error guardando cierre:', err)
    });
  }

  eliminarCierre(id: string) {
    if (!confirm('¿Eliminar este cierre de caja?')) return;
    
    this.http.delete(`/api/cierre-caja/${id}`).subscribe({
      next: () => this.cargarCierres(),
      error: (err) => console.error('Error eliminando cierre:', err)
    });
  }

  private limpiarFormulario() {
    this.nuevoCierre = {
      saldoInicial: 0,
      totalGastos: 0,
      observaciones: ''
    };
    this.inicializarCajas();
    this.saldoCalculado = 0;
    this.diferencia = 0;
    this.totalIngresosCalculado = 0;
    this.rcNuevoMonto = 0;
    this.rcDescripcion = '';
  }

  formatearFecha(fecha: Date | string): string {
    return new Date(fecha).toLocaleDateString('es-VE');
  }

  formatearMonto(monto: number): string {
    return monto.toFixed(2);
  }

  getDetalleCaja(cajas: any): string {
    if (!cajas) return '';
    let detalle = '';
    for (const [cajaId, metodos] of Object.entries(cajas)) {
      detalle += `\n${cajaId}: `;
      const entries = Object.entries(metodos as Record<string, number>);
      detalle += entries
        .filter(([_, v]) => v > 0)
        .map(([k, v]) => `${k}: ${v.toFixed(2)}`)
        .join(', ');
    }
    return detalle;
  }

  getCajasFromcierre(cajas: any): { id: string; nombre: string; metodos: { id: string; nombre: string; valor: number }[]; total: number }[] {
    if (!cajas) return [];
    const labels: Record<string, string> = { '1A': 'Caja 1A', '2B': 'Caja 2B', '3C': 'Caja 3C', '4D': 'Caja 4D' };
    const metodoLabels: Record<string, string> = { 
      'efectivo': 'Efectivo', 
      'debito': 'Débito', 
      'huella': 'Huella Digital',
      'divisa': 'Divisa',
      'pagoMovil': 'Pago Móvil',
      'rc': 'RC',
      'gastos': 'Gastos'
    };
    return Object.entries(cajas).map(([cajaId, metodos]) => {
      const metodosArr = Object.entries(metodos as Record<string, number>).map(([k, v]) => ({
        id: k,
        nombre: metodoLabels[k] || k,
        valor: v
      }));
      const total = metodosArr.reduce((sum, m) => sum + m.valor, 0);
      return { id: cajaId, nombre: labels[cajaId] || cajaId, metodos: metodosArr, total };
    });
  }
}