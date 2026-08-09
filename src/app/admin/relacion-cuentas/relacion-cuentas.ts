import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { EnterFocusNextDirective } from '../../shared/ui/enter-focus-next.directive';
import { EmpresasService, Empresa } from '../../shared/data-access/empresas.service';
import { TasasGuardadasService, TasaGuardada } from '../../shared/data-access/tasas-guardadas.service';
import { TasaResponse } from '../../shared/data-access/currency.service';
import { AuthService } from '../../shared/data-access/auth.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ChangeDetectorRef } from '@angular/core';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './relacion-cuentas.html',
  styleUrl: './relacion-cuentas.css',
})
export class RelacionCuentas implements OnInit {
  private http = inject(HttpClient);
  private empresasService = inject(EmpresasService);
  private tasasGuardadasService = inject(TasasGuardadasService);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

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
        passes = passes && (a.fecha || '').slice(0, 10) >= f.fechaDesde;
      }
      if (f.fechaHasta) {
        passes = passes && (a.fecha || '').slice(0, 10) <= f.fechaHasta;
      }
      if (f.status) {
        passes = passes && a.status === f.status;
      }
      if (f.nombre) {
        const nombreLower = f.nombre.toLowerCase();
        passes = passes && (a.nombre || '').toLowerCase().includes(nombreLower);
      }
      if (f.supervisor) {
        passes = passes && (a.supervisor || '') === f.supervisor;
      }
      return passes;
    });
  });

  totales = computed(() => {
    const datos = this.abonosFiltrados();
    const montoFactura = datos.reduce((sum, a) => sum + (a.montoFactura ?? 0), 0);
    const abonos = datos.reduce((sum, a) => sum + (a.abonos ?? 0), 0);
    const iva = datos.reduce((sum, a) => sum + (a.iva ?? 0), 0);
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
    const decrecimientoMonto = diferenciaEnDivisa - divisa;
    const decrecimientoPorcentaje = diferenciaEnDivisa > 0 ? (decrecimientoMonto / diferenciaEnDivisa) * 100 : 0;
    const ivaDolares = datos.reduce((sum, a) => {
      const tasa = Number(a.tasa) || 0;
      return sum + (tasa > 0 ? (a.iva ?? 0) / tasa : 0);
    }, 0);
    return {
      montoFactura,
      abonos,
      iva,
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
    };
  });
  loading = signal(false);
  saving = signal(false);
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
  ];
  columnasSeleccionadas = signal<Set<string>>(new Set(this.columnasDisponibles.map((c) => c.key)));
  columnasSeleccionadasPdf = signal<Set<string>>(new Set(this.columnasDisponibles.map((c) => c.key)));

  showModalColumnas = signal(false);
  showModalColumnasPdf = signal(false);

  columnasVisibles = computed(() => {
    if (this.esRoot()) {
      return this.columnasDisponibles;
    }
    return this.columnasDisponibles.filter((c) => this.columnasSeleccionadas().has(c.key));
  });

  showModalValuacion = signal(false);
  abonoValuacion: Abono | null = null;

  showModalAbonos = signal(false);
  abonoAbonos: Abono | null = null;
  nuevoAbonoPago = signal<AbonoPago>({ fecha: this.getFechaLocal(), monto: 0 });
  imagenesPreview = signal<string[]>([]);
  archivosPendientes: File[] = [];
  imagenModalAbierta = signal(false);
  imagenModalUrl = signal<string>('');
  tasasGuardadas = signal<TasaGuardada[]>([]);
  tasaManual = signal(0);
  loadingTasas = signal(false);
  nuevaTasaFecha = signal(this.getFechaLocal());
  nuevaTasaValor = signal(0);

  showModalRecordatorio = signal(false);
  recordatorioDestinatarios = signal<{ nombre: string; telefono: string }[]>([]);

  showModalTestWhatsapp = signal(false);
  testWhatsappTelefono = signal('');
  testWhatsappMensaje = signal('Hola, te escribimos por tu relación de cuentas. Por favor, comunícate con nosotros.');

  comisiones = signal<{ comisionesPorSupervisor: any[]; comisionNoAsignada: number; comisionNoAsignadaPorcentaje: number; total: number; montoFacturaNoAsignada: number }>({ comisionesPorSupervisor: [], comisionNoAsignada: 0, comisionNoAsignadaPorcentaje: 0, total: 0, montoFacturaNoAsignada: 0 });
  comisionNoAsignadaManual = signal<number | null>(null);
  loadingComisiones = signal(false);

  showModalSupervisores = signal(false);
  editingSupervisor = signal<Supervisor | null>(null);
  pestanaActiva = signal<'relaciones' | 'supervisores'>('relaciones');

  tasaActual = signal<number>(0);
  loadingTasaActual = signal(false);

  filtros = signal({
    nombre: '',
    empresa: '',
    planta: '',
    fechaDesde: '',
    fechaHasta: '',
    status: '',
    supervisor: '',
  });

  private getFechaLocal(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  mostrarEmpresaPdf = signal(false);
  mostrarPlantaPdf = signal(false);

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
    return Array.from({ length: this.totalPaginas() }, (_, i) => i + 1);
  });

  ngOnInit() {
    this.empresasService.load();
    this.empresasService.empresas$.subscribe({
      next: (data) => this.empresas.set(data),
    });
    this.loadAbonos(true);
    this.loadTasaActual();
    this.loadColumnasVisibles();
    this.loadComisiones();
    this.cargarSupervisores();
    this.loadUserPermissions();
  }

  loadComisiones() {
    this.loadingComisiones.set(true);
    const manualStr = localStorage.getItem('comisionNoAsignadaManualPorcentaje');
    if (manualStr !== null) {
      this.comisionNoAsignadaManual.set(Number(manualStr));
    }
    const porcentaje = this.comisionNoAsignadaManual() ?? 0;
    this.http.get<{ comisionesPorSupervisor: any[]; comisionNoAsignada: number; comisionNoAsignadaPorcentaje: number; montoFacturaNoAsignada: number }>(`/api/abonos-polar/comisiones?porcentaje=${porcentaje}`).subscribe({
      next: (data) => {
        const comisionesPorSupervisor = data.comisionesPorSupervisor || [];
        const comisionNoAsignada = data.comisionNoAsignada || 0;
        const comisionNoAsignadaPorcentaje = data.comisionNoAsignadaPorcentaje ?? porcentaje;
        const montoFacturaNoAsignada = data.montoFacturaNoAsignada || 0;
        const total = comisionesPorSupervisor.reduce((sum, c) => sum + (c.monto || 0), 0) + comisionNoAsignada;
        this.comisiones.set({
          comisionesPorSupervisor,
          comisionNoAsignada,
          comisionNoAsignadaPorcentaje,
          total,
          montoFacturaNoAsignada,
        });
        this.loadingComisiones.set(false);
      },
      error: () => {
        this.loadingComisiones.set(false);
      },
    });
  }

  onComisionNoAsignadaChange(valor: string) {
    const num = Number(valor) || 0;
    this.comisionNoAsignadaManual.set(num);
    localStorage.setItem('comisionNoAsignadaManualPorcentaje', String(num));
    const comisiones = this.comisiones();
    const montoBase = comisiones.montoFacturaNoAsignada || 0;
    const comisionNoAsignada = montoBase * (num / 100);
    this.comisiones.set({
      ...comisiones,
      comisionNoAsignadaPorcentaje: num,
      comisionNoAsignada: comisionNoAsignada,
      total: comisiones.comisionesPorSupervisor.reduce((sum, c) => sum + (c.monto || 0), 0) + comisionNoAsignada,
    });
  }

  loadColumnasVisibles() {
    this.http.get<{ columns: string[] }>('/api/settings/relacion-cuentas-columnas').subscribe({
      next: (res) => {
        if (res.columns && Array.isArray(res.columns) && res.columns.length > 0) {
          this.columnasSeleccionadas.set(new Set(res.columns));
        }
      },
      error: () => {},
    });
  }

  loadTasaActual() {
    this.loadingTasaActual.set(true);
    this.http.get<TasaResponse>('/api/tasas').subscribe({
      next: (data) => {
        const usd = data?.current?.usd;
        this.tasaActual.set(typeof usd === 'number' ? usd : 0);
        this.loadingTasaActual.set(false);
      },
      error: () => {
        this.tasaActual.set(0);
        this.loadingTasaActual.set(false);
      },
    });
  }

  loadAbonos(force = false) {
    this.loading.set(true);
    const url = force ? `${this.API}?t=${new Date().getTime()}` : this.API;
    this.http.get<Abono[]>(url).subscribe({
      next: (data) => {
        this.abonos.set([...data].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
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
    this.paginaActual.set(pagina);
  }

  abrirModalColumnas() {
    this.showModalColumnas.set(true);
  }

  cerrarModalColumnas() {
    if (this.esRoot()) {
      this.http.put('/api/settings/relacion-cuentas-columnas', { columns: [...this.columnasSeleccionadas()] }).subscribe({
        next: () => {},
        error: () => {},
      });
    }
    this.showModalColumnas.set(false);
  }

  abrirModalColumnasPdf() {
    this.showModalColumnasPdf.set(true);
  }

  cerrarModalColumnasPdf() {
    this.showModalColumnasPdf.set(false);
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

  abrirModalRecordatorio() {
    const destinatarios = this.abonosFiltrados()
      .filter((a) => a.telefono && a.nombre)
      .map((a) => ({ nombre: a.nombre, telefono: a.telefono }));
    this.recordatorioDestinatarios.set(destinatarios);
    this.showModalRecordatorio.set(true);
  }

  cerrarModalRecordatorio() {
    this.showModalRecordatorio.set(false);
  }

  enviarRecordatorios() {
    const destinatarios = this.recordatorioDestinatarios();
    if (destinatarios.length === 0) {
      alert('No hay destinatarios para enviar recordatorios');
      return;
    }

    this.http.post('/api/recordatorios/recordatorio-masivo', { destinatarios }).subscribe({
      next: () => {
        alert('Recordatorios enviados correctamente');
        this.cerrarModalRecordatorio();
      },
      error: (err) => {
        console.error('Error enviando recordatorios:', err);
        alert('Error al enviar recordatorios');
      },
    });
  }

  abrirModalTestWhatsapp() {
    this.showModalTestWhatsapp.set(true);
  }

  cerrarModalTestWhatsapp() {
    this.showModalTestWhatsapp.set(false);
  }

  enviarTestWhatsapp() {
    const telefono = this.testWhatsappTelefono().trim();
    const mensaje = this.testWhatsappMensaje().trim();
    if (!telefono) {
      alert('Ingrese un número de teléfono');
      return;
    }

    this.http.post('/api/recordatorios/test-whatsapp', { telefono, mensaje }).subscribe({
      next: () => {
        alert('Mensaje de prueba enviado correctamente');
        this.cerrarModalTestWhatsapp();
      },
      error: (err) => {
        console.error('Error enviando test WhatsApp:', err);
        alert('Error al enviar mensaje de prueba');
      },
    });
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

  toggleColumna(key: string) {
    this.columnasSeleccionadas.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(key)) {
        nuevo.delete(key);
      } else {
        nuevo.add(key);
      }
      return nuevo;
    });
  }

  isColumnaSeleccionada(key: string): boolean {
    return this.columnasSeleccionadas().has(key);
  }

  filtrarAbonos() {
    // No-op: filtering handled by computed signal
  }

  abrirModal(abono?: Abono) {
    if (abono) {
      this.http.get<Abono[]>(`${this.API}?t=${new Date().getTime()}`).subscribe({
        next: (data) => {
          const abonoActualizado = data.find((a) => a._id === abono._id) || abono;
          this.abonos.set([...data].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
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
      this.imagenModalUrl.set(fullUrl);
      this.imagenModalAbierta.set(true);
    }
  }

  cerrarImagenModal() {
    this.imagenModalAbierta.set(false);
    this.imagenModalUrl.set('');
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

    this.http.post<{ imagenes: string[] }>(`${this.API}/${idAbono}/imagenes`, formData).subscribe({
      next: (res) => {
        if (this.editingAbono) {
          this.editingAbono.imagenes = res.imagenes || [];
        }
      },
      error: (err) => console.error('Error al subir imagen:', err),
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
              return [...lista].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            });
          } else {
            this.loadAbonos(true);
          }
          this.cerrarModal();
          this.loadComisiones();
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
              return [...lista].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            });
          }
          this.cerrarModal();
          this.loadComisiones();
        },
        error: (err) => {
          console.error('Error creating abono:', err);
          this.saving.set(false);
        },
      });
    }
  }

  eliminarAbono(id: string) {
    if (!confirm('¿Está seguro de eliminar este abono?')) return;
    this.http.delete(`${this.API}/${id}`).subscribe({
      next: () => {
        this.loadAbonos(true);
        this.loadComisiones();
      },
      error: (err) => console.error('Error deleting abono:', err),
    });
  }

  formatTotal(valor: number, prefijo: string): string {
    const monto = Number(valor) || 0;
    const numero = monto.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${prefijo} ${numero}`;
  }

  formatFecha(fecha: string): string {
    const date = new Date(fecha);
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

    const columnas = this.columnasDisponibles.filter((c) => this.columnasSeleccionadasPdf().has(c.key));

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

    const fileName = empresaSeleccionada
      ? `abonos_${empresaSeleccionada.replace(/\s+/g, '_')}_${this.getFechaLocal()}.pdf`
      : `abonos_${this.getFechaLocal()}.pdf`;

    doc.save(fileName);
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
    return todas.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
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

  guardarSupervisor() {
    const supervisor = this.editingSupervisor();
    if (!supervisor || !supervisor.nombre.trim()) {
      alert('El nombre del supervisor es requerido');
      return;
    }

    if (supervisor._id) {
      this.http.put<Supervisor>(`${this.API_SUPERVISORES}/${supervisor._id}`, supervisor).subscribe({
        next: () => {
          this.cargarSupervisores();
          this.editingSupervisor.set(null);
        },
        error: (err) => console.error('Error actualizando supervisor:', err),
      });
    } else {
      this.http.post<Supervisor>(this.API_SUPERVISORES, supervisor).subscribe({
        next: () => {
          this.cargarSupervisores();
          this.editingSupervisor.set(null);
        },
        error: (err) => console.error('Error creando supervisor:', err),
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
