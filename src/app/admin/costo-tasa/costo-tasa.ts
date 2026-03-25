import { Component, signal, OnInit, inject, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, of, timeout } from 'rxjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AuthService } from '../../shared/data-access/auth.service';

interface Tasa {
  costo: number;
  iva: number;
  cargoPersonalizado: number;
  dolar: number;
  euro: number;
  binance: number;
  pvpBsf: number;
  pvpDolar: number;
}

interface CostoGuardado {
  _id?: any;
  nombre?: string;
  idProducto?: number;
  cantidad?: number;
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
}

interface Reporte {
  _id?: any;
  nombre: string;
  numero: number;
  tipo: 'Nota' | 'Factura';
  fecha: Date;
  data: CostoGuardado[];
  expanded?: boolean;
}

@Component({
  selector: 'app-costo-tasa',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './costo-tasa.html',
  styleUrl: './costo-tasa.css',
})
export class CostoTasa implements OnInit {
  @ViewChild('tablaCostos') tablaCostos!: ElementRef;

  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private readonly API_DOLAR = '/api/tasas';
  private readonly API_COSTOS = '/api/costos';
  private readonly API_SETTINGS = '/api/settings';

  showApiKeyInput = false;
  dolarApiKey = '';
  apiKeyLoaded = false;
  hasApiKey = false;

  isRoot(): boolean {
    return this.authService.user()?.rol === 'root';
  }

  tasa = signal<Tasa>({
    costo: 0,
    iva: 0,
    cargoPersonalizado: 0,
    dolar: 0,
    euro: 0,
    binance: 0,
    pvpBsf: 0,
    pvpDolar: 0,
  });

  costo = signal(0);
  ivaActivo = signal(false);
  cargoPersonalizadoPorcentaje = signal(10);
  dolar = signal(0);
  euro = signal(0);
  binance = signal(0);

  tasaPvp = signal<'dolar' | 'euro' | 'binance'>('dolar');

  loadingTasa = signal(false);
  tasaError = signal<string | null>(null);
  costosGuardados = signal<CostoGuardado[]>([]);
  reportes = signal<Reporte[]>([]);
  reportesFiltrados = signal<Reporte[]>([]);
  reportesPaginados = signal<Reporte[]>([]);
  nombreReporte = '';
  tipoReporte: 'Nota' | 'Factura' = 'Nota';
  filtroNombre = '';
  filtroFecha = '';
  filtroTipo: '' | 'Nota' | 'Factura' = '';
  reporteSeleccionadoId: any = null;
  reporteSeleccionadoVer: Reporte | null = null;
  mostrarPopup = false;
  mostrarPopupVerReportes = false;
  mostrarPopupDatosReporte = false;
  mostrarPopupCotizacion = false;
  mostrarConsultaUnica = false;
  cotizacionCliente = '';
  cotizacionDireccion = '';
  cotizacionRif = '';
  cotizacionTelefono = '';
  cotizacionVendedor = '';
  consultaCosto = 0;
  consultaIva = false;
  consultaUtilidad = 10;
  consultaTasaPvp: 'dolar' | 'euro' | 'binance' = 'dolar';
  consultaIvaAmount = 0;
  consultaCostoConIva = 0;
  consultaUtilidadAmount = 0;
  consultaPvpDolar = 0;
  saving = signal(false);
  utilidadesTemp: { [key: string]: number } = {};
  pvpDolarTemp: { [key: string]: number } = {};
  editingPvpDolar: { [key: string]: boolean } = {};
  nombresProductos: { [key: string]: string } = {};
  cantidadesProductos: { [key: string]: number } = {};
  paginaActual = 1;
  reportesPorPagina = 5;

  ngOnInit() {
    this.loadTasas();
    this.loadReportes();
    if (this.isRoot()) {
      this.loadApiKeyStatus();
    }
  }

  loadApiKeyStatus() {
    this.http.get<{ hasApiKey: boolean; apiKey: string }>(`${this.API_SETTINGS}/dolar-api-key`).subscribe({
      next: (data) => {
        this.hasApiKey = data.hasApiKey;
        this.apiKeyLoaded = true;
      },
      error: (err) => {
        this.apiKeyLoaded = true;
      }
    });
  }

