import { Component, inject, OnInit, signal, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { jsPDF } from 'jspdf';

declare const Math: any;

export interface CuentaBancaria {
  banco: string;
  bancosAfiliados?: string[];
  numero: string;
  tipo: string;
  titular?: string;
  pagoMovil?: boolean;
  cedulaRif?: string;
  cedulaRifTipo?: string;
  tipoPersona?: string;
  alias?: string;
  comentario?: string;
  esZelle?: boolean;
}

export interface FacturaProveedor {
  numero: string;
  fecha: Date;
  tipo: 'factura' | 'nota' | 'debito' | 'credito';
  monto: number;
  montoIva: number;
  baseImponible: number;
  baseExenta: number;
  porcentajeIva: number;
  iva: number;
  iva75: number;
  iva25: number;
  abonos: number;
  abonosIva: number;
  abonosIva25: number;
  abonosArray?: { monto: number; fecha: Date }[];
  abonosIvaArray?: { monto: number; fecha: Date }[];
  abonosIva25Array?: { monto: number; fecha: Date }[];
  totalPagar: number;
  deudaActual: number;
  deudaIva: number;
  deudaIva25: number;
  imagenes?: string[];
  facturaVinculadaIndex?: number;
}

export interface Proveedor {
  _id?: string;
  nombre: string;
  alias?: string;
  rif: string;
  direccion: string;
  correo?: string;
  telefono?: string;
  vendedor?: string;
  tasaPreferida?: 'dolar' | 'euro' | 'binance';
  cuentasBancarias: CuentaBancaria[];
  facturas: FacturaProveedor[];
  creadoPor?: string;
  fechaCreacion?: Date;
  modificadoPor?: string;
  fechaModificacion?: Date;
  modificaciones?: { campo: string; valorAnterior: string; valorNuevo: string; fecha: Date; usuario: string }[];
}

@Component({
  selector: 'app-cuentas-por-pagar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cuentas-por-pagar.html',
  styleUrl: './cuentas-por-pagar.css',
})
export class CuentasPorPagar implements OnInit {
  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.showFotoViewer) {
      if (this.fotoViewerMaximizada) {
        this.fotoViewerMaximizada = false;
      } else {
        this.cerrarFotoViewer();
      }
    }
  }
  
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  
  private API = '/api/proveedores';

  proveedores = signal<Proveedor[]>([]);
  proveedorExpandido = signal<string | null>(null);
  proveedorEditando = signal<string | null>(null);
  cuentaExpandida = signal<{proveedorId: string, index: number} | null>(null);
  usuarioActual = 'Admin';
  Math = Math;

  paginaActual = 1;
  proveedoresPorPagina = 10;
  filtroProveedor = '';

  get proveedoresFiltrados() {
    if (!this.filtroProveedor.trim()) {
      return this.proveedores();
    }
    const filtro = this.filtroProveedor.toLowerCase();
    return this.proveedores().filter(p => 
      (p.nombre?.toLowerCase().includes(filtro)) || 
      (p.alias?.toLowerCase().includes(filtro))
    );
  }

  get proveedoresPaginados() {
    const inicio = (this.paginaActual - 1) * this.proveedoresPorPagina;
    const fin = inicio + this.proveedoresPorPagina;
    return this.proveedoresFiltrados.slice(inicio, fin);
  }

  get totalPaginasProveedores() {
    return Math.ceil(this.proveedoresFiltrados.length / this.proveedoresPorPagina);
  }

  cambiarPaginaProveedores(pagina: number) {
    if (pagina >= 1 && pagina <= this.totalPaginasProveedores) {
      this.paginaActual = pagina;
    }
  }

  onFiltroProveedorChange() {
    this.paginaActual = 1;
  }

  showModalProveedor = false;
  showModalFactura = false;
  showModalAbono = false;
  showModalDetalleFactura = false;
  showModalIva = false;
  showModalIva25 = false;
  showModalAbonoExito = false;
  showModalFotoExito = false;
  showModalFotoAccion = false;
  fotoAccionMensaje = '';
  showModalFacturaVinculada = false;
  facturaAbonoExito: { numero: string; monto: number; deuda: number; proveedorId?: string; facturaIndex?: number } | null = null;
  editingProveedor: Proveedor | null = null;
  editingFactura: { proveedorId: string; index: number; factura: FacturaProveedor } | null = null;
  proveedorIdActual: string | null = null;
  
  facturaConAbono: { proveedorId: string; index: number; factura: FacturaProveedor } | null = null;
  facturaDetalle: { proveedor: Proveedor; factura: FacturaProveedor; index: number } | null = null;
  facturaIva: { proveedor: Proveedor; factura: FacturaProveedor; index: number } | null = null;
  facturaIva25: { proveedor: Proveedor; factura: FacturaProveedor; index: number } | null = null;

  rifTipos = ['J', 'E', 'P', 'R', 'G', 'V'];

  newProveedor = {
    nombre: '',
    alias: '',
    rif: '',
    rifTipo: 'J',
    direccion: '',
    correo: '',
    telefono: '',
    vendedor: '',
    tasaPreferida: 'dolar' as 'dolar' | 'euro' | 'binance',
    cuentasBancarias: [] as CuentaBancaria[],
  };

  newFactura = {
    numero: '',
    fecha: '',
    tipo: 'factura' as 'factura' | 'nota' | 'debito' | 'credito',
    monto: 0,
    montoIva: 0,
    baseImponible: 0,
    baseExenta: 0,
    porcentajeIva: 16,
    imagenes: [] as string[],
    facturaVinculadaIndex: -1,
    conIva: false,
  };

  showCameraModal = false;
  cameraStream: MediaStream | null = null;
  videoElement: HTMLVideoElement | null = null;
  fotoIndexEliminar: number = -1;
  cameraCallback: ((base64: string) => void) | null = null;
  modoQR = false;
  qrScanInterval: any = null;

  showFotoViewer = false;
  fotoViewerIndex = 0;
  fotoViewerImagenes: string[] = [];
  fotoViewerZoom = 1;
  fotoViewerModoRecorte = false;
  fotoViewerCropStart: { x: number; y: number } | null = null;
  fotoViewerCropEnd: { x: number; y: number } | null = null;
  fotoViewerMaximizada = false;
  fotoViewerPosition = { x: 0, y: 0 };
  fotoViewerIsDragging = false;
  fotoViewerDragStart = { x: 0, y: 0 };

  showQRModal = false;
  qrCodeData: string = '';
  qrExpiracion: string = '';
  qrProveedorId: string = '';
  qrFacturaIndex: number = -1;
  qrInterval: any = null;
  qrFotoRecibida = false;
  qrImagenesIniciales: string[] = [];

  newAbono = {
    monto: 0,
    fecha: new Date().toISOString().split('T')[0],
  };

  newCuentaBancaria = {
    banco: '',
    bancosAfiliados: [] as string[],
    numero: '',
    tipo: 'corriente',
    titular: '',
    pagoMovil: false,
    cedulaRif: '',
    cedulaRifTipo: 'V',
    tipoPersona: 'personal',
    alias: '',
    comentario: '',
    esZelle: false,
  };

  ngOnInit() {
    this.loadProveedores();
  }

  loadProveedores() {
    this.http.get<Proveedor[]>(this.API).subscribe({
      next: (data) => this.proveedores.set(data),
      error: (err) => console.error('Error cargando proveedores:', err),
    });
  }

  toggleExpand(proveedorId: string) {
    if (this.proveedorExpandido() === proveedorId) {
      this.proveedorExpandido.set(null);
    } else {
      this.proveedorExpandido.set(proveedorId);
    }
  }

  toggleCuentaExpandida(proveedorId: string, index: number) {
    const key = { proveedorId, index };
    if (this.cuentaExpandida()?.proveedorId === proveedorId && this.cuentaExpandida()?.index === index) {
      this.cuentaExpandida.set(null);
    } else {
      this.cuentaExpandida.set(key);
    }
  }

  abrirModalProveedor(proveedor?: Proveedor) {
    if (proveedor) {
      this.editingProveedor = proveedor;
      const rifCompleto = proveedor.rif || '';
      const rifParts = rifCompleto.split('-');
      const cuentasConTipo = (proveedor.cuentasBancarias || []).map(cuenta => {
        const cedulaCompleta = cuenta.cedulaRif || '';
        const cedulaParts = cedulaCompleta.split('-');
        return {
          ...cuenta,
          cedulaRifTipo: cedulaParts.length > 1 ? cedulaParts[0] : 'V',
          cedulaRif: cedulaParts.length > 1 ? cedulaParts.slice(1).join('-') : cedulaCompleta
        };
      });
      this.newProveedor = {
        nombre: proveedor.nombre,
        alias: proveedor.alias || '',
        rif: rifParts.length > 1 ? rifParts.slice(1).join('-') : rifCompleto,
        rifTipo: rifParts.length > 1 ? rifParts[0] : 'J',
        direccion: proveedor.direccion || '',
        correo: proveedor.correo || '',
        telefono: proveedor.telefono || '',
        vendedor: proveedor.vendedor || '',
        tasaPreferida: proveedor.tasaPreferida || 'dolar',
        cuentasBancarias: cuentasConTipo,
      };
    } else {
      this.editingProveedor = null;
      this.newProveedor = { nombre: '', alias: '', rif: '', rifTipo: 'J', direccion: '', correo: '', telefono: '', vendedor: '', tasaPreferida: 'dolar', cuentasBancarias: [] };
    }
    this.showModalProveedor = true;
  }

  cerrarModalProveedor() {
    this.showModalProveedor = false;
    this.editingProveedor = null;
  }

  guardarProveedor() {
    if (!this.newProveedor.alias.trim()) {
      alert('El alias es requerido');
      return;
    }

    const rifCompleto = this.newProveedor.rif.trim() 
      ? `${this.newProveedor.rifTipo}-${this.newProveedor.rif.trim()}`
      : '';

    if (this.editingProveedor) {
      this.http
        .put(`${this.API}/${this.editingProveedor._id}`, {
          nombre: this.newProveedor.nombre,
          alias: this.newProveedor.alias,
          rif: rifCompleto,
          direccion: this.newProveedor.direccion,
          correo: this.newProveedor.correo,
          telefono: this.newProveedor.telefono,
          vendedor: this.newProveedor.vendedor,
          tasaPreferida: this.newProveedor.tasaPreferida,
          cuentasBancarias: this.newProveedor.cuentasBancarias,
          modificadoPor: this.usuarioActual,
        })
        .subscribe({
          next: () => {
            this.loadProveedores();
            this.cerrarModalProveedor();
          },
          error: (err) => console.error('Error actualizando proveedor:', err),
        });
    } else {
      this.http
        .post(this.API, {
          nombre: this.newProveedor.nombre,
          alias: this.newProveedor.alias,
          rif: rifCompleto,
          direccion: this.newProveedor.direccion,
          correo: this.newProveedor.correo,
          telefono: this.newProveedor.telefono,
          vendedor: this.newProveedor.vendedor,
          tasaPreferida: this.newProveedor.tasaPreferida,
          cuentasBancarias: this.newProveedor.cuentasBancarias,
          creadoPor: this.usuarioActual,
        })
        .subscribe({
          next: () => {
            this.loadProveedores();
            this.cerrarModalProveedor();
          },
          error: (err) => console.error('Error creando proveedor:', err),
        });
    }
  }

  eliminarProveedor(id: string) {
    if (!confirm('¿Está seguro de eliminar este proveedor?')) return;
    this.http.delete(`${this.API}/${id}`).subscribe({
      next: () => this.loadProveedores(),
      error: (err) => console.error('Error eliminando proveedor:', err),
    });
  }

  toggleBancoAfliado(banco: string) {
    if (!this.newCuentaBancaria.bancosAfiliados) {
      this.newCuentaBancaria.bancosAfiliados = [];
    }
    const index = this.newCuentaBancaria.bancosAfiliados.indexOf(banco);
    if (index > -1) {
      this.newCuentaBancaria.bancosAfiliados.splice(index, 1);
    } else {
      this.newCuentaBancaria.bancosAfiliados.push(banco);
    }
  }

  agregarCuentaBancaria() {
    if (!this.newCuentaBancaria.banco.trim() || !this.newCuentaBancaria.numero.trim()) return;
    
    const cedulaRifCompleta = this.newCuentaBancaria.cedulaRif.trim()
      ? `${this.newCuentaBancaria.cedulaRifTipo}-${this.newCuentaBancaria.cedulaRif.trim()}`
      : '';
    
    this.newProveedor.cuentasBancarias = [
      ...this.newProveedor.cuentasBancarias,
      { ...this.newCuentaBancaria, cedulaRif: cedulaRifCompleta },
    ];
    this.newCuentaBancaria = { banco: '', bancosAfiliados: [] as string[], numero: '', tipo: 'corriente', titular: '', pagoMovil: false, cedulaRif: '', cedulaRifTipo: 'V', tipoPersona: 'personal', alias: '', comentario: '', esZelle: false };
  }

  eliminarCuentaBancaria(index: number) {
    this.newProveedor.cuentasBancarias = this.newProveedor.cuentasBancarias.filter((_, i) => i !== index);
  }

  abrirModalFactura(proveedorId: string, factura?: FacturaProveedor, index?: number) {
    this.proveedorIdActual = proveedorId;
    if (factura && index !== undefined) {
      this.editingFactura = { proveedorId, index, factura };
      this.newFactura = {
        numero: factura.numero,
        fecha: factura.fecha instanceof Date ? factura.fecha.toISOString().split('T')[0] : new Date(factura.fecha).toISOString().split('T')[0],
        tipo: factura.tipo || 'factura',
        monto: factura.monto || 0,
        montoIva: factura.montoIva || 0,
        baseImponible: factura.baseImponible,
        baseExenta: factura.baseExenta,
        porcentajeIva: factura.porcentajeIva || 16,
        imagenes: factura.imagenes || [],
        facturaVinculadaIndex: factura.facturaVinculadaIndex ?? -1,
        conIva: (factura.montoIva || 0) > 0,
      };
    } else {
      this.editingFactura = null;
      this.newFactura = {
        numero: '',
        fecha: new Date().toISOString().split('T')[0],
        tipo: 'factura',
        monto: 0,
        montoIva: 0,
        baseImponible: 0,
        baseExenta: 0,
        porcentajeIva: 16,
        imagenes: [],
        facturaVinculadaIndex: -1,
        conIva: false,
      };
    }
    this.showModalFactura = true;
  }

  cerrarModalFactura() {
    this.showModalFactura = false;
    this.editingFactura = null;
    this.proveedorIdActual = null;
  }

  abrirModalFacturaVinculada() {
    if (!this.proveedorIdActual) return;
    this.showModalFacturaVinculada = true;
  }

  cerrarModalFacturaVinculada() {
    this.showModalFacturaVinculada = false;
  }

  seleccionarFacturaVinculada(index: number) {
    this.newFactura.facturaVinculadaIndex = index;
    this.showModalFacturaVinculada = false;
  }

  getFacturasDisponiblesParaVincular(): { index: number; factura: FacturaProveedor }[] {
    if (!this.proveedorIdActual) return [];
    const proveedor = this.proveedores().find(p => p._id === this.proveedorIdActual);
    if (!proveedor || !proveedor.facturas) return [];
    const editIndex = this.editingFactura?.index ?? -1;
    return proveedor.facturas
      .map((f, i) => ({ index: i, factura: f }))
      .filter(item => item.factura.tipo === 'factura' || item.factura.tipo === 'nota')
      .filter(item => (item.factura.facturaVinculadaIndex === undefined || item.factura.facturaVinculadaIndex < 0))
      .filter(item => item.index !== editIndex);
  }

  getNombreFacturaVinculada(): string {
    if (this.newFactura.facturaVinculadaIndex < 0 || !this.proveedorIdActual) return '';
    const proveedor = this.proveedores().find(p => p._id === this.proveedorIdActual);
    if (!proveedor || !proveedor.facturas) return '';
    const factura = proveedor.facturas[this.newFactura.facturaVinculadaIndex];
    if (!factura) return '';
    return `N° ${factura.numero} - $${this.formatMoneda(factura.monto)}`;
  }

  quitarFacturaVinculada() {
    this.newFactura.facturaVinculadaIndex = -1;
  }

  getNotasVinculadas(proveedor: Proveedor, facturaIndex: number): { index: number; factura: FacturaProveedor }[] {
    if (!proveedor.facturas) return [];
    return proveedor.facturas
      .map((f, i) => ({ index: i, factura: f }))
      .filter(item => item.factura.facturaVinculadaIndex === facturaIndex);
  }

  getProveedorPorId(id: string | null): Proveedor | undefined {
    if (!id) return undefined;
    return this.proveedores().find(p => p._id === id);
  }

  guardarFactura() {
    const proveedorId = this.editingFactura?.proveedorId || this.proveedorIdActual;
    if (!proveedorId) return;

    if (this.editingFactura) {
      this.http
        .put(`${this.API}/${proveedorId}/facturas/${this.editingFactura.index}`, this.newFactura)
        .subscribe({
          next: () => {
            this.loadProveedores();
            const detalleAnterior = this.facturaDetalle;
            this.cerrarModalFactura();
            setTimeout(() => {
              this.loadProveedores();
              if (detalleAnterior && detalleAnterior.proveedor._id === proveedorId) {
                const proveedores = this.proveedores();
                const prov = proveedores.find(p => p._id === proveedorId);
                if (prov && prov.facturas && prov.facturas[detalleAnterior.index]) {
                  this.abrirDetalleFactura(prov, prov.facturas[detalleAnterior.index], detalleAnterior.index);
                }
              }
            }, 200);
          },
          error: (err) => console.error('Error actualizando factura:', err),
        });
    } else {
      this.http
        .post(`${this.API}/${proveedorId}/facturas`, this.newFactura)
        .subscribe({
          next: () => {
            this.loadProveedores();
            this.cerrarModalFactura();
          },
          error: (err) => console.error('Error agregando factura:', err),
        });
    }
  }

  eliminarFactura(proveedorId: string, index: number) {
    if (!confirm('¿Está seguro de eliminar esta factura?')) return;
    this.http.delete(`${this.API}/${proveedorId}/facturas/${index}`).subscribe({
      next: () => this.loadProveedores(),
      error: (err) => console.error('Error eliminando factura:', err),
    });
  }

  abrirModalAbono(proveedorId: string, index: number, factura: FacturaProveedor) {
    const proveedor = this.proveedores().find(p => p._id === proveedorId);
    if (this.calcularDeudaFactura(factura, proveedor) <= 0) {
      return;
    }
    this.facturaConAbono = { proveedorId, index, factura };
    this.newAbono = {
      monto: 0,
      fecha: new Date().toISOString().split('T')[0],
    };
    this.showModalAbono = true;
  }

  cerrarModalAbono() {
    this.showModalAbono = false;
    this.facturaConAbono = null;
  }

  abrirDetalleFactura(proveedor: Proveedor, factura: FacturaProveedor, index: number) {
    this.facturaDetalle = { proveedor, factura, index };
    this.showModalDetalleFactura = true;
  }

  cerrarDetalleFactura() {
    this.showModalDetalleFactura = false;
    this.facturaDetalle = null;
  }

  abrirModalIva(proveedor: Proveedor, factura: FacturaProveedor, index: number) {
    this.facturaIva = { proveedor, factura, index };
    this.newAbono = {
      monto: 0,
      fecha: new Date().toISOString().split('T')[0],
    };
    this.showModalIva = true;
  }

  cerrarModalIva() {
    this.showModalIva = false;
    this.facturaIva = null;
  }

  abrirModalIva25(proveedor: Proveedor, factura: FacturaProveedor, index: number) {
    this.facturaIva25 = { proveedor, factura, index };
    this.newAbono = {
      monto: 0,
      fecha: new Date().toISOString().split('T')[0],
    };
    this.showModalIva25 = true;
  }

  cerrarModalIva25() {
    this.showModalIva25 = false;
    this.facturaIva25 = null;
  }

  guardarAbonoIva() {
    if (!this.facturaIva || this.newAbono.monto <= 0) return;

    this.http
      .post(`${this.API}/${this.facturaIva.proveedor._id}/facturas/${this.facturaIva.index}/abonos-iva`, this.newAbono)
      .subscribe({
        next: () => {
          this.loadProveedores();
          this.actualizarFacturaIva();
          this.cerrarModalIva();
        },
        error: (err) => console.error('Error agregando abono IVA:', err),
      });
  }

  actualizarFacturaIva() {
    const fi = this.facturaIva;
    if (!fi) return;
    const prov = this.proveedores().find(p => p._id === fi.proveedor._id);
    if (prov && fi.index >= 0 && fi.index < (prov.facturas?.length || 0)) {
      this.facturaIva = {
        proveedor: prov,
        factura: prov.facturas[fi.index],
        index: fi.index
      };
    }
  }

  guardarAbonoIva25() {
    if (!this.facturaIva25 || this.newAbono.monto <= 0) return;

    this.http
      .post(`${this.API}/${this.facturaIva25.proveedor._id}/facturas/${this.facturaIva25.index}/abonos-iva25`, this.newAbono)
      .subscribe({
        next: () => {
          this.loadProveedores();
          this.actualizarFacturaIva25();
          this.cerrarModalIva25();
        },
        error: (err) => console.error('Error agregando abono IVA 25%:', err),
      });
  }

  actualizarFacturaIva25() {
    const fi25 = this.facturaIva25;
    if (!fi25) return;
    const prov = this.proveedores().find(p => p._id === fi25.proveedor._id);
    if (prov && fi25.index >= 0 && fi25.index < (prov.facturas?.length || 0)) {
      this.facturaIva25 = {
        proveedor: prov,
        factura: prov.facturas[fi25.index],
        index: fi25.index
      };
    }
  }

  guardarAbono() {
    if (!this.facturaConAbono || this.newAbono.monto <= 0) return;

    console.log('Enviando abono:', {
      url: `${this.API}/${this.facturaConAbono.proveedorId}/facturas/${this.facturaConAbono.index}/abonos`,
      data: this.newAbono
    });

    this.http
      .post(`${this.API}/${this.facturaConAbono.proveedorId}/facturas/${this.facturaConAbono.index}/abonos`, this.newAbono)
      .subscribe({
        next: () => {
          const montoAbono = this.newAbono.monto;
          const numeroFactura = this.facturaConAbono?.factura.numero || '';
          const proveedorId = this.facturaConAbono?.proveedorId || '';
          const facturaIndex = this.facturaConAbono?.index ?? -1;
          this.cerrarModalAbono();
          this.facturaAbonoExito = {
            numero: numeroFactura,
            monto: montoAbono,
            deuda: 0,
            proveedorId,
            facturaIndex
          };
          this.showModalAbonoExito = true;
        },
        error: (err) => {
          console.error('Error agregando abono:', err);
          if (err.error?.details) {
            alert('Error: ' + err.error.details);
          }
        },
      });
  }

  cerrarModalAbonoExito() {
    this.showModalAbonoExito = false;
    const proveedorId = this.facturaAbonoExito?.proveedorId;
    const facturaIndex = this.facturaAbonoExito?.facturaIndex;
    this.facturaAbonoExito = null;
    this.loadProveedores();
    if (proveedorId && facturaIndex !== undefined && facturaIndex >= 0) {
      this.actualizarFacturaDetalle(proveedorId, facturaIndex);
    }
  }

  editarAbono(proveedorId: string, facturaIndex: number, abonoIndex: number, abono: { monto: number; fecha: Date }) {
    const nuevoMonto = prompt('Ingrese el nuevo monto:', abono.monto.toString());
    if (nuevoMonto === null || parseFloat(nuevoMonto) <= 0) return;
    
    const fecha = prompt('Ingrese la fecha (YYYY-MM-DD):', new Date(abono.fecha).toISOString().split('T')[0]);
    if (!fecha) return;

    this.http
      .put(`${this.API}/${proveedorId}/facturas/${facturaIndex}/abonos/${abonoIndex}`, { monto: parseFloat(nuevoMonto), fechaAbono: fecha })
      .subscribe({
        next: () => {
          this.loadProveedores();
          this.actualizarFacturaDetalle(proveedorId, facturaIndex);
        },
        error: (err) => console.error('Error actualizando abono:', err),
      });
  }

  eliminarAbono(proveedorId: string, facturaIndex: number, abonoIndex: number) {
    if (!confirm('¿Está seguro de eliminar este abono?')) return;

    this.http
      .delete(`${this.API}/${proveedorId}/facturas/${facturaIndex}/abonos/${abonoIndex}`)
      .subscribe({
        next: () => {
          this.loadProveedores();
          this.actualizarFacturaDetalle(proveedorId, facturaIndex);
        },
        error: (err) => console.error('Error eliminando abono:', err),
      });
  }

  actualizarFacturaDetalle(proveedorId: string, facturaIndex: number) {
    const fd = this.facturaDetalle;
    if (fd && fd.proveedor._id === proveedorId && fd.index === facturaIndex) {
      setTimeout(() => {
        const proveedores = this.proveedores();
        const prov = proveedores.find(p => p._id === proveedorId);
        if (prov && prov.facturas && prov.facturas[facturaIndex]) {
          this.facturaDetalle = {
            proveedor: prov,
            factura: prov.facturas[facturaIndex],
            index: facturaIndex
          };
          this.cdr.detectChanges();
        }
      }, 200);
    }
  }

  editarAbonoIva(proveedorId: string, facturaIndex: number, abonoIndex: number, abono: { monto: number; fecha: Date }) {
    const nuevoMonto = prompt('Ingrese el nuevo monto:', abono.monto.toString());
    if (nuevoMonto === null || parseFloat(nuevoMonto) <= 0) return;
    
    const fecha = prompt('Ingrese la fecha (YYYY-MM-DD):', new Date(abono.fecha).toISOString().split('T')[0]);
    if (!fecha) return;

    this.http
      .put(`${this.API}/${proveedorId}/facturas/${facturaIndex}/abonos-iva/${abonoIndex}`, { monto: parseFloat(nuevoMonto), fechaAbono: fecha })
      .subscribe({
        next: () => {
          this.loadProveedores();
          this.actualizarFacturaIva();
          this.actualizarFacturaDetalle(proveedorId, facturaIndex);
          this.cerrarModalIva();
        },
        error: (err) => console.error('Error actualizando abono IVA:', err),
      });
  }

  eliminarAbonoIva(proveedorId: string, facturaIndex: number, abonoIndex: number) {
    if (!confirm('¿Está seguro de eliminar este abono IVA?')) return;

    this.http
      .delete(`${this.API}/${proveedorId}/facturas/${facturaIndex}/abonos-iva/${abonoIndex}`)
      .subscribe({
        next: () => {
          this.loadProveedores();
          this.actualizarFacturaIva();
          this.actualizarFacturaDetalle(proveedorId, facturaIndex);
          this.cerrarModalIva();
        },
        error: (err) => console.error('Error eliminando abono IVA:', err),
      });
  }

  editarAbonoIva25(proveedorId: string, facturaIndex: number, abonoIndex: number, abono: { monto: number; fecha: Date }) {
    const nuevoMonto = prompt('Ingrese el nuevo monto:', abono.monto.toString());
    if (nuevoMonto === null || parseFloat(nuevoMonto) <= 0) return;
    
    const fecha = prompt('Ingrese la fecha (YYYY-MM-DD):', new Date(abono.fecha).toISOString().split('T')[0]);
    if (!fecha) return;

    this.http
      .put(`${this.API}/${proveedorId}/facturas/${facturaIndex}/abonos-iva25/${abonoIndex}`, { monto: parseFloat(nuevoMonto), fechaAbono: fecha })
      .subscribe({
        next: () => {
          this.loadProveedores();
          this.actualizarFacturaIva25();
          this.actualizarFacturaDetalle(proveedorId, facturaIndex);
          this.cerrarModalIva25();
        },
        error: (err) => console.error('Error actualizando abono IVA 25%:', err),
      });
  }

  eliminarAbonoIva25(proveedorId: string, facturaIndex: number, abonoIndex: number) {
    if (!confirm('¿Está seguro de eliminar este abono IVA 25%?')) return;

    this.http
      .delete(`${this.API}/${proveedorId}/facturas/${facturaIndex}/abonos-iva25/${abonoIndex}`)
      .subscribe({
        next: () => {
          this.loadProveedores();
          this.actualizarFacturaIva25();
          this.actualizarFacturaDetalle(proveedorId, facturaIndex);
          this.cerrarModalIva25();
        },
        error: (err) => console.error('Error eliminando abono IVA 25%:', err),
      });
  }

  calcularDeuda(proveedor: Proveedor): number {
    return proveedor.facturas?.reduce((sum, f) => {
      return sum + this.calcularDeudaFactura(f, proveedor);
    }, 0) || 0;
  }

  calcularDeudaFactura(factura: FacturaProveedor, proveedor?: Proveedor): number {
    if (factura.facturaVinculadaIndex !== undefined && factura.facturaVinculadaIndex >= 0) {
      return 0;
    }

    let deudaBase: number;
    if (factura.tipo === 'nota') {
      deudaBase = (factura.monto || 0) - (factura.abonos || 0);
    } else {
      deudaBase = (factura.monto || 0) + (factura.baseExenta || 0) - (factura.abonos || 0);
    }

    if (proveedor && proveedor.facturas) {
      const indiceFactura = proveedor.facturas.indexOf(factura);
      if (indiceFactura >= 0) {
        for (let i = 0; i < proveedor.facturas.length; i++) {
          const nota = proveedor.facturas[i];
          if (nota.facturaVinculadaIndex === indiceFactura) {
            if (nota.tipo === 'debito') {
              deudaBase -= (nota.monto || 0);
            } else if (nota.tipo === 'credito') {
              deudaBase += (nota.monto || 0);
            }
          }
        }
      }
    }

    return deudaBase;
  }

  calcularTotalBaseImponible(proveedor: Proveedor): number {
    return proveedor.facturas?.reduce((sum, f) => sum + (f.baseImponible || 0), 0) || 0;
  }

  calcularTotalBaseExenta(proveedor: Proveedor): number {
    return proveedor.facturas?.reduce((sum, f) => sum + (f.baseExenta || 0), 0) || 0;
  }

  calcularTotalAbonos(proveedor: Proveedor): number {
    return proveedor.facturas?.reduce((sum, f) => sum + (f.abonos || 0), 0) || 0;
  }

  calcularTotalPagar(proveedor: Proveedor): number {
    return proveedor.facturas?.reduce((sum, f) => sum + (f.totalPagar || 0), 0) || 0;
  }

  getTotalDeuda(): number {
    return this.proveedores().reduce((sum, p) => sum + this.calcularDeuda(p), 0);
  }

  async abrirCamera() {
    this.modoQR = false;
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      this.showCameraModal = true;
      setTimeout(() => {
        this.videoElement = document.getElementById('cameraVideo') as HTMLVideoElement;
        if (this.videoElement) {
          this.videoElement.srcObject = this.cameraStream;
        }
      }, 100);
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('No se pudo acceder a la cámara');
    }
  }

  async abrirCameraQR() {
    this.modoQR = true;
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      this.showCameraModal = true;
      setTimeout(() => {
        this.videoElement = document.getElementById('cameraVideo') as HTMLVideoElement;
        if (this.videoElement) {
          this.videoElement.srcObject = this.cameraStream;
          this.iniciarEscaneoQR();
        }
      }, 100);
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('No se pudo acceder a la cámara');
    }
  }

  iniciarEscaneoQR() {
    if (!('BarcodeDetector' in window)) {
      alert('Tu navegador no soporta escaneo de códigos QR');
      return;
    }

    const barcodeDetector = new (window as any).BarcodeDetector({
      formats: ['qr_code']
    });

    this.qrScanInterval = setInterval(async () => {
      if (!this.videoElement || this.videoElement.readyState !== 4) return;

      try {
        const barcodes = await barcodeDetector.detect(this.videoElement);
        if (barcodes.length > 0) {
          clearInterval(this.qrScanInterval);
          this.tomarFotoQR();
        }
      } catch (err) {
        console.error('Error escaneando QR:', err);
      }
    }, 300);
  }

  tomarFotoQR() {
    if (!this.videoElement) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(this.videoElement, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.7);
      
      if (this.cameraCallback) {
        this.cameraCallback(imageData);
        this.cameraCallback = null;
      } else {
        this.newFactura.imagenes = [...this.newFactura.imagenes, imageData];
      }
    }
    this.cerrarCamera();
  }

  cerrarCamera() {
    if (this.qrScanInterval) {
      clearInterval(this.qrScanInterval);
      this.qrScanInterval = null;
    }
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    this.showCameraModal = false;
    this.videoElement = null;
    this.modoQR = false;
  }

  tomarFoto() {
    if (!this.videoElement) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(this.videoElement, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.7);
      
      if (this.cameraCallback) {
        this.cameraCallback(imageData);
        this.cameraCallback = null;
      } else {
        this.newFactura.imagenes = [...this.newFactura.imagenes, imageData];
      }
    }
    this.cerrarCamera();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.convertToBase64(file, (base64) => {
        this.newFactura.imagenes = [...this.newFactura.imagenes, base64];
      });
    }
    input.value = '';
  }

  eliminarFoto(index: number) {
    this.newFactura.imagenes = this.newFactura.imagenes.filter((_, i) => i !== index);
  }

  abrirFotoViewer(index: number) {
    if (this.facturaDetalle && this.facturaDetalle.factura.imagenes) {
      this.fotoViewerIndex = index;
      this.fotoViewerImagenes = this.facturaDetalle.factura.imagenes;
      this.showFotoViewer = true;
    }
  }

  cerrarFotoViewer() {
    this.showFotoViewer = false;
    this.fotoViewerMaximizada = false;
    this.fotoViewerPosition = { x: 0, y: 0 };
    this.fotoViewerIsDragging = false;
  }

  siguienteFoto() {
    if (this.fotoViewerIndex < this.fotoViewerImagenes.length - 1) {
      this.fotoViewerIndex++;
    }
  }

  anteriorFoto() {
    if (this.fotoViewerIndex > 0) {
      this.fotoViewerIndex--;
      this.resetZoom();
    }
  }

  zoomIn() {
    if (this.fotoViewerModoRecorte) return;
    if (this.fotoViewerZoom < 3) {
      this.fotoViewerZoom += 0.25;
    }
  }

  zoomOut() {
    if (this.fotoViewerModoRecorte) return;
    if (this.fotoViewerZoom > 0.5) {
      this.fotoViewerZoom -= 0.25;
    }
  }

  onWheelZoom(event: WheelEvent) {
    if (this.fotoViewerModoRecorte) return;
    event.preventDefault();
    if (event.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  resetZoom() {
    this.fotoViewerZoom = 1;
    this.fotoViewerModoRecorte = false;
    this.fotoViewerCropStart = null;
    this.fotoViewerCropEnd = null;
    this.fotoViewerPosition = { x: 0, y: 0 };
  }

  toggleMaximizar() {
    this.fotoViewerMaximizada = !this.fotoViewerMaximizada;
  }

  iniciarDrag(event: MouseEvent) {
    if (this.fotoViewerModoRecorte) {
      event.preventDefault();
      event.stopPropagation();
      const img = event.target as HTMLElement;
      const rect = img.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      this.fotoViewerCropStart = { x, y };
      this.fotoViewerCropEnd = { x, y };
      console.log('Iniciar recorte:', x, y);
      return;
    }
    this.fotoViewerIsDragging = true;
    this.fotoViewerDragStart = { x: event.clientX - this.fotoViewerPosition.x, y: event.clientY - this.fotoViewerPosition.y };
  }

  moverDrag(event: MouseEvent) {
    if (this.fotoViewerModoRecorte && this.fotoViewerCropStart) {
      event.preventDefault();
      event.stopPropagation();
      const img = event.target as HTMLElement;
      const rect = img.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
      this.fotoViewerCropEnd = { x, y };
      return;
    }
    if (!this.fotoViewerIsDragging) return;
    this.fotoViewerPosition = {
      x: event.clientX - this.fotoViewerDragStart.x,
      y: event.clientY - this.fotoViewerDragStart.y
    };
  }

  terminarDrag() {
    if (this.fotoViewerModoRecorte && this.fotoViewerCropStart && this.fotoViewerCropEnd) {
      console.log('Terminar recorte, guardando...');
      this.guardarRecorte();
      this.fotoViewerModoRecorte = false;
      this.fotoViewerCropStart = null;
      this.fotoViewerCropEnd = null;
      return;
    }
    this.fotoViewerIsDragging = false;
  }

  guardarRecorte() {
    if (!this.fotoViewerCropStart || !this.fotoViewerCropEnd) return;
    
    const img = document.querySelector('.foto-viewer-modal img') as HTMLImageElement;
    if (!img || !img.naturalWidth) return;

    const startX = Math.min(this.fotoViewerCropStart.x, this.fotoViewerCropEnd.x) / 100;
    const startY = Math.min(this.fotoViewerCropStart.y, this.fotoViewerCropEnd.y) / 100;
    const endX = Math.max(this.fotoViewerCropStart.x, this.fotoViewerCropEnd.x) / 100;
    const endY = Math.max(this.fotoViewerCropStart.y, this.fotoViewerCropEnd.y) / 100;

    const canvas = document.createElement('canvas');
    const cropWidth = (endX - startX) * img.naturalWidth;
    const cropHeight = (endY - startY) * img.naturalHeight;
    
    if (cropWidth < 10 || cropHeight < 10) return;
    
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(
        img,
        startX * img.naturalWidth, startY * img.naturalHeight,
        cropWidth, cropHeight,
        0, 0,
        cropWidth, cropHeight
      );
      
      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.8);
      this.guardarFotoRecortada(croppedBase64);
    }
  }

  toggleModoRecorte() {
    this.fotoViewerModoRecorte = !this.fotoViewerModoRecorte;
    if (!this.fotoViewerModoRecorte) {
      this.fotoViewerCropStart = null;
      this.fotoViewerCropEnd = null;
    }
  }

  iniciarRecorte(event: MouseEvent) {
    if (!this.fotoViewerModoRecorte) return;
    const img = event.target as HTMLElement;
    const rect = img.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    this.fotoViewerCropStart = { x, y };
    this.fotoViewerCropEnd = { x, y };
  }

  actualizarRecorte(event: MouseEvent) {
    if (!this.fotoViewerModoRecorte || !this.fotoViewerCropStart) return;
    const img = event.target as HTMLElement;
    const rect = img.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    this.fotoViewerCropEnd = { x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) };
  }

  terminarRecorte() {
    if (!this.fotoViewerModoRecorte || !this.fotoViewerCropStart || !this.fotoViewerCropEnd) return;
    
    const img = document.querySelector('.foto-viewer-modal img') as HTMLImageElement;
    if (!img || !img.naturalWidth) return;

    const scaleX = img.naturalWidth / (img.clientWidth * this.fotoViewerZoom);
    const scaleY = img.naturalHeight / (img.clientHeight * this.fotoViewerZoom);

    const startX = Math.min(this.fotoViewerCropStart.x, this.fotoViewerCropEnd.x) / 100;
    const startY = Math.min(this.fotoViewerCropStart.y, this.fotoViewerCropEnd.y) / 100;
    const endX = Math.max(this.fotoViewerCropStart.x, this.fotoViewerCropEnd.x) / 100;
    const endY = Math.max(this.fotoViewerCropStart.y, this.fotoViewerCropEnd.y) / 100;

    const canvas = document.createElement('canvas');
    const cropWidth = (endX - startX) * img.naturalWidth;
    const cropHeight = (endY - startY) * img.naturalHeight;
    
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(
        img,
        startX * img.naturalWidth, startY * img.naturalHeight,
        cropWidth, cropHeight,
        0, 0,
        cropWidth, cropHeight
      );
      
      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.8);
      this.guardarFotoRecortada(croppedBase64);
    }
  }

  guardarFotoRecortada(base64: string) {
    if (!this.facturaDetalle) return;
    
    const proveedorId = this.facturaDetalle.proveedor._id;
    const facturaIndex = this.facturaDetalle.index;
    const imagenes = [...(this.facturaDetalle.factura.imagenes || [])];
    imagenes[this.fotoViewerIndex] = base64;
    
    this.http
      .put(`${this.API}/${proveedorId}/facturas/${facturaIndex}`, { imagenes })
      .subscribe({
        next: () => {
          this.actualizarDetalleTrasCambioFotos();
          this.fotoAccionMensaje = 'Foto editada exitosamente';
          this.showModalFotoAccion = true;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error guardando foto recortada:', err),
      });
  }

  eliminarFotoDetalle(index: number) {
    if (!this.facturaDetalle) return;
    
    const proveedorId = this.facturaDetalle.proveedor._id;
    const facturaIndex = this.facturaDetalle.index;
    const imagenes = [...(this.facturaDetalle.factura.imagenes || [])];
    imagenes.splice(index, 1);
    
    this.http
      .put(`${this.API}/${proveedorId}/facturas/${facturaIndex}`, { imagenes })
      .subscribe({
        next: () => {
          this.actualizarDetalleTrasCambioFotos();
          if (this.fotoViewerIndex >= imagenes.length) {
            this.fotoViewerIndex = Math.max(0, imagenes.length - 1);
          }
          this.fotoAccionMensaje = 'Foto eliminada exitosamente';
          this.showModalFotoAccion = true;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error eliminando foto:', err),
      });
  }

  agregarFotoDetalle() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        this.convertToBase64(target.files[0], (base64) => {
          this.agregarFotoAServidor(base64);
        });
      }
    };
    input.click();
  }

  agregarFotoAServidor(base64: string) {
    if (!this.facturaDetalle) return;
    
    const proveedorId = this.facturaDetalle.proveedor._id;
    const facturaIndex = this.facturaDetalle.index;
    const imagenes = [...(this.facturaDetalle.factura.imagenes || []), base64];
    
    this.http
      .put(`${this.API}/${proveedorId}/facturas/${facturaIndex}`, { imagenes })
      .subscribe({
        next: () => {
          this.actualizarDetalleTrasCambioFotos();
          this.fotoAccionMensaje = 'Foto agregada exitosamente';
          this.showModalFotoAccion = true;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error agregando foto:', err),
      });
  }

  abrirCameraDetalle() {
    this.abrirCamera();
    this.cameraCallback = (base64: string) => {
      this.agregarFotoAServidor(base64);
    };
  }

  abrirCameraQRDetalle() {
    this.abrirCameraQR();
    this.cameraCallback = (base64: string) => {
      this.agregarFotoAServidor(base64);
    };
  }

  abrirQRModal(proveedorId: string, facturaIndex: number) {
    this.qrProveedorId = proveedorId;
    this.qrFacturaIndex = facturaIndex;
    this.qrCodeData = '';
    this.qrExpiracion = '';
    this.qrFotoRecibida = false;
    this.qrImagenesIniciales = this.facturaDetalle?.factura.imagenes ? [...this.facturaDetalle.factura.imagenes] : [];
    this.showQRModal = true;
    this.cdr.detectChanges();
    
    this.http.post<{ uploadUrl: string; expiresAt: string }>('/api/facturas/generate-qr', {
      proveedorId,
      facturaIndex
    }).subscribe({
      next: (res) => {
        console.log('QR Response:', res);
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=1&data=${encodeURIComponent(res.uploadUrl)}`;
        this.qrCodeData = qrApiUrl;
        this.qrExpiracion = res.expiresAt;
        this.cdr.detectChanges();
        this.iniciarPollingQR(proveedorId, facturaIndex);
      },
      error: (err) => {
        console.error('Error generating QR:', err);
        alert('Error al generar código QR');
        this.showQRModal = false;
      }
    });
  }

  iniciarPollingQR(proveedorId: string, facturaIndex: number) {
    this.qrInterval = setInterval(() => {
      this.http.get<{ imagenes: string[] }>(`/api/facturas/imagenes/${proveedorId}/${facturaIndex}`).subscribe({
        next: (res) => {
          console.log('Polling - Imagenes del servidor:', res.imagenes?.length);
          console.log('Polling - Imagenes iniciales guardadas:', this.qrImagenesIniciales.length);
          
          if (res.imagenes && res.imagenes.length > this.qrImagenesIniciales.length) {
            console.log('Polling - Nueva foto detectada!');
            if (this.qrInterval) {
              clearInterval(this.qrInterval);
              this.qrInterval = null;
            }
            this.qrFotoRecibida = true;
            this.showQRModal = false;
            this.showModalFotoExito = true;
            this.loadProveedores();
            const fd = this.facturaDetalle;
            if (fd) {
              const prov = this.proveedores().find(p => p._id === fd.proveedor._id);
              if (prov && prov.facturas && prov.facturas[fd.index]) {
                this.facturaDetalle = {
                  proveedor: prov,
                  factura: prov.facturas[fd.index],
                  index: fd.index
                };
              }
            }
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          console.error('Polling error:', err);
        }
      });
    }, 2000);
  }

  cerrarModalFotoExito() {
    this.showModalFotoExito = false;
    this.qrFotoRecibida = false;
  }

  cerrarModalFotoAccion() {
    this.showModalFotoAccion = false;
    this.fotoAccionMensaje = '';
  }

  actualizarDetalleTrasCambioFotos() {
    this.loadProveedores();
    const fd = this.facturaDetalle;
    if (fd) {
      const fdProveedorId = fd.proveedor._id;
      const fdIndex = fd.index;
      setTimeout(() => {
        const proveedores = this.proveedores();
        const prov = proveedores.find(p => p._id === fdProveedorId);
        if (prov && prov.facturas && prov.facturas[fdIndex]) {
          this.facturaDetalle = {
            proveedor: prov,
            factura: prov.facturas[fdIndex],
            index: fdIndex
          };
          this.fotoViewerImagenes = prov.facturas[fdIndex].imagenes || [];
          this.cdr.detectChanges();
        }
      }, 200);
    }
  }

  cerrarQRModal() {
    if (this.qrInterval) {
      clearInterval(this.qrInterval);
      this.qrInterval = null;
    }
    this.showQRModal = false;
    this.qrCodeData = '';
    this.qrExpiracion = '';
    this.qrFotoRecibida = false;
    this.qrImagenesIniciales = [];
  }

  private convertToBase64(file: File, callback: (base64: string) => void) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      this.resizeImage(result, 1200, (resized) => {
        callback(resized);
      });
    };
    reader.readAsDataURL(file);
  }

  private resizeImage(base64: string, maxWidth: number, callback: (result: string) => void) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.7));
      }
    };
    img.src = base64;
  }

  formatMoneda(value: number): string {
    return value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatFecha(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-VE');
  }

  getIvaColor(factura: FacturaProveedor): string {
    const parseNum = (val: any): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return parseFloat(val) || 0;
      return 0;
    };
    
    const iva75 = parseNum(factura.iva75);
    const iva25 = parseNum(factura.iva25);
    const abIva = parseNum(factura.abonosIva);
    const abIva25 = parseNum(factura.abonosIva25);
    const tieneIva75 = iva75 > 0;
    const tieneIva25 = iva25 > 0;
    const deudaIva75 = iva75 - abIva;
    const deudaIva25 = iva25 - abIva25;
    const isPagado = (!tieneIva75 || deudaIva75 <= 0.01) && (!tieneIva25 || deudaIva25 <= 0.01);
    
    console.log('IVA Debug:', {
      numero: factura.numero,
      iva75, iva25, abIva, abIva25,
      tieneIva75, tieneIva25,
      deudaIva75, deudaIva25,
      isPagado,
      result: isPagado ? '#28a745' : '#dc3545'
    });
    
    return isPagado ? '#28a745' : '#dc3545';
  }

  getIvaTitle(factura: FacturaProveedor): string {
    const parseNum = (val: any): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return parseFloat(val) || 0;
      return 0;
    };
    
    const iva75 = parseNum(factura.iva75);
    const iva25 = parseNum(factura.iva25);
    const abIva = parseNum(factura.abonosIva);
    const abIva25 = parseNum(factura.abonosIva25);
    const deudaIva75 = iva75 - abIva;
    const deudaIva25 = iva25 - abIva25;
    return 'IVA 75: ' + deudaIva75.toFixed(2) + ' | IVA 25: ' + deudaIva25.toFixed(2);
  }

  getBancoPlaceholder(): string {
    if (this.newCuentaBancaria.pagoMovil) return 'Banco (ej: Banesco)';
    if (this.newCuentaBancaria.tipo === 'zelle') return 'Banco emisor (ej: Bank of America)';
    return 'Banco';
  }

  getNumeroPlaceholder(): string {
    if (this.newCuentaBancaria.pagoMovil) return 'Número de teléfono';
    if (this.newCuentaBancaria.tipo === 'zelle') return 'Teléfono asociado';
    return 'Número de cuenta';
  }

  onTipoCuentaChange() {
    if (this.newCuentaBancaria.tipo === 'zelle') {
      this.newCuentaBancaria.esZelle = true;
    } else {
      this.newCuentaBancaria.esZelle = false;
    }
  }

  generarPdfProveedores() {
    const proveedors = this.proveedores();
    if (proveedors.length === 0) {
      alert('No hay proveedores para generar el PDF');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(16);
    doc.setTextColor(29, 99, 193);
    doc.text('Lista de Proveedores', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generado: ${new Date().toLocaleString('es-VE')} | Total: ${proveedors.length}`, pageWidth / 2, 22, { align: 'center' });

    let y = 30;
    const lineHeight = 6;

    doc.setFontSize(7);
    doc.setTextColor(0);
    doc.setFillColor(230, 240, 250);
    doc.rect(14, y - 3, pageWidth - 28, 6, 'F');
    doc.setFont(undefined as any, 'bold');
    doc.text('Alias', 16, y);
    doc.text('Nombre/RIF', 40, y);
    doc.text('Teléfono', 95, y);
    doc.text('Dirección', 125, y);
    
    y += lineHeight;
    doc.setFont(undefined as any, 'normal');

    proveedors.forEach((proveedor) => {
      if (y > 280) {
        doc.addPage();
        y = 15;
        doc.setFillColor(230, 240, 250);
        doc.rect(14, y - 3, pageWidth - 28, 6, 'F');
        doc.setFont(undefined as any, 'bold');
        doc.text('Alias', 16, y);
        doc.text('Nombre/RIF', 40, y);
        doc.text('Teléfono', 95, y);
        doc.text('Dirección', 125, y);
        y += lineHeight;
        doc.setFont(undefined as any, 'normal');
      }

      doc.text((proveedor.alias || '').substring(0, 12), 16, y);
      const nombreRif = `${proveedor.nombre || ''} ${proveedor.rif || ''}`.substring(0, 22);
      doc.text(nombreRif, 40, y);
      doc.text((proveedor.telefono || '-').substring(0, 12), 95, y);
      doc.text((proveedor.direccion || '-').substring(0, 30), 125, y);
      
      y += lineHeight;
    });

    doc.save(`proveedores_${new Date().toISOString().split('T')[0]}.pdf`);
  }
}
