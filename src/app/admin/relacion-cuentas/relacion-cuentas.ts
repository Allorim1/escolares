import { Component, signal, OnInit, inject, computed, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { EnterFocusNextDirective } from '../../shared/ui/enter-focus-next.directive';
import { EmpresasService, Empresa } from '../../shared/data-access/empresas.service';
import { TasasGuardadasService, TasaGuardada } from '../../shared/data-access/tasas-guardadas.service';
import { CurrencyService } from '../../shared/data-access/currency.service';
import { TasaResponse } from '../../shared/data-access/currency.service';
import { AuthService } from '../../shared/data-access/auth.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ChangeDetectorRef } from '@angular/core';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';

interface Abono {
  _id?: string;
  fecha: string;
  nombre: string;
  empresa?: string;
  planta: string;
  cedula: string;
  telefono: string;
  nFact: string;
  montoFactura?: number;
  abonos?: number;
  abonosPagos?: AbonoPago[];
  iva?: number;
  ivaPagado?: boolean;
  diferencia?: number;
  tasa?: number;
  divisa?: number;
  status: string;
  supervisor?: string;
  supervisorId?: string;
  comisionPorcentaje?: number;
  imagenes?: string[];
}

interface AbonoPago {
  fecha: string;
  monto: number;
}

interface Supervisor {
  _id?: string;
  nombre: string;
  apellido?: string;
  cedula?: string;
  telefono?: string;
  planta?: string;
}

@Component({
  selector: 'app-relacion-cuentas',
  standalone: true,
  imports: [CommonModule, FormsModule, EnterFocusNextDirective],
  templateUrl: './relacion-cuentas.html',
  styleUrl: './relacion-cuentas.css',
})
export class RelacionCuentas implements OnInit {
  private http = inject(HttpClient);
  private empresasService = inject(EmpresasService);
  private tasasGuardadasService = inject(TasasGuardadasService);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private notificationModal = inject(NotificationModalService);
  private currencyService = inject(CurrencyService);

  private readonly API = '/api/abonos-polar';
  private readonly SERVER_URL = window.location.origin;
  private readonly API_EMPRESAS = '/api/empresas';
  private readonly API_SUPERVISORES = '/api/supervisores';

  abonos = signal<Abono[]>([]);
  empresas = signal<Empresa[]>([]);
  supervisores = signal<Supervisor[]>([]);
  plantasFiltradas = computed(() => {
    const empresaNombre = this.selectedEmpresaInModal() || this.filtros().empresa;
    if (!empresaNombre) return [];
    const empresa = this.empresas().find((e) => e.nombre === empresaNombre);
    return empresa?.plantas || [];
  });

  plantasFiltradasComisiones = computed(() => {
    const empresaNombre = this.comisionesTabFiltros().empresa;
    if (!empresaNombre) return [];
    const empresa = this.empresas().find((e) => e.nombre === empresaNombre);
    return empresa?.plantas || [];
  });

  supervisoresUnicos = computed(() => {
    return this.supervisores().map(s => s.nombre).sort();
  });

  abonosFiltrados = computed(() => {
    const f = this.filtros();
    return this.abonos().filter((a) => {
      let passes = true;
      if (f.empresa) {
        passes = passes && a.empresa === f.empresa;
      }
      if (f.planta) {
        passes = passes && a.planta === f.planta;
      }
      if (f.fechaDesde) {
        const fechaLocal = this.parsearFechaLocal(a.fecha || '').toLocaleDateString('en-CA');
        passes = passes && fechaLocal >= f.fechaDesde;
      }
      if (f.fechaHasta) {
        const fechaLocal = this.parsearFechaLocal(a.fecha || '').toLocaleDateString('en-CA');
        passes = passes && fechaLocal <= f.fechaHasta;
      }
      if (f.status) {
        passes = passes && a.status === f.status;
      }
      if (f.nombre) {
        const q = f.nombre.toLowerCase();
        const keysToSkip = new Set([
          'montoFactura',
          'abonos',
          'iva',
          'diferencia',
          'divisa',
          'pagoParcial',
          'tasa',
          'comisionPorcentaje',
        ]);
        let found = false;
        for (const key in a) {
          if (keysToSkip.has(key)) continue;
          const val: any = (a as any)[key];
          if (val === null || val === undefined) continue;
          if (typeof val === 'string') {
            if (val.toLowerCase().includes(q)) {
              found = true;
              break;
            }
          } else if (Array.isArray(val)) {
            if (val.join(' ').toLowerCase().includes(q)) {
              found = true;
              break;
            }
          } else if (typeof val === 'object') {
            try {
              const str = JSON.stringify(val).toLowerCase();
              if (str.includes(q)) {
                found = true;
                break;
              }
            } catch (e) {
              // ignore
            }
          }
          // skip numbers per requirement
        }
        passes = passes && found;
      }
      if (f.supervisor) {
        passes = passes && (a.supervisor || '') === f.supervisor;
      }
      if (this.aplicarFiltroIva()) {
        passes = passes && a.ivaPagado === this.soloIvaPagado();
      }
      return passes;
    });
  });

  totales = computed(() => {
    const datos = this.abonosFiltrados();
    const montoFactura = datos.reduce((sum, a) => sum + (a.montoFactura ?? 0), 0);
    const abonos = datos.reduce((sum, a) => sum + (a.abonos ?? 0), 0);
    const iva = datos.reduce((sum, a) => sum + (a.iva ?? 0), 0);
    console.log('Analizando tasas:', datos.map(a => ({ tasa: a.tasa, tipo: typeof a.tasa })));
    // ✅ CÓDIGO CORREGIDO:
    const ivaDivisa = datos.reduce((sum, a) => {
      const tasa = Number(a.tasa) || 0;
      return sum + (tasa > 0 ? (a.iva ?? 0) / tasa : 0);
    }, 0);
    const diferenciaDivisa = datos.reduce((sum, a) => {
      const tasa = Number(a.tasa) || 0;
      const montoFactura = a.montoFactura ?? 0;
      const iva = a.iva ?? 0;
      const diferencia = montoFactura - iva;
      return sum + (tasa > 0 ? diferencia / tasa : 0);
    }, 0);
    const pagoParcial = abonos;
    const diferencia = montoFactura - iva;
    const divisa = datos.reduce((sum, a) => {
      const tasa = Number(a.tasa) || 0;
      return sum + (tasa > 0 ? (a.montoFactura ?? 0) / tasa : 0);
    }, 0);
    const tasaActual = this.tasaActual();
    const diferenciaEnDivisa = tasaActual > 0 ? montoFactura / tasaActual : 0;
    const porcentajeCambio = diferenciaEnDivisa > 0 ? ((divisa - diferenciaEnDivisa) / diferenciaEnDivisa) * 100 : 0;
    const cambioMonto = divisa - diferenciaEnDivisa;
    const montoTotalSinIvaDivisa = Number((diferencia / tasaActual).toFixed(2));
    const decrecimientoMonto = diferenciaDivisa - montoTotalSinIvaDivisa;
    const decrecimientoPorcentaje = diferenciaDivisa > 0 ? (decrecimientoMonto / diferenciaDivisa) * 100 : 0;
    const ivaDolares = datos.reduce((sum, a) => {
      const tasa = Number(a.tasa) || 0;
      return sum + (tasa > 0 ? (a.iva ?? 0) / tasa : 0);
    }, 0);
    // Cantidad de facturas y total clientes únicos
    const cantidadFacturas = datos.length;
    const clientesSet = new Set<string>();
    for (const a of datos) {
      const ced = (a.cedula || '').toString().trim();
      const tel = (a.telefono || '').toString().trim();
      const nombre = (a.nombre || '').toString().trim().toLowerCase();
      const key = ced || tel || nombre;
      if (key) clientesSet.add(key);
    }
    const totalClientes = clientesSet.size;
    return {
      montoFactura,
      abonos,
      iva,
      ivaDivisa,
      diferenciaDivisa: Number(diferenciaDivisa.toFixed(2)),
      pagoParcial,
      diferencia,
      divisa,
      tasaActual,
      diferenciaEnDivisa,
      cambioMonto,
      porcentajeCambio,
      montoFacturaEnDivisa: Number(diferenciaEnDivisa.toFixed(2)),
      decrecimientoMonto: Number(decrecimientoMonto.toFixed(2)),
      decrecimientoPorcentaje: Number(decrecimientoPorcentaje.toFixed(2)),
      ivaDolares: Number(ivaDolares.toFixed(2)),
      montoTotalSinIvaDivisa,
      cantidadFacturas,
      totalClientes,
    };
  });
  loading = signal(false);
  saving = signal(false);
  savingSupervisor = signal(false);
  imagenUploading = signal(false);
  empresasCargadas = signal(false);
  userPermissions = signal<string[]>([]);

  showModal = signal(false);
  editingAbono: Abono | null = null;
  selectedEmpresaInModal = signal('');

  columnasDisponibles = [
    { key: 'fecha', label: 'Fecha' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'empresa', label: 'Empresa' },
    { key: 'planta', label: 'Planta' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'cedula', label: 'Cédula' },
    { key: 'nFact', label: 'N. Fact' },
    { key: 'montoFactura', label: 'Monto Facts.\nBs' },
    { key: 'iva', label: 'Iva' },
    { key: 'diferencia', label: 'Diferencia\nBs' },
    { key: 'divisa', label: 'Diferencia\n$' },
    { key: 'pagoParcial', label: 'Pago\nParcial' },
    { key: 'tasa', label: 'Tasa' },
    { key: 'status', label: 'Status' },
    { key: 'supervisor', label: 'Supervisor' },
    // Opciones exclusivas para PDF: muestran montos de Comisión Planta en el header del PDF
    { key: 'comisionPlantaBs', label: 'Planta % (Bs.)' },
    { key: 'comisionPlantaUsd', label: 'Planta % ($)' },
  ];

  // Por defecto no marcar las columnas exclusivas de PDF para evitar que aparezcan en la tabla
  columnasSeleccionadas = signal<Set<string>>(new Set(this.columnasDisponibles.filter(c => c.key !== 'comisionPlantaBs' && c.key !== 'comisionPlantaUsd').map((c) => c.key)));
  // Para PDF dejamos las opciones de Planta sin seleccionar por defecto
  columnasSeleccionadasPdf = signal<Set<string>>(new Set(this.columnasDisponibles.filter(c => c.key !== 'comisionPlantaBs' && c.key !== 'comisionPlantaUsd').map((c) => c.key)));

  showModalColumnasPdf = signal(false);
  showModalSender = signal(false);

  columnasVisibles = computed(() => {
    if (this.esRoot()) {
      return this.columnasDisponibles.filter((c) => this.columnasSeleccionadas().has(c.key));
    }
    const permisos = this.userPermissions();
    return this.columnasDisponibles.filter((c) => permisos.includes(`columna_relaciones_${c.key}`));
  });

  columnasVisiblesPdf = computed(() => {
    if (this.esRoot()) {
      return this.columnasDisponibles.filter((c) => this.columnasSeleccionadasPdf().has(c.key));
    }
    const permisos = this.userPermissions();
    return this.columnasDisponibles.filter((c) => permisos.includes(`columna_relaciones_${c.key}`));
  });
  abonoValuacion: Abono | null = null;
  showModalValuacion = signal(false);

  showModalAbonos = signal(false);
  abonoAbonos: Abono | null = null;
  nuevoAbonoPago = signal<AbonoPago>({ fecha: this.getFechaLocal(), monto: 0 });
  imagenesPreview = signal<string[]>([]);
  archivosPendientes: File[] = [];
  imagenModalAbierta = signal(false);
  imagenModalUrl = signal<string>('');
  imagenModalZoom = signal(1);
  imagenModalOrigin = signal('50% 50%');
  imagenModalRotation = signal(0);
  @ViewChild('imagenModalImg', { static: false }) imagenModalImg!: ElementRef<HTMLImageElement>;
  imagenModalOffset = signal({ x: 0, y: 0 });
  imagenModalPanning = signal(false);
  private _panStart = { x: 0, y: 0 };
  tasasGuardadas = signal<TasaGuardada[]>([]);
  tasaManual = signal(0);
  loadingTasas = signal(false);
  nuevaTasaFecha = signal(this.getFechaLocal());
  nuevaTasaValor = signal(0);

  comisiones = computed(() => {
    const abonos = this.abonosFiltrados();
    const porcentajeManual = this.comisionNoAsignadaManual();

    const porSupervisor = new Map<
      string,
      {
        supervisorId: string;
        supervisor: string;
        monto: number;
        cantidad: number;
        comisionPorcentaje: number;
        comision: number;
      }
    >();

    let comisionPlanta = 0;

    for (const abono of abonos) {
      const supervisorId = abono.supervisorId || '';
      const montoFactura = abono.montoFactura ?? 0;
      const iva = abono.iva ?? 0;
      const comisionPorcentaje = abono.comisionPorcentaje ?? porcentajeManual ?? 0;

      if (supervisorId) {
        if (!porSupervisor.has(supervisorId)) {
          porSupervisor.set(supervisorId, {
            supervisorId,
            supervisor: abono.supervisor || '',
            monto: 0,
            cantidad: 0,
            comisionPorcentaje: abono.comisionPorcentaje ?? 0,
            comision: 0,
          });
        }

        const sup = porSupervisor.get(supervisorId)!;
        const montoSinIva = Math.max(0, montoFactura - iva);
        sup.monto += montoSinIva;
        sup.comision += montoSinIva * (comisionPorcentaje / 100);
        sup.cantidad++;

        if (porcentajeManual == null && abono.comisionPorcentaje) {
          sup.comisionPorcentaje = abono.comisionPorcentaje;
        }
      } else {
        if (porcentajeManual != null) {
          const comisionPorcentaje = porcentajeManual;
          comisionPlanta += (montoFactura - iva) * (comisionPorcentaje / 100);
        }
      }
    }

    const comisionesPorSupervisor = Array.from(porSupervisor.values()).map((sup) => ({
      ...sup,
      comision: sup.comision,
    }));

    const total = comisionesPorSupervisor.reduce((sum, c) => sum + c.comision, 0);

    return {
      comisionesPorSupervisor,
      comisionNoAsignada: comisionPlanta,
      comisionNoAsignadaPorcentaje: porcentajeManual ?? 0,
      total,
      montoFacturaNoAsignada: 0,
      haySupervisores: comisionesPorSupervisor.length > 0,
    };
  });

  comisionesComisiones = computed(() => {
    const abonos = this.abonosFiltradosComisiones();
    const porcentajeManual = this.comisionNoAsignadaManual();

    const porSupervisor = new Map<
      string,
      {
        supervisorId: string;
        supervisor: string;
        monto: number;
        cantidad: number;
        comisionPorcentaje: number;
        comision: number;
      }
    >();

    let comisionPlanta = 0;

    for (const abono of abonos) {
      const supervisorId = abono.supervisorId || '';
      const montoFactura = abono.montoFactura ?? 0;
      const iva = abono.iva ?? 0;
      const comisionPorcentaje = abono.comisionPorcentaje ?? porcentajeManual ?? 0;

      if (supervisorId) {
        if (!porSupervisor.has(supervisorId)) {
          porSupervisor.set(supervisorId, {
            supervisorId,
            supervisor: abono.supervisor || '',
            monto: 0,
            cantidad: 0,
            comisionPorcentaje: abono.comisionPorcentaje ?? 0,
            comision: 0,
          });
        }

        const sup = porSupervisor.get(supervisorId)!;
        const montoSinIva = Math.max(0, montoFactura - iva);
        sup.monto += montoSinIva;
        sup.comision += montoSinIva * (comisionPorcentaje / 100);
        sup.cantidad++;

        if (porcentajeManual == null && abono.comisionPorcentaje) {
          sup.comisionPorcentaje = abono.comisionPorcentaje;
        }
      } else {
        if (porcentajeManual != null) {
          const comisionPorcentaje = porcentajeManual;
          comisionPlanta += (montoFactura - iva) * (comisionPorcentaje / 100);
        }
      }
    }

    const comisionesPorSupervisor = Array.from(porSupervisor.values()).map((sup) => ({
      ...sup,
      comision: sup.comision,
    }));

    const total = comisionesPorSupervisor.reduce((sum, c) => sum + c.comision, 0);

    return {
      comisionesPorSupervisor,
      comisionNoAsignada: comisionPlanta,
      comisionNoAsignadaPorcentaje: porcentajeManual ?? 0,
      total,
      montoFacturaNoAsignada: 0,
    };
  });
  comisionNoAsignadaManual = signal<number | null>(null);
  loadingComisiones = signal(false);

  comisionesTabFiltros = signal({ supervisor: '', empresa: '', planta: '', fechaDesde: this.getFechaLocal(), fechaHasta: this.getFechaLocal() });
  comisionesTabSupervisorSeleccionado = signal<any | null>(null);
  comisionesTabAbonoSeleccionado = signal<any | null>(null);
  comisionesTabNombresAgrupados = signal<any[]>([]);
  comisionesTabNombreSeleccionado = signal<string>('');

   showModalSupervisores = signal(false);
   editingSupervisor = signal<Supervisor | null>(null);
   pestanaActiva = signal<'relaciones' | 'supervisores' | 'comisiones'>('relaciones');

   showModalSupervisoresRelaciones = signal(false);
   supervisoresAgrupados = signal<any[]>([]);

  tasaActual = signal<number>(0);
  tasaEuro = signal<number>(0);
  loadingTasaActual = signal(false);

  filtros = signal({
    nombre: '',
    empresa: '',
    planta: '',
    fechaDesde: this.getFechaLocal(),
    fechaHasta: this.getFechaLocal(),
    status: '',
    supervisor: '',
  });

  soloIvaPagado = signal(false);
  mostrarComisiones = signal(false);
  aplicarFiltroIva = signal(false);

  private getFechaLocal(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  mostrarEmpresaPdf = signal(false);
  mostrarPlantaPdf = signal(false);

  showModalTotalesPdfNombres = signal(false);
  incluirTotalesMontos = signal(false);
  incluirTotalesClientes = signal(false);
  incluirTotalesListas = signal(false);

  paginaActual = signal(1);
  readonly TAM_PAGINA = 10;

  abonosPaginados = computed(() => {
    const lista = this.abonosFiltrados();
    const inicio = (this.paginaActual() - 1) * this.TAM_PAGINA;
    return lista.slice(inicio, inicio + this.TAM_PAGINA);
  });

  totalPaginas = computed(() => {
    return Math.max(1, Math.ceil(this.abonosFiltrados().length / this.TAM_PAGINA));
  });

  numerosPaginas = computed(() => {
    const total = this.totalPaginas();
    const actual = this.paginaActual();
    const grupoInicio = Math.floor((actual - 1) / 10) * 10 + 1;
    const grupoFin = Math.min(grupoInicio + 9, total);
    const paginas: (number | string)[] = [];

    if (total <= 11) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    paginas.push(1);

    if (grupoInicio > 2) {
      paginas.push('...');
    } else if (grupoInicio === 2) {
      paginas.push(2);
    }

    for (let p = grupoInicio; p <= grupoFin; p++) {
      if (p > 1 && p < total) {
        paginas.push(p);
      }
    }

    if (grupoFin < total - 1) {
      paginas.push('...');
    } else if (grupoFin === total - 1) {
      paginas.push(total - 1);
    }

    if (total > 1) {
      paginas.push(total);
    }

    return paginas;
  });

  puedeIrAtrasGrupo = computed(() => {
    const actual = this.paginaActual();
    const grupoInicio = Math.floor((actual - 1) / 10) * 10 + 1;
    return grupoInicio > 1;
  });

  puedeIrAdelanteGrupo = computed(() => {
    const actual = this.paginaActual();
    const grupoInicio = Math.floor((actual - 1) / 10) * 10 + 1;
    return grupoInicio + 9 < this.totalPaginas();
  });

  irAtrasGrupo() {
    const actual = this.paginaActual();
    const grupoInicio = Math.floor((actual - 1) / 10) * 10 + 1;
    const nuevaPagina = Math.max(1, grupoInicio - 10);
    this.paginaActual.set(nuevaPagina);
  }

  irAdelanteGrupo() {
    const actual = this.paginaActual();
    const grupoInicio = Math.floor((actual - 1) / 10) * 10 + 1;
    const nuevaPagina = Math.min(this.totalPaginas(), grupoInicio + 10);
    this.paginaActual.set(nuevaPagina);
  }

  irAPagina(pagina: number | string) {
    if (typeof pagina === 'number') {
      this.cambiarPagina(pagina);
    }
  }

  ngOnInit() {
    this.empresasService.load();
    this.empresasService.empresas$.subscribe({
      next: (data) => this.empresas.set(data),
    });
    this.loadAbonos(true);
    this.loadTasaActual();
    this.cargarSupervisores();
    this.loadUserPermissions();
  }

  @HostListener('window:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent) {
    // Toggle comisiones visibility with F3
    if (event.key === 'F2') {
      event.preventDefault();
      this.mostrarComisiones.update(v => !v);
    }
  }

  onComisionNoAsignadaChange(valor: string) {
    const num = Number(valor) || 0;
    this.comisionNoAsignadaManual.set(num);
    localStorage.setItem('comisionNoAsignadaManualPorcentaje', String(num));
  }

  private abonosFiltradosComisiones = computed(() => {
    const f = this.comisionesTabFiltros();
    return this.abonos().filter((a) => {
      let passes = true;
      if (f.empresa) {
        passes = passes && a.empresa === f.empresa;
      }
      if (f.planta) {
        passes = passes && a.planta === f.planta;
      }
      if (f.fechaDesde) {
        const fechaLocal = this.parsearFechaLocal(a.fecha || '').toLocaleDateString('en-CA');
        passes = passes && fechaLocal >= f.fechaDesde;
      }
      if (f.fechaHasta) {
        const fechaLocal = this.parsearFechaLocal(a.fecha || '').toLocaleDateString('en-CA');
        passes = passes && fechaLocal <= f.fechaHasta;
      }
      if (f.supervisor) {
        passes = passes && (a.supervisor || '') === f.supervisor;
      }
      return passes;
    });
  });

  comisionesTabData = computed(() => {
    const abonos = this.abonosFiltradosComisiones();
    const porSupervisor = new Map<
      string,
      {
        supervisorId: string;
        supervisor: string;
        planta: string;
        cantidad: number;
        montoFactura: number;
        iva: number;
        montoFacturaSinIva: number;
        comision: number;
        comisionPorcentaje: number;
        abonos: any[];
      }
    >();

    for (const abono of abonos) {
      const supervisorId = abono.supervisorId || '';
      const montoFactura = abono.montoFactura ?? 0;
      const iva = abono.iva ?? 0;
      const comisionPorcentaje = abono.comisionPorcentaje ?? 0;

      if (supervisorId) {
        if (!porSupervisor.has(supervisorId)) {
          porSupervisor.set(supervisorId, {
            supervisorId,
            supervisor: abono.supervisor || '',
            planta: abono.planta || '',
            cantidad: 0,
            montoFactura: 0,
            iva: 0,
            montoFacturaSinIva: 0,
            comision: 0,
            comisionPorcentaje,
            abonos: [],
          });
        }

        const sup = porSupervisor.get(supervisorId)!;
        sup.montoFactura += montoFactura;
        sup.iva += iva;
        sup.montoFacturaSinIva += montoFactura - iva;
        // Comisiones deben calcularse sobre monto sin IVA
        sup.comision += Math.max(0, montoFactura - iva) * (comisionPorcentaje / 100);
        sup.cantidad++;
        sup.abonos.push(abono);

        if (comisionPorcentaje) {
          sup.comisionPorcentaje = comisionPorcentaje;
        }
      }
    }

    return Array.from(porSupervisor.values());
  });

  comisionesTabLoading = signal(false);

  loadComisionesTab() {
    this.comisionesTabLoading.set(true);
    this.comisionesTabSupervisorSeleccionado.set(null);
    this.comisionesTabAbonoSeleccionado.set(null);
    this.comisionesTabNombreSeleccionado.set('');
    this.comisionesTabNombresAgrupados.set([]);

    setTimeout(() => {
      this.comisionesTabLoading.set(false);
    }, 0);
  }

  onComisionesTabFiltroChange() {
    this.comisionesTabSupervisorSeleccionado.set(null);
    this.comisionesTabAbonoSeleccionado.set(null);
    this.loadComisionesTab();
  }

  actualizarFiltroComision(key: 'supervisor' | 'empresa' | 'planta' | 'fechaDesde' | 'fechaHasta', value: string) {
    this.comisionesTabFiltros.update((filtros) => ({ ...filtros, [key]: value }));
  }

  limpiarPlantasAlCambiarEmpresa() {
    this.comisionesTabFiltros.update((filtros) => ({ ...filtros, planta: '' }));
  }

  seleccionarSupervisorComisiones(supervisor: any) {
    this.comisionesTabSupervisorSeleccionado.set(supervisor);
    this.comisionesTabAbonoSeleccionado.set(null);
    this.comisionesTabNombreSeleccionado.set('');
    const abonos = supervisor.abonos || [];
    const nombresAgrupados = abonos.reduce((acc: any[], abono: any) => {
      const nombre = abono.nombre || 'Sin nombre';
      const existente = acc.find(n => n.nombre === nombre);
      const montoFactura = abono.montoFactura ?? 0;
      const iva = abono.iva ?? 0;
      const comisionPorcentaje = abono.comisionPorcentaje ?? supervisor.comisionPorcentaje ?? 0;
      const planta = abono.planta || '';
      if (existente) {
        existente.cantidad++;
        existente.montoFactura += montoFactura;
        existente.iva += iva;
        existente.montoFacturaSinIva += montoFactura - iva;
        existente.comision += Math.max(0, montoFactura - iva) * (comisionPorcentaje / 100);
        existente.comisionPorcentaje = comisionPorcentaje;
        if (!existente.planta && planta) {
          existente.planta = planta;
        }
        existente.abonos.push(abono);
      } else {
        acc.push({
          nombre,
          planta,
          cantidad: 1,
          montoFactura,
          iva,
          montoFacturaSinIva: montoFactura - iva,
          comision: Math.max(0, montoFactura - iva) * (comisionPorcentaje / 100),
          comisionPorcentaje,
          abonos: [abono],
        });
      }
      return acc;
    }, []);
    this.comisionesTabNombresAgrupados.set(nombresAgrupados);
  }

  seleccionarNombreComisiones(nombre: string) {
    this.comisionesTabNombreSeleccionado.set(nombre);
    this.comisionesTabAbonoSeleccionado.set(null);
  }

  seleccionarAbonoComisiones(abono: any) {
    this.comisionesTabAbonoSeleccionado.set(abono);
  }

  volverAListaAbonos() {
    this.comisionesTabAbonoSeleccionado.set(null);
  }

  getSupervisorApellido(supervisorId: string): string {
    const supervisor = this.supervisores().find(s => s._id === supervisorId);
    return supervisor?.apellido ? ` ${supervisor.apellido}` : '';
  }

  getAbonosPorNombreSeleccionado(): any[] {
    const nombre = this.comisionesTabNombreSeleccionado();
    if (!nombre) return [];
    const grupo = this.comisionesTabNombresAgrupados().find(n => n.nombre === nombre);
    return grupo?.abonos || [];
  }

  volverAListaNombres() {
    this.comisionesTabNombreSeleccionado.set('');
    this.comisionesTabAbonoSeleccionado.set(null);
  }

  volverAListaSupervisores() {
    this.comisionesTabSupervisorSeleccionado.set(null);
    this.comisionesTabNombreSeleccionado.set('');
    this.comisionesTabAbonoSeleccionado.set(null);
    this.comisionesTabNombresAgrupados.set([]);
  }

  volverAComisiones() {
    if (this.comisionesTabNombreSeleccionado()) {
      this.volverAListaNombres();
    } else if (this.comisionesTabSupervisorSeleccionado()) {
      this.volverAListaSupervisores();
    } else {
      this.comisionesTabSupervisorSeleccionado.set(null);
      this.comisionesTabNombreSeleccionado.set('');
      this.comisionesTabAbonoSeleccionado.set(null);
      this.comisionesTabNombresAgrupados.set([]);
      this.loadComisionesTab();
    }
  }

  loadTasaActual() {
    this.loadingTasaActual.set(true);
    this.http.get<TasaResponse>('/api/tasas').subscribe({
      next: (data) => {
        const usd = data?.current?.usd;
        const eur = data?.current?.eur;
        this.tasaActual.set(typeof usd === 'number' ? usd : 0);
        this.tasaEuro.set(typeof eur === 'number' ? eur : 0);
        this.loadingTasaActual.set(false);
      },
      error: () => {
        this.tasaActual.set(0);
        this.tasaEuro.set(0);
        this.loadingTasaActual.set(false);
      },
    });
  }

  loadAbonos(force = false) {
    this.loading.set(true);
    const url = force ? `${this.API}?t=${new Date().getTime()}` : this.API;
    this.http.get<Abono[]>(url).subscribe({
      next: (data) => {
        this.abonos.set([...data].sort((a, b) => this.parsearFechaLocal(b.fecha).getTime() - this.parsearFechaLocal(a.fecha).getTime()));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading abonos:', err);
        this.loading.set(false);
      },
    });
  }

  onEmpresaFilterChange(empresa: string) {
    this.filtros.update((f) => ({ ...f, empresa, planta: '' }));
    this.paginaActual.set(1);
  }

  onEmpresaChange() {
    this.filtros.update((f) => ({ ...f, planta: '' }));
    this.paginaActual.set(1);
  }

  onNombreFilterChange(nombre: string) {
    this.filtros.update((f) => ({ ...f, nombre }));
    this.paginaActual.set(1);
  }

  onPlantaFilterChange(planta: string) {
    this.filtros.update((f) => ({ ...f, planta }));
    this.paginaActual.set(1);
  }

  onFechaDesdeChange(fecha: string) {
    this.filtros.update((f) => ({ ...f, fechaDesde: fecha }));
    this.paginaActual.set(1);
  }

  onFechaHastaChange(fecha: string) {
    this.filtros.update((f) => ({ ...f, fechaHasta: fecha }));
    this.paginaActual.set(1);
  }

  onStatusFilterChange(status: string) {
    this.filtros.update((f) => ({ ...f, status }));
    this.paginaActual.set(1);
  }

  onSupervisorFilterChange(supervisor: string) {
    this.filtros.update((f) => ({ ...f, supervisor }));
    this.paginaActual.set(1);
  }

  cambiarPagina(pagina: number) {
    const total = this.totalPaginas();
    this.paginaActual.set(Math.max(1, Math.min(total, pagina)));
  }

  abrirModalColumnasPdf() {
    this.showModalColumnasPdf.set(true);
  }

  cerrarModalColumnasPdf() {
    this.showModalColumnasPdf.set(false);
  }

  abrirModalSender() {
    this.showModalSender.set(true);
  }

  cerrarModalSender() {
    this.showModalSender.set(false);
  }

  toggleColumnaPdf(key: string) {
    this.columnasSeleccionadasPdf.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(key)) {
        nuevo.delete(key);
      } else {
        nuevo.add(key);
      }
      return nuevo;
    });
  }

  isColumnaSeleccionadaPdf(key: string): boolean {
    return this.columnasSeleccionadasPdf().has(key);
  }

  exportarSenderExcel() {
      const datos = this.abonosFiltrados();
      if (datos.length === 0) {
        alert('No hay datos para exportar');
        return;
      }

      const vistos = new Set<string>();
      const filas: { telefono: string; primerNombre: string; apellido: string }[] = [];
      for (const abono of datos) {
        const clave = `${(abono.nombre || '').trim().toLowerCase()}|${(abono.telefono || '').trim()}`;
        if (clave && !vistos.has(clave)) {
          vistos.add(clave);
          let telefono = (abono.telefono || '').trim();
          if (telefono.startsWith('04')) {
            telefono = '+58' + telefono.slice(1);
          }
          const nombreCompleto = (abono.nombre || '').trim();
          const partes = nombreCompleto.split(/\s+/).filter(Boolean);
          const primerNombre = partes[0] || '';
          const apellido = partes.length >= 3 ? partes[partes.length - 1] : partes[1] || '';
          filas.push({ telefono, primerNombre, apellido });
        }
      }

      if (filas.length === 0) {
        alert('No hay datos para exportar');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sender');

      worksheet.columns = [
        { width: 20 },
        { width: 20 },
        { width: 20 },
      ];

      const headerRow = worksheet.addRow(['phone', 'Nombre', 'Apellido']);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D63C1' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      for (const fila of filas) {
        const row = worksheet.addRow([fila.telefono, fila.primerNombre, fila.apellido]);
        row.eachCell((cell) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      }

      workbook.xlsx.writeBuffer().then((buffer: ArrayBuffer) => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sender_${this.getFechaLocal()}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      });
    }

  private obtenerFilasSender(datos: Abono[]) {
    const vistos = new Set<string>();
    const filas: { telefono: string; primerNombre: string; apellido: string }[] = [];
    for (const abono of datos) {
      const clave = `${(abono.nombre || '').trim().toLowerCase()}|${(abono.telefono || '').trim()}`;
      if (clave && !vistos.has(clave)) {
        vistos.add(clave);
        let telefono = (abono.telefono || '').trim();
        if (telefono.startsWith('04')) {
          telefono = '+58' + telefono.slice(1);
        }
        const nombreCompleto = (abono.nombre || '').trim();
        const partes = nombreCompleto.split(/\s+/).filter(Boolean);
        const primerNombre = partes[0] || '';
        const apellido = partes.length >= 3 ? partes[partes.length - 1] : partes[1] || '';
        filas.push({ telefono, primerNombre, apellido });
      }
    }
    return filas;
  }

  exportarSenderCsv() {
    const datos = this.abonosFiltrados();
    if (datos.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const filas = this.obtenerFilasSender(datos);

    if (filas.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const csv = [
      ['phone', 'Nombre', 'Apellido'].join(','),
      ...filas.map((fila) =>
        [
          fila.telefono,
          this.formatearCsv(fila.primerNombre),
          this.formatearCsv(fila.apellido),
        ].join(',')
      ),
    ].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sender_${this.getFechaLocal()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private formatearCsv(valor: string): string {
    if (/[,"\r\n]/.test(valor)) {
      return `"${valor.replace(/"/g, '""')}"`;
    }
    return valor;
  }

  exportarVCard() {
    const datos = this.abonosFiltrados();
    if (datos.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const nombresVistos = new Set<string>();
    const cedulasVistas = new Set<string>();
    const unicos = datos.filter((abono) => {
      const nombre = (abono.nombre || '').trim().toLowerCase();
      const cedula = (abono.cedula || '').trim();
      const nombreRepetido = nombre ? nombresVistos.has(nombre) : false;
      const cedulaRepetida = cedula ? cedulasVistas.has(cedula) : false;
      if (nombreRepetido || cedulaRepetida) return false;
      if (nombre) nombresVistos.add(nombre);
      if (cedula) cedulasVistas.add(cedula);
      return true;
    });

    if (unicos.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const vcards = unicos.map((abono) => {
      const nombre = (abono.nombre || '').trim();
      const empresa = (abono.empresa || '').trim();
      const fn = [nombre, empresa].filter(Boolean).join(' ');
      let tel = (abono.telefono || '').trim();
      if (tel.startsWith('04')) {
        tel = '+58' + tel.slice(1);
      }
      const planta = (abono.planta || '').trim();
      const cedula = (abono.cedula || '').trim();
      const nFact = (abono.nFact || '').trim();

      const lineas = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${fn}`,
        empresa ? `ORG:${empresa}` : undefined,
        tel ? `TEL;TYPE=CELL:${tel}` : undefined,
        `NOTE:Planta: ${planta} | Cedula: ${cedula} | N.Fact: ${nFact}`,
        'END:VCARD',
      ].filter(Boolean);

      return lineas.join('\r\n');
    });

    const contenido = vcards.join('\r\n');
    const blob = new Blob([contenido], { type: 'text/vcard;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contactos_${this.getFechaLocal()}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

    esRoot(): boolean {
    return this.authService.user()?.rol === 'root';
  }

  loadUserPermissions() {
    const user = this.authService.user();
    if (!user) {
      this.userPermissions.set([]);
      return;
    }

    if (user.rol === 'root' || user.rol === 'admin') {
      this.http.get<any[]>('/api/roles/permisos').subscribe({
        next: (permisos) => {
          const permisosIds = permisos.map((p: any) => p.id);
          this.userPermissions.set(permisosIds);
        },
        error: () => this.userPermissions.set([]),
      });
    } else if (user.rolId) {
      this.http.get<any>('/api/roles/' + user.rolId).subscribe({
        next: (rol) => {
          this.userPermissions.set(rol.permisos || []);
        },
        error: () => this.userPermissions.set([]),
      });
    } else {
      this.userPermissions.set([]);
    }
  }

  puedeVerTotales(): boolean {
    const user = this.authService.user();
    if (!user) return false;
    if (user.rol === 'root') return true;
    return this.userPermissions().includes('totales_ver');
  }

  getValorAbono(abono: Abono, key: string): string {
    const valor = (abono as any)[key];
    switch (key) {
      case 'fecha':
        return this.formatFecha(abono.fecha);
      case 'montoFactura':
        return this.formatMonto(abono.montoFactura ?? 0);
      case 'iva':
        return this.formatMonto(abono.iva ?? 0);
      case 'diferencia':
        return this.formatMonto(abono.diferencia ?? 0);
      case 'divisa':
        return (abono.divisa ?? 0).toFixed(2);
      case 'pagoParcial':
        return this.formatMonto(abono.abonos ?? 0);
      case 'tasa':
        return (abono.tasa ?? 0).toFixed(2);
      case 'telefono':
        return this.formatTelefono(abono.telefono);
      case 'cedula':
        return this.formatCedula(abono.cedula);
      case 'nFact':
        return abono.nFact ? (+abono.nFact) + '' : '';
      case 'empresa':
        return abono.empresa || '-';
      case 'planta':
        return abono.planta;
      case 'status':
        return abono.status;
      case 'supervisor':
        return abono.supervisor || '-';
      
      default:
        return valor ?? '';
    }
  }

  onCeldaIvaClick(abono: Abono, event: Event) {
    event.stopPropagation();
    this.toggleIvaPagado(abono);
  }

  filtrarAbonos() {
    // No-op: filtering handled by computed signal
  }

  abrirModal(abono?: Abono) {
    if (abono) {
      this.http.get<Abono[]>(`${this.API}?t=${new Date().getTime()}`).subscribe({
        next: (data) => {
          const abonoActualizado = data.find((a) => a._id === abono._id) || abono;
          this.abonos.set([...data].sort((a, b) => this.parsearFechaLocal(b.fecha).getTime() - this.parsearFechaLocal(a.fecha).getTime()));
          this.editingAbono = {
            ...abonoActualizado,
            fecha: abonoActualizado.fecha || '',
            empresa: abonoActualizado.empresa || '',
            montoFactura: abonoActualizado.montoFactura ?? 0,
            abonos: abonoActualizado.abonos ?? 0,
            abonosPagos: abonoActualizado.abonosPagos && abonoActualizado.abonosPagos.length > 0 ? abonoActualizado.abonosPagos : (abonoActualizado.abonos ? [{ fecha: abonoActualizado.fecha || this.getFechaLocal(), monto: abonoActualizado.abonos }] : []),
            iva: abonoActualizado.iva ?? 0,
            ivaPagado: abonoActualizado.ivaPagado || false,
            diferencia: abonoActualizado.diferencia ?? 0,
            tasa: abonoActualizado.tasa ?? 0,
            divisa: abonoActualizado.divisa ?? 0,
            supervisor: abonoActualizado.supervisor || '',
            supervisorId: abonoActualizado.supervisorId || '',
            comisionPorcentaje: abonoActualizado.comisionPorcentaje ?? 0,
          };
          if (abonoActualizado.empresa) {
            this.selectedEmpresaInModal.set(abonoActualizado.empresa);
          }
          this.actualizarTotalAbonos();
          this.calcularPagoParcial();
          this.showModal.set(true);
        },
        error: () => {
          this.editingAbono = {
            ...abono,
            fecha: abono.fecha || '',
            empresa: abono.empresa || '',
            montoFactura: abono.montoFactura ?? 0,
            abonos: abono.abonos ?? 0,
            abonosPagos: abono.abonosPagos && abono.abonosPagos.length > 0 ? abono.abonosPagos : (abono.abonos ? [{ fecha: abono.fecha || this.getFechaLocal(), monto: abono.abonos }] : []),
            iva: abono.iva ?? 0,
            ivaPagado: abono.ivaPagado || false,
            diferencia: abono.diferencia ?? 0,
            tasa: abono.tasa ?? 0,
            divisa: abono.divisa ?? 0,
            supervisor: abono.supervisor || '',
            supervisorId: abono.supervisorId || '',
            comisionPorcentaje: abono.comisionPorcentaje ?? 0,
          };
          if (abono.empresa) {
            this.selectedEmpresaInModal.set(abono.empresa);
          }
          this.actualizarTotalAbonos();
          this.calcularPagoParcial();
          this.showModal.set(true);
        },
      });
    } else {
      this.editingAbono = {
        fecha: this.getFechaLocal(),
        nombre: '',
        empresa: '',
        planta: '',
        cedula: '',
        telefono: '',
        nFact: '',
        montoFactura: 0,
        abonos: 0,
        abonosPagos: [],
        iva: 0,
        ivaPagado: false,
        diferencia: 0,
        tasa: 0,
        divisa: 0,
        status: '',
        supervisor: '',
        supervisorId: '',
        comisionPorcentaje: 0,
      };
      this.nuevoAbonoPago.set({ fecha: this.getFechaLocal(), monto: 0 });
      this.showModal.set(true);
    }
  }

  abrirModalAbonos(abono: Abono) {
    this.abonoAbonos = abono;
    this.showModalAbonos.set(true);
  }

  cerrarModalAbonos() {
    this.showModalAbonos.set(false);
    this.abonoAbonos = null;
  }

  cerrarModal() {
    this.showModal.set(false);
    this.editingAbono = null;
    this.selectedEmpresaInModal.set('');
  }

  onFormEmpresaChange() {
    if (!this.editingAbono) return;
    this.selectedEmpresaInModal.set(this.editingAbono.empresa || '');
    this.editingAbono.planta = '';
  }

  onSupervisorChange(supervisorId: string) {
    if (!this.editingAbono) return;
    if (!supervisorId) {
      this.editingAbono.supervisor = '';
      this.editingAbono.supervisorId = '';
      return;
    }
    const supervisor = this.supervisores().find((s) => s._id === supervisorId);
    if (supervisor) {
      this.editingAbono.supervisor = supervisor.nombre;
      this.editingAbono.supervisorId = supervisor._id;
    }
  }

  formatearMontoInput(valor: number | undefined | null): string {
    const num = Number(valor) || 0;
    return num.toFixed(2).replace('.', ',');
  }

  parsearMontoInput(valor: string): number {
    const limpio = valor.replace(',', '.').replace(/\D/g, '');
    const numero = Number(limpio) || 0;
    return Number((numero / 100).toFixed(2));
  }

  onMontoFocus(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  actualizarMonto(event: Event, campo: 'montoFactura' | 'iva' | 'diferencia' | 'tasa' | 'divisa') {
    if (!this.editingAbono) return;
    const input = event.target as HTMLInputElement;
    const valor = this.parsearMontoInput(input.value);
    (this.editingAbono as any)[campo] = valor;
    input.value = this.formatearMontoInput(valor);

    if (campo === 'montoFactura' || campo === 'iva') {
      this.calcularPagoParcial();
    } else if (campo === 'tasa') {
      this.calcularDivisa();
    }
  }

  actualizarAbonos(event: Event) {
    if (!this.editingAbono) return;
    const input = event.target as HTMLInputElement;
    const valor = this.parsearMontoInput(input.value);
    this.editingAbono.abonos = valor;
    input.value = this.formatearMontoInput(valor);
    this.calcularPagoParcial();
  }

  actualizarNuevoAbono(event: Event) {
    const input = event.target as HTMLInputElement;
    const valor = this.parsearMontoInput(input.value);
    this.nuevoAbonoPago.update((pago) => ({ ...pago, monto: valor }));
    input.value = this.formatearMontoInput(valor);
  }

  agregarAbonoPago() {
    if (!this.editingAbono || !this.nuevoAbonoPago().monto) return;
    const nuevoPago: AbonoPago = {
      fecha: this.nuevoAbonoPago().fecha || this.getFechaLocal(),
      monto: this.nuevoAbonoPago().monto,
    };
    this.editingAbono.abonosPagos = [...(this.editingAbono.abonosPagos || []), nuevoPago];
    this.nuevoAbonoPago.set({ fecha: this.getFechaLocal(), monto: 0 });
    this.actualizarTotalAbonos();
    this.calcularPagoParcial();
  }

  eliminarAbonoPago(index: number) {
    if (!this.editingAbono || !this.editingAbono.abonosPagos) return;
    this.editingAbono.abonosPagos = this.editingAbono.abonosPagos.filter((_, i) => i !== index);
    this.actualizarTotalAbonos();
    this.calcularPagoParcial();
  }

  actualizarTotalAbonos() {
    if (!this.editingAbono) return;
    const total = (this.editingAbono.abonosPagos || []).reduce((sum, p) => sum + p.monto, 0);
    this.editingAbono.abonos = Number(total.toFixed(2));
  }

  toggleIvaPagadoModal() {
    if (!this.editingAbono) return;
    this.editingAbono.ivaPagado = !this.editingAbono.ivaPagado;
    this.calcularPagoParcial();
  }

  toggleIvaPagado(abono: Abono) {
    this.abonos.update((lista) =>
      lista.map((a) => {
        if (a._id !== abono._id) return a;
        const nuevoIvaPagado = !a.ivaPagado;
        const monto = Number(a.montoFactura) || 0;
        const abonos = Number(a.abonos) || 0;
        const iva = Number(a.iva) || 0;
        const ivaPagado = nuevoIvaPagado ? iva : 0;
        return { ...a, ivaPagado: nuevoIvaPagado, diferencia: Number((monto - abonos - ivaPagado).toFixed(2)) };
      })
    );
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDropImagen(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.procesarArchivoImagen(files[0]);
    }
  }

  onFileImagenChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.procesarArchivoImagen(input.files[0]);
    }
    input.value = '';
  }

  onPasteImagen(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          this.procesarArchivoImagen(file);
        }
        break;
      }
    }
  }

  getImageUrl(url: string | undefined): string {
if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Elimina la barra inicial si existe
  let cleanPath = url.replace(/^\//, '');

  // Si la ruta ya incluye "api/uploads/", la remueve antes de concatenar
  if (cleanPath.startsWith('api/uploads/')) {
    cleanPath = cleanPath.replace(/^api\/uploads\//, '');
  }

  return `${this.SERVER_URL}/api/uploads/${cleanPath}`;
  }
  abrirImagen(url: string | undefined) {
    const fullUrl = this.getImageUrl(url ?? '');
    if (fullUrl) {
      // reset zoom and origin when opening
      this.imagenModalZoom.set(1);
      this.imagenModalRotation.set(0);
      this.imagenModalOrigin.set('50% 50%');
      this.imagenModalOffset.set({ x: 0, y: 0 });
      this.imagenModalPanning.set(false);
      this.imagenModalUrl.set(fullUrl);
      this.imagenModalAbierta.set(true);
    }
  }

  cerrarImagenModal() {
    this.imagenModalAbierta.set(false);
    this.imagenModalUrl.set('');
    // reset zoom state
    this.imagenModalZoom.set(1);
    this.imagenModalOrigin.set('50% 50%');
    this.imagenModalOffset.set({ x: 0, y: 0 });
    this.imagenModalPanning.set(false);
  }

  onImagenWheel(event: WheelEvent) {
    if (!this.imagenModalAbierta()) return;
    event.preventDefault();
    // set transform-origin to cursor position so zoom focuses where the wheel is
    const imgEl = this.imagenModalImg?.nativeElement;
    if (imgEl) {
      const rect = imgEl.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const xPct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const yPct = Math.max(0, Math.min(100, (y / rect.height) * 100));
      this.imagenModalOrigin.set(`${xPct}% ${yPct}%`);
    }

    const delta = -Math.sign(event.deltaY || 0);
    const factor = delta > 0 ? 1.12 : 0.88;
    let next = this.imagenModalZoom() * factor;
    next = Math.max(0.25, Math.min(6, next));
    this.imagenModalZoom.set(Number(next.toFixed(3)));
    // clamp offset after zoom change
    setTimeout(() => this._clampOffset(), 0);
  }

  zoomIn() {
    const factor = 1.12;
    let next = this.imagenModalZoom() * factor;
    next = Math.min(6, next);
    this.imagenModalZoom.set(Number(next.toFixed(3)));
    this._clampOffset();
  }

  zoomOut() {
    const factor = 0.88;
    let next = this.imagenModalZoom() * factor;
    next = Math.max(0.25, next);
    this.imagenModalZoom.set(Number(next.toFixed(3)));
    this._clampOffset();
  }

  resetZoom() {
    this.imagenModalZoom.set(1);
    this.imagenModalOrigin.set('50% 50%');
    this.imagenModalOffset.set({ x: 0, y: 0 });
    this.imagenModalPanning.set(false);
  }

  rotate90() {
    const next = (this.imagenModalRotation() + 90) % 360;
    this.imagenModalRotation.set(next);
    // reset pan and zoom to avoid complex clamp when rotated
    this.imagenModalZoom.set(1);
    this.imagenModalOffset.set({ x: 0, y: 0 });
    this.imagenModalOrigin.set('50% 50%');
  }

  rotate180() {
    const next = (this.imagenModalRotation() + 180) % 360;
    this.imagenModalRotation.set(next);
    this.imagenModalZoom.set(1);
    this.imagenModalOffset.set({ x: 0, y: 0 });
    this.imagenModalOrigin.set('50% 50%');
  }

  resetRotation() {
    this.imagenModalRotation.set(0);
  }

  private _clampOffset() {
    const imgEl = this.imagenModalImg?.nativeElement;
    if (!imgEl) return;
    const parent = imgEl.parentElement as HTMLElement;
    if (!parent) return;

    const rect = imgEl.getBoundingClientRect();
    const zoom = this.imagenModalZoom();
    // Calculate base (untransformed) size
    const baseWidth = rect.width / Math.max(zoom, 0.0001);
    const baseHeight = rect.height / Math.max(zoom, 0.0001);

    const scaledWidth = baseWidth * zoom;
    const scaledHeight = baseHeight * zoom;
    const parentRect = parent.getBoundingClientRect();

    const maxOffsetX = Math.max(0, (scaledWidth - parentRect.width) / 2);
    const maxOffsetY = Math.max(0, (scaledHeight - parentRect.height) / 2);

    const curr = this.imagenModalOffset();
    const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, curr.x || 0));
    const clampedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, curr.y || 0));
    this.imagenModalOffset.set({ x: clampedX, y: clampedY });
  }

  iniciarPan(event: PointerEvent) {
    if (!this.imagenModalAbierta() || this.imagenModalZoom() <= 1) return;
    event.preventDefault();
    const imgEl = this.imagenModalImg?.nativeElement;
    if (imgEl) {
      try { imgEl.setPointerCapture(event.pointerId); } catch (e) {}
    }
    this._panStart = { x: event.clientX - this.imagenModalOffset().x, y: event.clientY - this.imagenModalOffset().y };
    this.imagenModalPanning.set(true);
  }

  moverPan(event: PointerEvent) {
    if (!this.imagenModalPanning()) return;
    event.preventDefault();
    const x = event.clientX - this._panStart.x;
    const y = event.clientY - this._panStart.y;
    this.imagenModalOffset.set({ x, y });
  }

  terminarPan(event?: PointerEvent) {
    if (!this.imagenModalPanning()) return;
    if (event) {
      const imgEl = this.imagenModalImg?.nativeElement;
      if (imgEl) {
        try { imgEl.releasePointerCapture(event.pointerId); } catch (e) {}
      }
    }
    this.imagenModalPanning.set(false);
  }

  descargarImagen(url: string | undefined) {
    const fullUrl = this.getImageUrl(url ?? '');
    if (!fullUrl) return;
    fetch(fullUrl)
      .then((response) => response.blob())
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        const fileName = fullUrl.split('/').pop() || 'imagen.jpg';
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch((err) => console.error('Error al descargar la imagen:', err));
  }

  imprimirImagen(url: string | undefined) {
    const fullUrl = this.getImageUrl(url ?? '');
    if (!fullUrl) return;
    const ventana = window.open(fullUrl, '_blank');
    if (ventana) {
      ventana.addEventListener('load', () => {
        ventana.print();
      });
    }
  }
  procesarArchivoImagen(file: File) {
    if (!this.editingAbono) return;
    const localPreviewUrl = URL.createObjectURL(file);
    this.imagenesPreview.set([localPreviewUrl]);

    if (this.editingAbono._id) {
      this.subirImagenServidor(this.editingAbono._id, file);
    } else {
      this.archivosPendientes.push(file);
    }
  }

  subirImagenServidor(idAbono: string, file: File) {
    const formData = new FormData();
    formData.append('imagen', file);

    this.imagenUploading.set(true);
    this.http.post<{ imagenes: string[] }>(`${this.API}/${idAbono}/imagenes`, formData).subscribe({
      next: (res) => {
        if (this.editingAbono) {
          this.editingAbono.imagenes = res.imagenes || [];
        }
        this.imagenUploading.set(false);
      },
      error: (err) => {
        console.error('Error al subir imagen:', err);
        this.imagenUploading.set(false);
      },
    });
  }

  eliminarImagen(index: number) {
    if (!this.editingAbono || !this.editingAbono._id) return;
    const imagenes = this.editingAbono.imagenes || [];
    const url = imagenes[index];
    if (!url) return;
    this.http.delete<{ imagenes: string[] }>(`${this.API}/${this.editingAbono._id}/imagenes?url=${encodeURIComponent(url)}`).subscribe({
      next: (res) => {
        if (this.editingAbono) {
          this.editingAbono.imagenes = res.imagenes || [];
        }
      },
      error: () => {},
    });
  }

  calcularPagoParcial() {
    if (!this.editingAbono) return;
    const monto = Number(this.editingAbono.montoFactura) || 0;
    const abonos = Number(this.editingAbono.abonos) || 0;
    const iva = Number(this.editingAbono.iva) || 0;
    const ivaPagado = this.editingAbono.ivaPagado ? iva : 0;
    this.editingAbono.diferencia = Number((monto - abonos - ivaPagado).toFixed(2));
    this.calcularDivisa();
  }

  calcularDerivados() {
    if (!this.editingAbono) return;
    const monto = Number(this.editingAbono.montoFactura) || 0;
    const iva = Number(this.editingAbono.iva) || 0;
    this.editingAbono.diferencia = Number((monto - iva).toFixed(2));
    this.calcularDivisa();
  }

  calcularDivisa() {
    if (!this.editingAbono) return;
    const tasa = Number(this.editingAbono.tasa);
    if (tasa > 0) {
      this.editingAbono.divisa = Number(((this.editingAbono.diferencia ?? 0) / tasa).toFixed(2));
    } else {
      this.editingAbono.divisa = 0;
    }
  }

  guardarAbono() {
    if (!this.editingAbono) return;

    if (!this.editingAbono.nombre.trim() || !this.editingAbono.empresa || !this.editingAbono.planta || !this.editingAbono.nFact) {
      alert('Por favor, complete los campos requeridos: Nombre, Empresa, Planta y N. Fact');
      return;
    }

    const existeDuplicado = this.abonos().some((a) => {
      const nFactIgual = (a.nFact || '').trim() === (this.editingAbono!.nFact || '').trim();
      const esMismoRegistro = a._id && this.editingAbono!._id && a._id === this.editingAbono!._id;
      return nFactIgual && !esMismoRegistro;
    });

    if (existeDuplicado) {
      alert('Ya existe un registro con ese N. Fact');
      return;
    }

    this.saving.set(true);

    const payload = {
      ...this.editingAbono,
      supervisor: this.editingAbono.supervisor || '',
      supervisorId: this.editingAbono.supervisorId || '',
    };

    if (this.editingAbono._id) {
      this.http.put<Abono>(`${this.API}/${this.editingAbono._id}`, payload).subscribe({
        next: (abonoActualizado) => {
          this.saving.set(false);
          if (abonoActualizado && abonoActualizado._id) {
            this.abonos.update((lista) => {
              const index = lista.findIndex((a) => a._id === abonoActualizado._id);
              if (index >= 0) {
                lista[index] = abonoActualizado;
              } else {
                lista.unshift(abonoActualizado);
              }
              return [...lista].sort((a, b) => this.parsearFechaLocal(b.fecha).getTime() - this.parsearFechaLocal(a.fecha).getTime());
            });
          } else {
            this.loadAbonos(true);
          }
          this.cerrarModal();
        },
        error: (err) => {
          console.error('Error updating abono:', err);
          this.saving.set(false);
          this.loadAbonos(true);
        },
      });
    } else {
      this.http.post<Abono>(this.API, payload).subscribe({
        next: (abonoCreado) => {
          this.saving.set(false);
          if (abonoCreado && abonoCreado._id) {
            if (this.archivosPendientes.length > 0) {
              this.archivosPendientes.forEach((file) => {
                this.subirImagenServidor(abonoCreado._id!, file);
              });
              this.archivosPendientes = [];
            }
            this.abonos.update((lista) => {
              lista.unshift(abonoCreado);
              return [...lista].sort((a, b) => this.parsearFechaLocal(b.fecha).getTime() - this.parsearFechaLocal(a.fecha).getTime());
            });
          }
          this.cerrarModal();
        },
        error: (err) => {
          console.error('Error creating abono:', err);
          this.saving.set(false);
        },
      });
    }
  }

  eliminarAbono(id: string) {
    if (!confirm('¿Está seguro de eliminar esta relación?')) return;
    const usuario = this.authService.user();
    const proceedDelete = (claveSupervisor?: string) => {
      const url = `${this.API}/${id}`;
      if (claveSupervisor) {
        this.http.request('delete', url, { body: { claveSupervisor } }).subscribe({
          next: () => this.loadAbonos(true),
          error: (err) => this.notificationModal.error('Error', err.error?.error || 'Error al eliminar'),
        });
      } else {
        this.http.delete(url).subscribe({
          next: () => this.loadAbonos(true),
          error: (err) => this.notificationModal.error('Error', err.error?.error || 'Error al eliminar'),
        });
      }
    };

    // If current user is root, only confirm (no supervisor clave)
    if (usuario?.rol === 'root') {
      if (!confirm('¿Está seguro de eliminar esta relación?')) return;
      proceedDelete();
      return;
    }

    // Ask for supervisor clave for non-root users
    const clave = window.prompt('Ingrese la clave de supervisor para confirmar la eliminación:');
    if (!clave) return;
    proceedDelete(clave.trim());
  }

  formatTotal(valor: number, prefijo: string): string {
    const monto = Number(valor) || 0;
    const numero = monto.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${prefijo} ${numero}`;
  }

  private parsearFechaLocal(fecha: string): Date {
    const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return new Date(fecha);
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(year, month, day);
  }

  formatFecha(fecha: string): string {
    const date = this.parsearFechaLocal(fecha);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const anio = date.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  formatCedula(cedula: string): string {
    if (!cedula) return '';
    const digits = cedula.replace(/\D/g, '');
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  formatMonto(monto: number): string {
    const num = Number(monto) || 0;
    const parts = num.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${parts[0]},${parts[1]}`;
  }

  formatTelefono(telefono: string): string {
    if (!telefono) return '';
    const digits = telefono.replace(/\D/g, '');
    if (digits.length === 11) {
      return digits.replace(/(\d{4})(\d{3})(\d{3})/, '$1-$2-$3');
    }
    if (digits.length === 10) {
      return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }
    return telefono;
  }

  getValuacionConTasaApi(): { valor: number; porcentaje: number } {
    if (!this.abonoValuacion) return { valor: 0, porcentaje: 0 };
    const diferencia = Number(this.abonoValuacion.diferencia) || 0;
    const divisaRegistrada = Number(this.abonoValuacion.divisa) || 0;
    const tasa = this.tasaActual();
    const valorCalculado = tasa > 0 ? diferencia / tasa : 0;
    const diferenciaMonto = valorCalculado - divisaRegistrada;
    const porcentaje = valorCalculado > 0 ? (diferenciaMonto / valorCalculado) * 100 : 0;
    return { valor: Number(diferenciaMonto.toFixed(2)), porcentaje: Number(porcentaje.toFixed(2)) };
  }

  getDecrecimiento(): { montoFacturaEnDivisa: number; decrecimientoMonto: number; decrecimientoPorcentaje: number } {
    const tasa = this.tasaActual();
    const diferencia = this.totales().diferencia;
    const divisa = this.totales().divisa;
    const diferenciaEnDivisa = tasa > 0 ? diferencia / tasa : 0;
    const decrecimientoMonto = divisa - diferenciaEnDivisa;
    const decrecimientoPorcentaje = diferenciaEnDivisa > 0 ? (decrecimientoMonto / diferenciaEnDivisa) * 100 : 0;
    return {
      montoFacturaEnDivisa: Number(diferenciaEnDivisa.toFixed(2)),
      decrecimientoMonto: Number(decrecimientoMonto.toFixed(2)),
      decrecimientoPorcentaje: Number(decrecimientoPorcentaje.toFixed(2)),
    };
  }

  private async cargarImagenLocal(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fetch(url)
        .then((response) => response.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject('Error leyendo imagen');
          reader.readAsDataURL(blob);
        })
        .catch(() => reject('No se pudo cargar la imagen: ' + url));
    });
  }

  private obtenerDimensionesImagen(base64: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.src = base64;
    });
  }

  async generarReportePdf() {
    const datos = this.abonosFiltrados();
    if (datos.length === 0) {
      alert('No hay datos para generar el reporte');
      return;
    }

    // Para la tabla en el PDF excluimos las opciones de Planta (se mostrarán en el header si están marcadas)
    const columnas = this.columnasDisponibles.filter((c) => this.columnasSeleccionadasPdf().has(c.key) && c.key !== 'comisionPlantaBs' && c.key !== 'comisionPlantaUsd');

    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let logoBase64 = '';
    try {
      logoBase64 = await this.cargarImagenLocal('/ESCOLARES AZUL RIF GRANDE.png');
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e);
    }

    const logoWidth = 70;
    let logoHeight = 0;
    if (logoBase64) {
      const dims = await this.obtenerDimensionesImagen(logoBase64);
      logoHeight = (logoWidth * dims.height) / dims.width;
    }

    const logoY = 15;
    const offsetY = logoY + logoHeight + 8;

    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 18, logoY, logoWidth, logoHeight);
    }

    const empresaSeleccionada = this.filtros().empresa;
    const titulo = 'RELACIÓN DE CUENTAS';

    doc.setFontSize(16);
    doc.setTextColor(0, 51, 111);
    doc.text(titulo, pageWidth / 2, offsetY, { align: 'center' });

    const plantaFiltro = this.filtros().planta;
    const infoY = offsetY + 10;
    const showEmpresa = this.mostrarEmpresaPdf() && empresaSeleccionada;
    const showPlanta = this.mostrarPlantaPdf() && plantaFiltro;
    const showFiltros = showEmpresa || showPlanta;
    let headerHeight: number;

    if (showFiltros) {
      const filtroY = offsetY + 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      if (showEmpresa) {
        doc.text(`Empresa: ${empresaSeleccionada}`, 18, filtroY, { align: 'left' });
      }
      if (showPlanta) {
        doc.text(`Planta: ${plantaFiltro}`, 18, filtroY + (showEmpresa ? 6 : 0), { align: 'left' });
      }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`, pageWidth - 18, filtroY, { align: 'right' });
      doc.text(`Total registros: ${datos.length}`, pageWidth - 18, filtroY + 6, { align: 'right' });
      headerHeight = filtroY + 14;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`, pageWidth - 18, infoY, { align: 'right' });
      doc.text(`Total registros: ${datos.length}`, pageWidth - 18, infoY + 6, { align: 'right' });
      headerHeight = infoY + 14;
    }

    // Mostrar Planta % en header solo si está marcada en las columnas PDF
    const pdfSelected = this.columnasSeleccionadasPdf();
    const showPlantaBs = pdfSelected.has('comisionPlantaBs');
    const showPlantaUsd = pdfSelected.has('comisionPlantaUsd');
    if (showPlantaBs || showPlantaUsd) {
      const plantaBs = this.comisiones().comisionNoAsignada ?? 0;
      const plantaUsd = this.tasaActual() > 0 ? plantaBs / this.tasaActual() : 0;
      doc.setFontSize(10);
      doc.setTextColor(0);
      if (showPlantaBs) doc.text(`Planta % (Bs.): ${this.formatMonto(plantaBs)}`, 18, headerHeight);
      if (showPlantaUsd) doc.text(`Planta % ($): ${this.formatMonto(plantaUsd)}`, pageWidth - 18, headerHeight, { align: 'right' });
      headerHeight += 8;
    }

    const head = columnas.map((c) => c.label);
    const body = datos.map((a: Abono) => {
      return columnas.map((c) => {
        if (c.key === 'fecha') return this.formatFecha(a.fecha);
        if (c.key === 'montoFactura' || c.key === 'iva' || c.key === 'diferencia' || c.key === 'tasa') return this.formatMonto((a as any)[c.key]);
        if (c.key === 'pagoParcial') {
          return this.formatMonto((a as any).abonos || 0);
        }
        
        if (c.key === 'divisa') return `$ ${this.formatMonto((a as any)[c.key])}`;
        if (c.key === 'divisaFactura') {
          const mf = (a as any).montoFactura;
          const t = (a as any).tasa;
          return t ? `$ ${this.formatMonto(mf / t)}` : '$ 0,00';
        }
        if (c.key === 'cedula') return this.formatCedula((a as any)[c.key]);
        if (c.key === 'telefono') return this.formatTelefono((a as any)[c.key]);
        if (c.key === 'nFact') {
          const val = (a as any)[c.key];
          return val ? String(+val) : '';
        }
        if (c.key === 'ivaPagado') return (a as any).ivaPagado ? 'Pagado' : 'Pendiente';
        return (a as any)[c.key] ?? '';
      });
    });

    const marginBottom = 18;
    const rowHeight = 7;

    const columnWidths: any = {};
    columnas.forEach((c, i) => {
      columnWidths[i] = { cellWidth: c.key === 'nombre' ? 32 : c.key === 'planta' ? 24 : 20 };
    });

    autoTable(doc, {
      startY: headerHeight,
      head: [head],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [29, 99, 193], textColor: 255, fontSize: 7, halign: 'center', overflow: 'linebreak', cellPadding: 1.5 },
      bodyStyles: { fontSize: 7, overflow: 'linebreak' },
      styles: { cellPadding: 1.5, fontSize: 7, overflow: 'linebreak' },
      margin: { left: 18, right: 18, bottom: marginBottom },
      tableWidth: 'auto',
      columnStyles: columnWidths,
    });

    const sanitize = (s: string) => s.replace(/[\\/:*?"<>|]/g, '-');
    const plantaFiltroVal = plantaFiltro;
    const fechaDesdeRaw = this.filtros().fechaDesde;
    const fechaHastaRaw = this.filtros().fechaHasta;
    const formatForName = (raw: any) => {
      if (!raw) return '';
      try {
        const d = new Date(raw);
        if (isNaN(d.getTime())) return String(raw);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
      } catch (e) {
        return String(raw);
      }
    };

    let fileName: string;
    if (plantaFiltroVal) {
      const desde = formatForName(fechaDesdeRaw) || 'Inicio';
      const hasta = formatForName(fechaHastaRaw) || 'Hasta';
      fileName = `Relacion Cuentas (${sanitize(String(plantaFiltroVal))}) (${sanitize(desde)}) (${sanitize(hasta)}).pdf`;
    } else {
      fileName = `Relacion Cuentas ${this.getFechaLocal()}.pdf`;
    }

    doc.save(fileName);
  }

  async generarPdfNombresComisiones() {
    const nombres = this.comisionesTabNombresAgrupados();
    const supervisor = this.comisionesTabSupervisorSeleccionado();

    if (!nombres || nombres.length === 0) {
      alert('No hay datos para generar el reporte');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    let logoBase64 = '';
    try {
      logoBase64 = await this.cargarImagenLocal('/ESCOLARES AZUL RIF GRANDE.png');
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e);
    }

    const logoWidth = 70;
    let logoHeight = 0;
    if (logoBase64) {
      const dims = await this.obtenerDimensionesImagen(logoBase64);
      logoHeight = (logoWidth * dims.height) / dims.width;
    }

    const logoY = 15;
    const nombresOffsetY = logoY + logoHeight + 8;

    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 18, logoY, logoWidth, logoHeight);
    }

    const apellido = supervisor?.supervisorId ? this.getSupervisorApellido(supervisor.supervisorId) : '';
    const titulo = `${supervisor?.supervisor || ''} ${apellido}`.trim().toUpperCase();

    doc.setFontSize(16);
    doc.setTextColor(0, 51, 111);
    doc.text(titulo, pageWidth / 2, nombresOffsetY, { align: 'center' });

    const infoY = nombresOffsetY + 10;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`, pageWidth / 2, infoY, { align: 'center' });

    const head = [['Nombre', 'Planta', 'Cantidad', 'Monto Factura Bs', 'IVA', 'Monto Factura Sin Iva', 'Planta % (Bs.)', 'Planta % ($)']];
    const body = nombres.map((n: any) => {
      const comBs = n.comision || 0;
      const comUsd = this.tasaActual() > 0 ? comBs / this.tasaActual() : 0;
      return [
        n.nombre || '',
        n.planta || '-',
        String(n.cantidad || 0),
        this.formatMonto(n.montoFactura || 0),
        this.formatMonto(n.iva || 0),
        this.formatMonto(n.montoFacturaSinIva || 0),
        this.formatMonto(comBs) + ' Bs',
        this.formatMonto(comUsd) + ' $',
      ];
    });

    if (this.incluirTotalesMontos() || this.incluirTotalesClientes() || this.incluirTotalesListas()) {
      const totalComision = nombres.reduce((sum: number, n: any) => sum + (n.comision || 0), 0);
      const totalComisionUsd = this.tasaActual() > 0 ? totalComision / this.tasaActual() : 0;
      const totalMontoFactura = nombres.reduce((sum: number, n: any) => sum + (n.montoFactura || 0), 0);
      const totalIva = nombres.reduce((sum: number, n: any) => sum + (n.iva || 0), 0);
      const totalMontoSinIva = nombres.reduce((sum: number, n: any) => sum + (n.montoFacturaSinIva || 0), 0);
      const totalListas = nombres.reduce((sum: number, n: any) => sum + (n.cantidad || 0), 0);
      body.push([
        this.incluirTotalesClientes() ? `Totales: ${String(nombres.length)}` : 'Totales:',
        '',
        this.incluirTotalesListas() ? String(totalListas) : '',
        this.incluirTotalesMontos() ? this.formatMonto(totalMontoFactura) : '',
        this.incluirTotalesMontos() ? this.formatMonto(totalIva) : '',
        this.incluirTotalesMontos() ? this.formatMonto(totalMontoSinIva) : '',
        this.incluirTotalesMontos() ? this.formatMonto(totalComision) + ' Bs' : '',
        this.incluirTotalesMontos() ? this.formatMonto(totalComisionUsd) + ' $' : '',
      ]);
    }

    const marginBottom = 18;
    const marginSide = 35;

    autoTable(doc, {
      startY: infoY + 14,
      head: head,
      body: body,
      theme: 'grid',
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.row.index === body.length - 1) {
          data.cell.styles.fontSize = 9;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [232, 232, 232];
          data.cell.styles.textColor = [0, 0, 0];
          data.cell.styles.halign = 'center';
        }
      },
      headStyles: { fillColor: [29, 99, 193], textColor: 255, fontSize: 9, halign: 'center', overflow: 'linebreak', cellPadding: 1.5 },
      bodyStyles: { fontSize: 7, overflow: 'linebreak', halign: 'center' },
      styles: { cellPadding: 1.5, fontSize: 7, overflow: 'linebreak', halign: 'center' },
      margin: { left: marginSide, right: marginSide, bottom: marginBottom },
      tableWidth: 'auto',
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 20 },
        3: { cellWidth: 28 },
        4: { cellWidth: 22 },
        5: { cellWidth: 32 },
        6: { cellWidth: 28 },
        7: { cellWidth: 28 },
      },
    });

const fileName = `comisiones_${(supervisor?.supervisor || 'comisiones').replace(/\s+/g, '_')}_${this.getFechaLocal()}.pdf`;

    doc.save(fileName);
  }

  abrirModalTotalesPdfNombres() {
    this.incluirTotalesMontos.set(false);
    this.incluirTotalesClientes.set(false);
    this.incluirTotalesListas.set(false);
    this.showModalTotalesPdfNombres.set(true);
  }

  cerrarModalTotalesPdfNombres() {
    this.showModalTotalesPdfNombres.set(false);
  }

  async generarExcelNombresComisiones() {
    const nombres = this.comisionesTabNombresAgrupados();
    const supervisor = this.comisionesTabSupervisorSeleccionado();

    if (!nombres || nombres.length === 0) {
      alert('No hay datos para generar el reporte');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheetName = supervisor?.supervisor ? `Nombres ${supervisor.supervisor}` : 'Nombres Comisiones';
    const worksheet = workbook.addWorksheet(sheetName);

    const columnasBase = [
      { width: 30, header: 'Nombre' },
      { width: 25, header: 'Planta' },
      { width: 15, header: 'Cantidad' },
      { width: 22, header: 'Monto Factura Bs' },
      { width: 18, header: 'IVA' },
      { width: 28, header: 'Monto Factura Sin Iva' },
      { width: 22, header: 'Planta % (Bs.)' },
      { width: 22, header: 'Planta % ($)' },
    ];
    if (this.incluirTotalesClientes()) {
      columnasBase.push({ width: 18, header: 'Total Clientes' });
    }
    if (this.incluirTotalesListas()) {
      columnasBase.push({ width: 18, header: 'Total Facturas' });
    }

    worksheet.columns = columnasBase.map(c => ({ width: c.width }));
    const headerRow = worksheet.addRow(columnasBase.map(c => c.header));
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D63C1' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    const totalListas = nombres.reduce((sum: number, nombre: any) => sum + (nombre.cantidad || 0), 0);
    nombres.forEach((n: any) => {
      const comBs = n.comision || 0;
      const comUsd = this.tasaActual() > 0 ? comBs / this.tasaActual() : 0;
      const row = [
        n.nombre || '',
        n.planta || '-',
        n.cantidad || 0,
        this.formatMonto(n.montoFactura || 0),
        this.formatMonto(n.iva || 0),
        this.formatMonto(n.montoFacturaSinIva || 0),
        this.formatMonto(comBs),
        this.formatMonto(comUsd),
      ];
      if (this.incluirTotalesClientes()) {
        row.push(String(nombres.length));
      }
      if (this.incluirTotalesListas()) {
        row.push(String(totalListas));
      }
      worksheet.addRow(row).eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    if (this.incluirTotalesMontos() || this.incluirTotalesClientes() || this.incluirTotalesListas()) {
      const totalComision = nombres.reduce((sum: number, n: any) => sum + (n.comision || 0), 0);
      const totalComisionUsd = this.tasaActual() > 0 ? totalComision / this.tasaActual() : 0;
      const totalRowData = [
        '',
        '',
        '',
        this.incluirTotalesMontos() ? this.formatMonto(nombres.reduce((sum: number, n: any) => sum + (n.montoFactura || 0), 0)) : '',
        this.incluirTotalesMontos() ? this.formatMonto(nombres.reduce((sum: number, n: any) => sum + (n.iva || 0), 0)) : '',
        this.incluirTotalesMontos() ? this.formatMonto(nombres.reduce((sum: number, n: any) => sum + (n.montoFacturaSinIva || 0), 0)) : '',
        this.incluirTotalesMontos() ? this.formatMonto(totalComision) : '',
        this.incluirTotalesMontos() ? this.formatMonto(totalComisionUsd) : '',
      ];
      if (this.incluirTotalesClientes()) {
        totalRowData.push(String(nombres.length));
      }
      if (this.incluirTotalesListas()) {
        totalRowData.push(String(totalListas));
      }
      const totalRow = worksheet.addRow(totalRowData);
      totalRow.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { bold: true };
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `nombres_${(supervisor?.supervisor || 'comisiones').replace(/\s+/g, '_')}_${this.getFechaLocal()}.xlsx`;

    saveAs(new Blob([buffer]), fileName);
  }

  async generarReporteExcel() {
    const datos = this.abonosFiltrados();
    if (datos.length === 0) {
      alert('No hay datos para generar el reporte');
      return;
    }

    const workbook = new ExcelJS.Workbook();

    const empresaSeleccionada = this.filtros().empresa;
    const sheetName = empresaSeleccionada ? `Abonos ${empresaSeleccionada}` : 'Abonos';
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = [
      { width: 15 },
      { width: 30 },
      { width: 25 },
      { width: 18 },
      { width: 18 },
      { width: 15 },
      { width: 20 },
      { width: 18 },
      { width: 15 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 15 },
      { width: 18 },
    ];

    const headerRow = worksheet.addRow(['Fecha', 'Nombre', 'Empresa', 'Planta', 'Teléfono', 'Cédula', 'N. Fact', 'Monto Facts. Bs', 'Iva', 'Monto Total Sin Iva', 'Diferencia $', 'Pago Parcial', 'Tasa', 'Status']);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D63C1' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    datos.forEach((a: Abono) => {
      const row = worksheet.addRow([
        this.formatFecha(a.fecha),
        a.nombre,
        a.empresa,
        a.planta,
        this.formatTelefono(a.telefono),
        this.formatCedula(a.cedula),
        a.nFact ? String(+a.nFact) : '',
        this.formatMonto(a.montoFactura ?? 0),
        this.formatMonto(a.iva ?? 0),
        this.formatMonto(a.diferencia ?? 0),
        this.formatMonto(a.divisa ?? 0),
        this.formatMonto(a.abonos ?? 0),
        a.tasa?.toFixed(2) ?? '0.00',
        a.status,
      ]);
      row.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = empresaSeleccionada
      ? `abonos_${empresaSeleccionada.replace(/\s+/g, '_')}_${this.getFechaLocal()}.xlsx`
      : `abonos_${this.getFechaLocal()}.xlsx`;

    saveAs(new Blob([buffer]), fileName);
  }

  abrirValuacion(abono: Abono) {
    this.abonoValuacion = { ...abono };
    this.showModalValuacion.set(true);
    this.tasaManual.set(abono.tasa ?? 0);
    this.loadingTasas.set(true);
    this.tasasGuardadasService.getAll().subscribe({
      next: (data) => {
        this.tasasGuardadas.set(data || []);
        this.loadingTasas.set(false);
      },
      error: (err) => {
        console.error('Error cargando tasas guardadas:', err);
        this.loadingTasas.set(false);
      },
    });
  }

  cerrarValuacion() {
    this.showModalValuacion.set(false);
    this.abonoValuacion = null;
    this.tasasGuardadas.set([]);
    this.tasaManual.set(0);
  }

  getTasasOrdenadas = computed(() => {
    const todas: { fecha: string; valor: number; parentId: string; index: number }[] = [];
    this.tasasGuardadas().forEach(tg => {
      if (tg.tasas && Array.isArray(tg.tasas)) {
        tg.tasas.forEach((t, index) => {
          if (t.fecha && typeof t.valor === 'number') {
            todas.push({
              fecha: t.fecha,
              valor: t.valor,
              parentId: tg._id || '',
              index,
            });
          }
        });
      }
    });
    return todas.sort((a, b) => this.parsearFechaLocal(a.fecha).getTime() - this.parsearFechaLocal(b.fecha).getTime());
  });

  getDiferencialTasas = computed(() => {
    const lista = this.getTasasOrdenadas();
    if (lista.length < 2 || !this.abonoValuacion) return null;
    const tasaActual = lista[lista.length - 1].valor;
    const tasaAnterior = lista[lista.length - 2].valor;
    if (tasaAnterior === 0) return null;
    const valor = tasaActual - tasaAnterior;
    const porcentaje = (valor / tasaAnterior) * 100;
    return { valor, porcentaje };
  });

  getDiferencialConTasaRegistrada = computed(() => {
    const tasaRegistrada = this.abonoValuacion?.tasa ?? 0;
    const lista = this.getTasasOrdenadas();
    const ultimaTasa = lista.length > 0 ? lista[lista.length - 1].valor : 0;
    const base = ultimaTasa || tasaRegistrada;
    if (base === 0) return { valor: 0, porcentaje: 0 };
    const valor = tasaRegistrada - ultimaTasa;
    const porcentaje = (ultimaTasa > 0 ? (valor / ultimaTasa) * 100 : 0);
    return { valor, porcentaje };
  });

  guardarNuevaTasa() {
    const fecha = this.nuevaTasaFecha();
    const valor = this.nuevaTasaValor();
    if (!fecha || !valor || valor <= 0) {
      alert('Ingrese una fecha y un valor válido para la tasa');
      return;
    }
    const nombre = `Tasa ${fecha}`;
    const existing = this.tasasGuardadas().find(tg => tg.nombre === nombre && tg.tipo === 'actual');
    if (existing && existing.tasas) {
      existing.tasas.push({ fecha, valor });
      this.http.put(`/api/tasas-guardadas/${existing._id}`, existing).subscribe({
        next: () => {
          this.cdr.detectChanges();
          this.abrirValuacion(this.abonoValuacion!);
          this.nuevaTasaFecha.set(this.getFechaLocal());
          this.nuevaTasaValor.set(0);
        },
        error: (err) => {
          console.error('Error actualizando tasa:', err);
          alert('Error al actualizar la tasa');
        },
      });
    } else {
      this.tasasGuardadasService.save(nombre, new Map([[fecha, valor]]), 'actual').subscribe({
        next: () => {
          this.cdr.detectChanges();
          this.abrirValuacion(this.abonoValuacion!);
          this.nuevaTasaFecha.set(this.getFechaLocal());
          this.nuevaTasaValor.set(0);
        },
        error: (err) => {
          console.error('Error guardando tasa:', err);
          alert('Error al guardar la tasa');
        },
      });
    }
  }

  refrescarTasas() {
    this.tasasGuardadasService.getAll().subscribe({
      next: (data) => {
        this.tasasGuardadas.set(data || []);
      },
      error: (err) => console.error('Error refrescando tasas:', err),
    });
  }

  editarTasa(tasa: { parentId: string; index: number; valor: number }) {
    const nuevoValorStr = prompt('Editar valor de tasa:', tasa.valor.toString());
    if (nuevoValorStr === null) return;
    const nuevoValor = parseFloat(nuevoValorStr);
    if (isNaN(nuevoValor) || nuevoValor <= 0) {
      alert('Valor inválido');
      return;
    }
    const parent = this.tasasGuardadas().find(tg => tg._id === tasa.parentId);
    if (!parent || !parent.tasas) return;
    const nuevasTasas = [...parent.tasas];
    nuevasTasas[tasa.index] = { ...nuevasTasas[tasa.index], valor: nuevoValor };
    this.http.put(`/api/tasas-guardadas/${parent._id}`, { nombre: parent.nombre, tasas: nuevasTasas, tipo: parent.tipo }).subscribe({
      next: () => this.refrescarTasas(),
      error: (err) => {
        console.error('Error actualizando tasa:', err);
        alert('Error al actualizar la tasa');
      },
    });
  }

  eliminarTasa(tasa: { parentId: string; index: number }) {
    if (!confirm('¿Eliminar esta tasa del historial?')) return;
    const parent = this.tasasGuardadas().find(tg => tg._id === tasa.parentId);
    if (!parent || !parent.tasas) return;
    const nuevasTasas = [...parent.tasas];
    nuevasTasas.splice(tasa.index, 1);
    if (nuevasTasas.length === 0) {
      this.http.delete(`/api/tasas-guardadas/${parent._id}`).subscribe({
        next: () => this.refrescarTasas(),
        error: (err) => {
          console.error('Error eliminando tasa:', err);
          alert('Error al eliminar la tasa');
        },
      });
    } else {
      this.http.put(`/api/tasas-guardadas/${parent._id}`, { nombre: parent.nombre, tasas: nuevasTasas, tipo: parent.tipo }).subscribe({
        next: () => this.refrescarTasas(),
        error: (err) => {
          console.error('Error eliminando tasa:', err);
          alert('Error al eliminar la tasa');
        },
      });
    }
  }

  getValuacionConTasa(tasa: number): number {
    if (!this.abonoValuacion || tasa <= 0) return 0;
    const diferencia = this.abonoValuacion.diferencia ?? 0;
    return Number((diferencia / tasa).toFixed(2));
  }

  parseTasaManual(valor: string | undefined | null): number {
    const num = Number(valor);
    return Number.isFinite(num) ? num : 0;
  }

  cargarSupervisores() {
    this.http.get<Supervisor[]>(this.API_SUPERVISORES).subscribe({
      next: (data) => this.supervisores.set(data || []),
      error: (err) => console.error('Error cargando supervisores:', err),
    });
  }

  abrirModalSupervisores() {
    this.editingSupervisor.set({ nombre: '', apellido: '', cedula: '', telefono: '', planta: '' });
    this.cargarSupervisores();
    this.showModalSupervisores.set(true);
  }

  cerrarModalSupervisores() {
    this.showModalSupervisores.set(false);
    this.editingSupervisor.set(null);
  }

  abrirModalSupervisoresRelaciones() {
    const abonos = this.abonosFiltrados().filter(a => a.supervisor && a.supervisorId);
    const porSupervisor = new Map<string, any[]>();
    for (const abono of abonos) {
      const supervisorId = abono.supervisorId || '';
      if (!porSupervisor.has(supervisorId)) {
        porSupervisor.set(supervisorId, []);
      }
      porSupervisor.get(supervisorId)!.push(abono);
    }
    const agrupados = Array.from(porSupervisor.entries()).map(([supervisorId, relaciones]) => {
      const primer = relaciones[0];
      return {
        supervisorId,
        supervisor: primer.supervisor || '',
        cantidad: relaciones.length,
        relaciones,
      };
    });
    this.supervisoresAgrupados.set(agrupados);
    this.showModalSupervisoresRelaciones.set(true);
  }

  cerrarModalSupervisoresRelaciones() {
    this.showModalSupervisoresRelaciones.set(false);
    this.supervisoresAgrupados.set([]);
  }

  guardarSupervisor() {
    const supervisor = this.editingSupervisor();
    if (!supervisor || !supervisor.nombre.trim()) {
      alert('El nombre del supervisor es requerido');
      return;
    }
    this.savingSupervisor.set(true);
    if (supervisor._id) {
      this.http.put<Supervisor>(`${this.API_SUPERVISORES}/${supervisor._id}`, supervisor).subscribe({
        next: () => {
          this.savingSupervisor.set(false);
          this.cargarSupervisores();
          this.cerrarModalSupervisores();
          this.notificationModal.success('Supervisor actualizado correctamente');
        },
        error: (err) => {
          console.error('Error actualizando supervisor:', err);
          this.savingSupervisor.set(false);
          this.notificationModal.error(err.error?.error || 'Error al actualizar supervisor');
        },
      });
    } else {
      this.http.post<Supervisor>(this.API_SUPERVISORES, supervisor).subscribe({
        next: () => {
          this.savingSupervisor.set(false);
          this.cargarSupervisores();
          this.cerrarModalSupervisores();
          this.notificationModal.success('Supervisor creado correctamente');
        },
        error: (err) => {
          console.error('Error creando supervisor:', err);
          this.savingSupervisor.set(false);
          this.notificationModal.error(err.error?.error || 'Error al crear supervisor');
        },
      });
    }
  }

  editarSupervisor(supervisor: Supervisor) {
    this.editingSupervisor.set({ ...supervisor });
    this.showModalSupervisores.set(true);
  }

  eliminarSupervisor(id?: string) {
    if (!id) return;
    if (!confirm('¿Está seguro de eliminar este supervisor?')) return;
    this.http.delete(`${this.API_SUPERVISORES}/${id}`).subscribe({
      next: () => this.cargarSupervisores(),
      error: (err) => console.error('Error eliminando supervisor:', err),
    });
  }
}