  abrirDolarVzla() {
    if (this.showApiKeyInput) {
      this.showApiKeyInput = false;
      this.dolarApiKey = '';
      return;
    }

    if (!this.hasApiKey) {
      this.showApiKeyInput = true;
      this.dolarApiKey = '';
      window.open('https://www.dolarvzla.com/settings/api/', '_blank');
      return;
    }

    this.http.get<any>('/api/tasas').subscribe({
      next: (data) => {
        window.open('https://www.dolarvzla.com/settings/api/', '_blank');
      },
      error: (err) => {
        if (err.status === 401) {
          this.showApiKeyInput = true;
          this.dolarApiKey = '';
        } else {
          window.open('https://www.dolarvzla.com/settings/api/', '_blank');
        }
      }
    });
  }

  guardarApiKey() {
    if (!this.dolarApiKey.trim()) {
      alert('Ingresa una API key válida');
      return;
    }
    
    this.http.put(`${this.API_SETTINGS}/dolar-api-key`, { apiKey: this.dolarApiKey.trim() }).subscribe({
      next: (res) => {
        console.log('API key guardada:', res);
        this.showApiKeyInput = false;
        this.hasApiKey = true;
        this.dolarApiKey = '';
      },
      error: (err) => {
        console.error('Error guardando API key:', err);
        alert('Error al guardar la API key: ' + (err.error?.error || 'Error desconocido'));
      }
    });
  }

  formatNumero(numero: number): string {
    return numero.toString().padStart(7, '0');
  }

  loadReportes() {
    this.http
      .get<Reporte[]>(this.API_COSTOS)
      .pipe(
        catchError((err) => {
          console.error('Error loading reportes:', err);
          return of([]);
        }),
      )
      .subscribe((data) => {
        const reportesOrdenados = data.sort((a, b) => b.numero - a.numero);
        this.reportes.set(reportesOrdenados.map((r) => ({ ...r, expanded: true })));
        this.filtrarReportes();
      });
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-VE').format(valor);
  }
  filtrarReportes() {
    const filtro = this.filtroNombre.toLowerCase().trim();
    const filtroFecha = this.filtroFecha ? this.filtroFecha : null;
    const filtroTipo = this.filtroTipo || null;
    let reportesFiltrados: Reporte[];

    if (!filtro && !filtroFecha && !filtroTipo) {
      reportesFiltrados = this.reportes();
    } else {
      reportesFiltrados = this.reportes().filter((r) => {
        const coincideNombre = !filtro || r.nombre.toLowerCase().includes(filtro);
        let coincideFecha = true;
        if (filtroFecha) {
          const fechaReporte = new Date(r.fecha);
          const fechaReporteStr = fechaReporte.toISOString().split('T')[0];
          coincideFecha = fechaReporteStr === filtroFecha;
        }
        let coincideTipo = true;
        if (filtroTipo) {
          const tipoReporte = r.tipo ? String(r.tipo).trim() : '';
          coincideTipo = tipoReporte.toLowerCase() === filtroTipo.toLowerCase();
        }
        return coincideNombre && coincideFecha && coincideTipo;
      });
    }
    this.reportesFiltrados.set(reportesFiltrados);
    this.paginaActual = 1;
    this.actualizarPaginacion();
  }

  actualizarPaginacion() {
    const inicio = (this.paginaActual - 1) * this.reportesPorPagina;
    const fin = inicio + this.reportesPorPagina;
    this.reportesPaginados.set(this.reportesFiltrados().slice(inicio, fin));
  }

  cambiarPagina(pagina: number) {
    const totalPaginas = Math.ceil(this.reportesFiltrados().length / this.reportesPorPagina);
    if (pagina >= 1 && pagina <= totalPaginas) {
      this.paginaActual = pagina;
      this.actualizarPaginacion();
    }
  }

  get totalPaginas(): number {
    return Math.ceil(this.reportesFiltrados().length / this.reportesPorPagina);
  }

