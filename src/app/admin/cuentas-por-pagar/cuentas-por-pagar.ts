import { Component, inject, OnInit, signal, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

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
}

export interface FacturaProveedor {
  numero: string;
  fecha: Date;
  tipo: 'factura' | 'nota';
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
}

export interface Proveedor {
  _id?: string;
  nombre: string;
  rif: string;
  direccion: string;
  correo?: string;
  telefono?: string;
  vendedor?: string;
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

  showModalProveedor = false;
  showModalFactura = false;
  showModalAbono = false;
  showModalDetalleFactura = false;
  showModalIva = false;
  showModalIva25 = false;
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
    rif: '',
    rifTipo: 'J',
    direccion: '',
    correo: '',
    telefono: '',
    vendedor: '',
    cuentasBancarias: [] as CuentaBancaria[],
  };

  newFactura = {
    numero: '',
    fecha: '',
    tipo: 'factura',
    monto: 0,
    montoIva: 0,
    baseImponible: 0,
    baseExenta: 0,
    porcentajeIva: 16,
    imagenes: [] as string[],
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
        rif: rifParts.length > 1 ? rifParts.slice(1).join('-') : rifCompleto,
        rifTipo: rifParts.length > 1 ? rifParts[0] : 'J',
        direccion: proveedor.direccion || '',
        correo: proveedor.correo || '',
        telefono: proveedor.telefono || '',
        vendedor: proveedor.vendedor || '',
        cuentasBancarias: cuentasConTipo,
      };
    } else {
      this.editingProveedor = null;
      this.newProveedor = { nombre: '', rif: '', rifTipo: 'J', direccion: '', correo: '', telefono: '', vendedor: '', cuentasBancarias: [] };
    }
    this.showModalProveedor = true;
  }

  cerrarModalProveedor() {
    this.showModalProveedor = false;
    this.editingProveedor = null;
  }

  guardarProveedor() {
    if (!this.newProveedor.nombre.trim()) return;

    const rifCompleto = this.newProveedor.rif.trim() 
      ? `${this.newProveedor.rifTipo}-${this.newProveedor.rif.trim()}`
      : '';

    if (this.editingProveedor) {
      this.http
        .put(`${this.API}/${this.editingProveedor._id}`, {
          nombre: this.newProveedor.nombre,
          rif: rifCompleto,
          direccion: this.newProveedor.direccion,
          correo: this.newProveedor.correo,
          telefono: this.newProveedor.telefono,
          vendedor: this.newProveedor.vendedor,
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
          rif: rifCompleto,
          direccion: this.newProveedor.direccion,
          correo: this.newProveedor.correo,
          telefono: this.newProveedor.telefono,
          vendedor: this.newProveedor.vendedor,
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
    this.newCuentaBancaria = { banco: '', bancosAfiliados: [] as string[], numero: '', tipo: 'corriente', titular: '', pagoMovil: false, cedulaRif: '', cedulaRifTipo: 'V', tipoPersona: 'personal' };
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
      };
    }
    this.showModalFactura = true;
  }

  cerrarModalFactura() {
    this.showModalFactura = false;
    this.editingFactura = null;
    this.proveedorIdActual = null;
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
    this.showModalIva = true;
  }

  cerrarModalIva() {
    this.showModalIva = false;
    this.facturaIva = null;
  }

  abrirModalIva25(proveedor: Proveedor, factura: FacturaProveedor, index: number) {
    this.facturaIva25 = { proveedor, factura, index };
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
          this.cerrarModalIva();
          const fd = this.facturaDetalle;
          if (fd) {
            const prov = this.proveedores().find(p => p._id === fd.proveedor._id);
            if (prov && fd.index >= 0 && fd.index < (prov.facturas?.length || 0)) {
              this.facturaDetalle = {
                proveedor: prov,
                factura: prov.facturas[fd.index],
                index: fd.index
              };
            }
          }
        },
        error: (err) => console.error('Error agregando abono IVA:', err),
      });
  }

  guardarAbonoIva25() {
    if (!this.facturaIva25 || this.newAbono.monto <= 0) return;

    this.http
      .post(`${this.API}/${this.facturaIva25.proveedor._id}/facturas/${this.facturaIva25.index}/abonos-iva25`, this.newAbono)
      .subscribe({
        next: () => {
          this.loadProveedores();
          this.cerrarModalIva25();
          const fd = this.facturaDetalle;
          if (fd) {
            const prov = this.proveedores().find(p => p._id === fd.proveedor._id);
            if (prov && fd.index >= 0 && fd.index < (prov.facturas?.length || 0)) {
              this.facturaDetalle = {
                proveedor: prov,
                factura: prov.facturas[fd.index],
                index: fd.index
              };
            }
          }
        },
        error: (err) => console.error('Error agregando abono IVA 25%:', err),
      });
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
          this.loadProveedores();
          this.cerrarModalAbono();
        },
        error: (err) => {
          console.error('Error agregando abono:', err);
          if (err.error?.details) {
            alert('Error: ' + err.error.details);
          }
        },
      });
  }

  calcularDeuda(proveedor: Proveedor): number {
    return proveedor.facturas?.reduce((sum, f) => sum + (f.deudaActual || 0), 0) || 0;
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
          this.loadProveedores();
          const fd = this.facturaDetalle;
          if (fd) {
            setTimeout(() => {
              const proveedores = this.proveedores();
              const prov = proveedores.find(p => p._id === fd.proveedor._id);
              if (prov && prov.facturas && prov.facturas[fd.index]) {
                this.facturaDetalle = {
                  proveedor: prov,
                  factura: prov.facturas[fd.index],
                  index: fd.index
                };
                this.fotoViewerImagenes = prov.facturas[fd.index].imagenes || [];
              }
            }, 200);
          }
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
              }
            }, 200);
          }
          this.fotoViewerImagenes = imagenes;
          if (this.fotoViewerIndex >= this.fotoViewerImagenes.length) {
            this.fotoViewerIndex = Math.max(0, this.fotoViewerImagenes.length - 1);
          }
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
              }
            }, 200);
          }
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
            this.qrFotoRecibida = true;
            this.cdr.detectChanges();
            setTimeout(() => {
              this.cerrarQRModal();
              this.loadProveedores();
              setTimeout(() => {
                const fd = this.facturaDetalle;
                if (fd) {
                  const prov = this.proveedores().find(p => p._id === fd.proveedor._id);
                  if (prov && prov.facturas && prov.facturas[fd.index]) {
                    this.facturaDetalle = {
                      proveedor: prov,
                      factura: prov.facturas[fd.index],
                      index: fd.index
                    };
                    this.cdr.detectChanges();
                  }
                }
              }, 300);
            }, 2000);
          }
        },
        error: (err) => {
          console.error('Polling error:', err);
        }
      });
    }, 2000);
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
}