  abrirPopupReporte() {
    this.mostrarPopup = true;
    this.nombreReporte = '';
    this.tipoReporte = 'Nota';
  }

  cerrarPopup() {
    this.mostrarPopup = false;
  }

  abrirPopupVerReportes() {
    this.mostrarPopupVerReportes = true;
  }

  cerrarPopupVerReportes() {
    this.mostrarPopupVerReportes = false;
  }

  verDatosReporte(reporte: Reporte) {
    this.reporteSeleccionadoVer = reporte;
    this.nombresProductos = {};
    this.cantidadesProductos = {};
    reporte.data.forEach((item, index) => {
      this.nombresProductos[index] = item.nombre || '';
      this.cantidadesProductos[index] = item.cantidad || 1;
    });
    this.mostrarPopupVerReportes = false;
    this.mostrarPopupDatosReporte = true;
  }

  cerrarPopupDatosReporte() {
    this.mostrarPopupDatosReporte = false;
    this.reporteSeleccionadoVer = null;
    this.nombresProductos = {};
    this.cantidadesProductos = {};
  }

  verCotizacion() {
    this.mostrarPopupCotizacion = true;
  }

  cerrarPopupCotizacion() {
    this.mostrarPopupCotizacion = false;
    this.cotizacionCliente = '';
    this.cotizacionDireccion = '';
    this.cotizacionRif = '';
    this.cotizacionTelefono = '';
    this.cotizacionVendedor = '';
  }

  getFechaActual(): string {
    return new Date().toLocaleDateString('es-VE');
  }

  getFechaValidez(): string {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 15);
    return fecha.toLocaleDateString('es-VE');
  }

  setNombreProducto(nombre: string, index: number) {
    this.nombresProductos[index] = nombre;
  }

  setCantidad(cantidad: number, index: number) {
    this.cantidadesProductos[index] = cantidad > 0 ? cantidad : 1;
  }

  getPrecioUnitario(index: number): number {
    const reporte = this.reporteSeleccionadoVer;
    if (!reporte || !reporte.data[index]) return 0;
    const item = reporte.data[index];
    const cantidad = this.cantidadesProductos[index] || 1;
    return item.pvpDolar / cantidad;
  }

  getPrecioUnitarioBs(index: number): number {
    const reporte = this.reporteSeleccionadoVer;
    if (!reporte || !reporte.data[index]) return 0;
    const item = reporte.data[index];
    const cantidad = this.cantidadesProductos[index] || 1;
    return item.pvpBsf / cantidad;
  }

  guardarNombreProducto(reporteId: any, index: number) {
    if (!reporteId || this.nombresProductos[index] === undefined) {
      return;
    }

    const nombre = this.nombresProductos[index];
    if (!nombre.trim()) {
      return;
    }

    let idProductoExistente: number | null = null;

    for (const reporte of this.reportes()) {
      for (const item of reporte.data) {
        if (item.nombre && item.nombre.toLowerCase() === nombre.toLowerCase() && item.idProducto) {
          idProductoExistente = item.idProducto;
          break;
        }
      }
      if (idProductoExistente) break;
    }

    const idProducto = idProductoExistente || Date.now();

    this.http
      .put(`${this.API_COSTOS}/${reporteId}/costo/${index}`, {
        nombre: nombre,
        idProducto: idProducto,
      })
      .pipe(
        catchError((err) => {
          console.error('Error guardando nombre del producto:', err);
          return of(null);
        }),
      )
      .subscribe(() => {
        this.loadReportes();
      });
  }

  guardarCantidad(reporteId: any, index: number) {
    if (!reporteId || this.cantidadesProductos[index] === undefined) {
      return;
    }

    const cantidad = this.cantidadesProductos[index];
    if (cantidad < 1) {
      return;
    }

    this.http
      .put(`${this.API_COSTOS}/${reporteId}/costo/${index}`, {
        cantidad: cantidad,
      })
      .pipe(
        catchError((err) => {
          console.error('Error guardando cantidad:', err);
          return of(null);
        }),
      )
      .subscribe(() => {
        this.loadReportes();
      });
  }

  calcularTotalBs(reporte: Reporte): number {
    return reporte.data.reduce((sum, item) => sum + item.pvpBsf, 0);
  }

  calcularTotalDolar(reporte: Reporte): number {
    return reporte.data.reduce((sum, item) => sum + item.pvpDolar, 0);
  }

  crearReporte() {
    if (!this.nombreReporte.trim()) {
      return;
    }

    this.saving.set(true);
    const numeroNuevo =
      this.reportes().length > 0 ? Math.max(...this.reportes().map((r) => r.numero)) + 1 : 1;

    const reporteData = {
      nombre: this.nombreReporte,
      numero: numeroNuevo,
      tipo: this.tipoReporte,
      fecha: new Date(),
      data: [],
    };

    this.http
      .post(this.API_COSTOS, reporteData)
      .pipe(
        catchError((err) => {
          console.error('Error creando reporte:', err);
          return of(null);
        }),
      )
      .subscribe((result: any) => {
        this.saving.set(false);
        this.cerrarPopup();
        this.loadReportes();
        if (result?.id) {
          this.reporteSeleccionadoId = result.id;
        }
      });
  }

  seleccionarReporte(id: any) {
    if (this.reporteSeleccionadoId === id) {
      this.reporteSeleccionadoId = null;
    } else {
      this.reporteSeleccionadoId = id;
    }
  }

  deseleccionarReporte() {
    this.reporteSeleccionadoId = null;
  }

  eliminarReporte(id: any) {
    this.http
      .delete(`${this.API_COSTOS}/${id}`)
      .pipe(
        catchError((err) => {
          console.error('Error eliminando reporte:', err);
          return of(null);
        }),
      )
      .subscribe(() => {
        this.loadReportes();
      });
  }

  agregarCostoAGrupo(grupoId: any) {
    const costoData = {
      costo: this.tasa().costo,
      iva: this.tasa().iva,
      cargoPersonalizado: this.tasa().cargoPersonalizado,
      cargoPersonalizadoPorcentaje: this.cargoPersonalizadoPorcentaje(),
      dolar: this.dolar(),
      euro: this.euro(),
      binance: this.binance(),
      pvpBsf: this.tasa().pvpBsf,
      pvpDolar: this.tasa().pvpDolar,
      tasaPvp: this.tasaPvp(),
      ivaActivo: this.ivaActivo(),
      fecha: new Date(),
    };

    this.http
      .post(`${this.API_COSTOS}/${grupoId}/costo`, costoData)
      .pipe(
        catchError((err) => {
          console.error('Error agregando costo:', err);
          return of(null);
        }),
      )
      .subscribe(() => {
        this.loadReportes();
      });
  }

  eliminarCosto(grupoId: any, index: number) {
    this.http
      .delete(`${this.API_COSTOS}/${grupoId}/costo/${index}`)
      .pipe(
        catchError((err) => {
          console.error('Error eliminando costo:', err);
          return of(null);
        }),
      )
      .subscribe(() => {
        this.loadReportes();
      });
  }

  toggleIva(grupoId: any, index: number, item: CostoGuardado, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const nuevoIva = checked ? item.costo * 0.16 : 0;

    const tasaSeleccionada = item.tasaPvp;
    let tasa = 0;
    if (tasaSeleccionada === 'dolar') {
      tasa = item.dolar;
    } else if (tasaSeleccionada === 'euro') {
      tasa = item.euro;
    } else if (tasaSeleccionada === 'binance') {
      tasa = item.binance;
    }

    const pvpDolar = item.costo + nuevoIva + item.cargoPersonalizado;
    const pvpBsf = pvpDolar * tasa;

    this.http
      .put(`${this.API_COSTOS}/${grupoId}/costo/${index}`, {
        ivaActivo: checked,
        iva: nuevoIva,
        pvpBsf: Math.round(pvpBsf * 100) / 100,
        pvpDolar: Math.round(pvpDolar * 100) / 100,
      })
      .pipe(
        catchError((err) => {
          console.error('Error actualizando IVA:', err);
          return of(null);
        }),
      )
      .subscribe(() => {
        this.loadReportes();
      });
  }

  setUtilidadTemp(index: number, value: number) {
    this.utilidadesTemp[index] = value;
  }

  guardarUtilidad(grupoId: any, index: number) {
    const porcentaje = this.utilidadesTemp[index];
    if (porcentaje === undefined || porcentaje === null) {
      return;
    }

    const reporte = this.reportes().find((r) => r._id === grupoId);
    if (!reporte || !reporte.data[index]) {
      return;
    }

    const item = reporte.data[index];
    const ivaActivo = item.ivaActivo;
    const iva = ivaActivo ? item.costo * 0.16 : 0;
    const costoConIva = item.costo + iva;

    const tasaSeleccionada = item.tasaPvp;
    let tasa = 0;
    if (tasaSeleccionada === 'dolar') {
      tasa = item.dolar;
    } else if (tasaSeleccionada === 'euro') {
      tasa = item.euro;
    } else if (tasaSeleccionada === 'binance') {
      tasa = item.binance;
    }

    const cargoPorcentaje = porcentaje / 100;
    const pvpDolar = costoConIva * (1 + cargoPorcentaje);
    const cargoPersonalizado = pvpDolar - costoConIva;
    const pvpBsf = pvpDolar * tasa;

    this.http
      .put(`${this.API_COSTOS}/${grupoId}/costo/${index}`, {
        cargoPersonalizadoPorcentaje: porcentaje,
        cargoPersonalizado: Math.round(cargoPersonalizado * 100) / 100,
        iva: Math.round(iva * 100) / 100,
        pvpBsf: Math.round(pvpBsf * 100) / 100,
        pvpDolar: Math.round(pvpDolar * 100) / 100,
      })
      .pipe(
        catchError((err) => {
          console.error('Error guardando utilidad:', err);
          return of(null);
        }),
      )
      .subscribe(() => {
        delete this.utilidadesTemp[index];
        this.loadReportes();
      });
  }

  toggleEditPvpDolar(index: number, pvpDolar: number) {
    this.editingPvpDolar[index] = !this.editingPvpDolar[index];
    if (this.editingPvpDolar[index]) {
      this.pvpDolarTemp[index] = pvpDolar;
    }
  }

  setPvpDolarTemp(index: number, value: number) {
    this.pvpDolarTemp[index] = value;
  }

  guardarPvpDolar(grupoId: any, index: number) {
    const pvpDolar = this.pvpDolarTemp[index];
    if (pvpDolar === undefined || pvpDolar === null) {
      return;
    }

    const reporte = this.reportes().find((r) => r._id === grupoId);
    if (!reporte || !reporte.data[index]) {
      return;
    }

    const item = reporte.data[index];
    const ivaActivo = item.ivaActivo;
    const iva = ivaActivo ? item.costo * 0.16 : 0;
    const costoConIva = item.costo + iva;

    const tasaSeleccionada = item.tasaPvp;
    let tasa = 0;
    if (tasaSeleccionada === 'dolar') {
      tasa = item.dolar;
    } else if (tasaSeleccionada === 'euro') {
      tasa = item.euro;
    } else if (tasaSeleccionada === 'binance') {
      tasa = item.binance;
    }

    const cargoPersonalizado = pvpDolar - costoConIva;
    const cargoPersonalizadoPorcentaje =
      costoConIva > 0 ? (cargoPersonalizado / costoConIva) * 100 : 0;
    const pvpBsf = pvpDolar * tasa;

    this.http
      .put(`${this.API_COSTOS}/${grupoId}/costo/${index}`, {
        pvpDolar: Math.round(pvpDolar * 100) / 100,
        cargoPersonalizado: Math.round(cargoPersonalizado * 100) / 100,
        cargoPersonalizadoPorcentaje: Math.round(cargoPersonalizadoPorcentaje * 100) / 100,
        pvpBsf: Math.round(pvpBsf * 100) / 100,
      })
      .pipe(
        catchError((err) => {
          console.error('Error guardando pvpDolar:', err);
          return of(null);
        }),
      )
      .subscribe(() => {
        delete this.pvpDolarTemp[index];
        this.editingPvpDolar[index] = false;
        this.loadReportes();
      });
  }

  imprimirReporte() {
    console.log('imprimirReporte llamado', this.reporteSeleccionadoId);
    if (!this.reporteSeleccionadoId) {
      console.log('No hay reporte seleccionado');
      return;
    }

    const reporte = this.reportes().find((r) => String(r._id) === String(this.reporteSeleccionadoId));
    console.log('Reporte encontrado:', reporte);
    if (!reporte || !reporte.data || reporte.data.length === 0) {
      console.log('Reporte sin datos');
      return;
    }

    let tablaHtml = `
      <html>
        <head>
          <title>${reporte.nombre} - #${this.formatNumero(reporte.numero)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { color: #1d63c1; text-align: center; margin-bottom: 5px; }
            .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background: #1d63c1; color: white; }
            tr:nth-child(even) { background: #f8f9fa; }
            .total-row { background: #e3f2fd; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>${reporte.nombre}</h2>
          <p class="subtitle">${reporte.tipo} - #${this.formatNumero(reporte.numero)} - ${new Date(reporte.fecha).toLocaleDateString('es-VE')}</p>
          <table>
            <thead>
              <tr>
                <th>Costo</th>
                <th>IVA</th>
                <th>Tasa PVP</th>
                <th>Utilidad %</th>
                <th>Utilidad $</th>
                <th>PVP Bs</th>
                <th>PVP $</th>
              </tr>
            </thead>
            <tbody>
    `;

    let totalPvpBs = 0;
    let totalPvpDolar = 0;

    for (const item of reporte.data) {
      const ivaMostrar = item.ivaActivo ? `$${item.iva.toFixed(2)}` : '-';
      tablaHtml += `
        <tr>
          <td>$${item.costo.toFixed(2)}</td>
          <td>${ivaMostrar}</td>
          <td>${item.tasaPvp.toUpperCase()}</td>
          <td>${(item.cargoPersonalizadoPorcentaje || 0).toFixed(2)}%</td>
          <td>$${item.cargoPersonalizado.toFixed(2)}</td>
          <td>Bs ${item.pvpBsf.toFixed(2)}</td>
          <td>$${item.pvpDolar.toFixed(2)}</td>
        </tr>
      `;
      totalPvpBs += item.pvpBsf;
      totalPvpDolar += item.pvpDolar;
    }

    tablaHtml += `
              <tr class="total-row">
                <td colspan="5" style="text-align: right;">TOTALES:</td>
                <td>Bs ${totalPvpBs.toFixed(2)}</td>
                <td>$${totalPvpDolar.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(tablaHtml);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }

  descargarPdf() {
    console.log('descargarPdf llamado', this.reporteSeleccionadoId);
    if (!this.reporteSeleccionadoId) {
      return;
    }

    const reporte = this.reportes().find((r) => String(r._id) === String(this.reporteSeleccionadoId));
    if (!reporte || !reporte.data || reporte.data.length === 0) {
      return;
    }

    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    pdf.setFontSize(18);
    pdf.setTextColor(29, 99, 193);
    pdf.text(reporte.nombre, pageWidth / 2, margin + 10, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(
      `${reporte.tipo} - #${this.formatNumero(reporte.numero)} - ${new Date(reporte.fecha).toLocaleDateString('es-VE')}`,
      pageWidth / 2,
      margin + 18,
      { align: 'center' },
    );

    const headers = ['Costo', 'IVA', 'Tasa PVP', 'Utilidad %', 'Utilidad $', 'PVP Bs', 'PVP $'];
    const colWidths = [25, 20, 25, 25, 25, 30, 30];
    const startY = margin + 25;
    const rowHeight = 8;

    pdf.setFillColor(29, 99, 193);
    pdf.setTextColor(255, 255, 255);
    pdf.rect(margin, startY, pageWidth - 2 * margin, rowHeight, 'F');
    pdf.setFontSize(9);
    let currentX = margin + 2;
    headers.forEach((header, i) => {
      pdf.text(header, currentX, startY + 5.5);
      currentX += colWidths[i];
    });

    let currentY = startY + rowHeight;
    let totalPvpBs = 0;
    let totalPvpDolar = 0;
    const data = reporte.data;

    data.forEach((item, index) => {
      if (index % 2 === 0) {
        pdf.setFillColor(248, 249, 250);
        pdf.rect(margin, currentY, pageWidth - 2 * margin, rowHeight, 'F');
      }

      pdf.setTextColor(0, 0, 0);
      currentX = margin + 2;

      const rowData = [
        `$${item.costo.toFixed(2)}`,
        item.ivaActivo ? `$${item.iva.toFixed(2)}` : '-',
        item.tasaPvp.toUpperCase(),
        `${(item.cargoPersonalizadoPorcentaje || 0).toFixed(2)}%`,
        `$${item.cargoPersonalizado.toFixed(2)}`,
        `Bs ${item.pvpBsf.toFixed(2)}`,
        `$${item.pvpDolar.toFixed(2)}`,
      ];

      rowData.forEach((cell, i) => {
        pdf.text(cell, currentX, currentY + 5.5);
        currentX += colWidths[i];
      });

      totalPvpBs += item.pvpBsf;
      totalPvpDolar += item.pvpDolar;
      currentY += rowHeight;
    });

    pdf.setFillColor(227, 242, 253);
    pdf.rect(margin, currentY, pageWidth - 2 * margin, rowHeight, 'F');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont(undefined as any, 'bold');
    currentX = margin + 2;
    pdf.text('TOTALES:', currentX, currentY + 5.5);
    currentX += colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4];
    pdf.text(`Bs ${totalPvpBs.toFixed(2)}`, currentX, currentY + 5.5);
    currentX += colWidths[5];
    pdf.text(`$${totalPvpDolar.toFixed(2)}`, currentX, currentY + 5.5);

    pdf.save(`${reporte.nombre}-${this.formatNumero(reporte.numero)}.pdf`);
  }

  loadTasas() {
    this.loadingTasa.set(true);
    this.tasaError.set(null);

    this.http
      .get<any>(this.API_DOLAR)
      .pipe(
        timeout(10000),
        catchError((err) => {
          console.error('Error loading tasas:', err);
          return of(null);
        }),
      )
      .subscribe({
        next: (data) => {
          if (!data) {
            this.tasaError.set('No se pudieron cargar las tasas. Ingrésalas manualmente.');
            this.loadingTasa.set(false);
            return;
          }
          try {
            const usd = data.current?.usd;
            const eur = data.current?.eur;
            const binance = data.current?.binance;

            if (usd) {
              const dolarValue = parseFloat(String(usd).replace(',', '.'));
              if (!isNaN(dolarValue)) {
                this.dolar.set(dolarValue);
              }
            }

            if (eur) {
              const euroValue = parseFloat(String(eur).replace(',', '.'));
              if (!isNaN(euroValue)) {
                this.euro.set(euroValue);
              }
            }

            if (binance) {
              const binanceValue = parseFloat(String(binance).replace(',', '.'));
              if (!isNaN(binanceValue)) {
                this.binance.set(binanceValue);
              }
            }

            this.calculatePVP();
          } catch (e) {
            console.error('Error parsing tasas:', e);
            this.tasaError.set('Error al procesar las tasas. Ingrésalas manualmente.');
          } finally {
            this.loadingTasa.set(false);
          }
        },
        error: (err) => {
          console.error('Error loading tasas:', err);
          let mensaje = 'No se pudieron cargar las tasas.';
          if (err.status === 401) {
            mensaje = 'API key inválida. Ingrésalas manualmente.';
          } else if (err.status === 0) {
            mensaje = 'Error de conexión. Verifica tu internet.';
          }
          this.tasaError.set(mensaje);
          this.loadingTasa.set(false);
        },
      });
  }

  calculatePVP() {
    const costoBase = this.costo();
    const ivaAmount = this.ivaActivo() ? costoBase * 0.16 : 0;
    const costoConIva = costoBase + ivaAmount;

    const cargoPorcentaje = this.cargoPersonalizadoPorcentaje() / 100;
    const pvpDolarConCargo = costoConIva * (1 + cargoPorcentaje);

    const dolar = this.dolar() * costoConIva;
    const euro = this.euro() * costoConIva;
    const binance = this.binance() * costoConIva;

    const pvpDolarValue = pvpDolarConCargo;

    const tasaSeleccionada = this.tasaPvp();
    let pvpBsfValue = 0;
    if (tasaSeleccionada === 'dolar') {
      pvpBsfValue = pvpDolarValue * this.dolar();
    } else if (tasaSeleccionada === 'euro') {
      pvpBsfValue = pvpDolarValue * this.euro();
    } else if (tasaSeleccionada === 'binance') {
      pvpBsfValue = pvpDolarValue * this.binance();
    }

    this.tasa.set({
      costo: costoBase,
      iva: ivaAmount,
      cargoPersonalizado: pvpDolarConCargo - costoConIva,
      dolar,
      euro,
      binance,
      pvpBsf: Math.round(pvpBsfValue * 100) / 100,
      pvpDolar: Math.round(pvpDolarValue * 100) / 100,
    });
  }

  onCostoChange(value: number) {
    this.costo.set(value);
    this.calculatePVP();
  }

  onCostoFocus(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    if (this.costo() === 0) {
      input.value = '';
    }
  }

  onCostoReset(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    input.value = '';
  }

  onCostoBlur(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    if (input.value === '') {
      this.costo.set(0);
      this.calculatePVP();
    }
  }

  onIvaActivoChange(value: boolean) {
    this.ivaActivo.set(value);
    this.calculatePVP();
  }

  onCargoPersonalizadoPorcentajeChange(value: number) {
    this.cargoPersonalizadoPorcentaje.set(value);
    this.calculatePVP();
  }

  onUtilidadFocus(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    if (this.cargoPersonalizadoPorcentaje() === 10) {
      input.value = '';
    }
  }

  onUtilidadBlur(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    if (input.value === '') {
      this.cargoPersonalizadoPorcentaje.set(10);
      this.calculatePVP();
    }
  }

  onDolarChange(value: number) {
    this.dolar.set(value);
    this.calculatePVP();
  }

  onEuroChange(value: number) {
    this.euro.set(value);
    this.calculatePVP();
  }

  onBinanceChange(value: number) {
    this.binance.set(value);
    this.calculatePVP();
  }

  onTasaPvpChange(value: 'dolar' | 'euro' | 'binance') {
    this.tasaPvp.set(value);
    this.calculatePVP();
  }

  onEnterBlur(event: Event) {
    (event.target as HTMLInputElement).blur();
  }

  guardarEnReporteSeleccionado() {
    if (!this.reporteSeleccionadoId) {
      return;
    }
    this.agregarCostoAGrupo(this.reporteSeleccionadoId);
  }

  consultaUnica() {
    this.consultaCosto = this.costo() || 0;
    this.consultaIva = this.ivaActivo();
    this.consultaUtilidad = 0;
    this.consultaTasaPvp = this.tasaPvp();
    this.calcularConsultaUnica();
    this.mostrarConsultaUnica = true;
  }

  calcularConsultaUnica() {
    const costoBase = this.consultaCosto || 0;
    this.consultaIvaAmount = this.consultaIva ? costoBase * 0.16 : 0;
    this.consultaCostoConIva = costoBase + this.consultaIvaAmount;

    const cargoPorcentaje = this.consultaUtilidad / 100;
    this.consultaPvpDolar = this.consultaCostoConIva * (1 + cargoPorcentaje);
    this.consultaUtilidadAmount = this.consultaPvpDolar - this.consultaCostoConIva;
  }

  cerrarConsultaUnica() {
    this.mostrarConsultaUnica = false;
  }
}
