import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

export interface CuentaBancaria {
  banco: string;
  bancosAfiliados?: string[];
  numero: string;
  tipo: string;
  titular?: string;
  pagoMovil?: boolean;
  cedulaRif?: string;
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
  private http = inject(HttpClient);
  
  private API = '/api/proveedores';

  proveedores = signal<Proveedor[]>([]);
  proveedorExpandido = signal<string | null>(null);
  proveedorEditando = signal<string | null>(null);
  proveedorConFactura = signal<string | null>(null);
  cuentaExpandida = signal<{proveedorId: string, index: number} | null>(null);
  usuarioActual = 'Admin';

  showModalProveedor = false;
  showModalFactura = false;
  showModalAbono = false;
  showModalDetalleFactura = false;
  showModalIva = false;
  showModalIva25 = false;
  editingProveedor: Proveedor | null = null;
  editingFactura: { proveedorId: string; index: number; factura: FacturaProveedor } | null = null;
  
  qrCodeUrl: string | null = null;
  qrLoading = false;
  facturaConAbono: { proveedorId: string; index: number; factura: FacturaProveedor } | null = null;
  facturaDetalle: { proveedor: Proveedor; factura: FacturaProveedor; index: number } | null = null;
  facturaIva: { proveedor: Proveedor; factura: FacturaProveedor; index: number } | null = null;
  facturaIva25: { proveedor: Proveedor; factura: FacturaProveedor; index: number } | null = null;

  newProveedor = {
    nombre: '',
    rif: '',
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
  };

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
      this.newProveedor = {
        nombre: proveedor.nombre,
        rif: proveedor.rif || '',
        direccion: proveedor.direccion || '',
        correo: proveedor.correo || '',
        telefono: proveedor.telefono || '',
        vendedor: proveedor.vendedor || '',
        cuentasBancarias: [...proveedor.cuentasBancarias],
      };
    } else {
      this.editingProveedor = null;
      this.newProveedor = { nombre: '', rif: '', direccion: '', correo: '', telefono: '', vendedor: '', cuentasBancarias: [] };
    }
    this.showModalProveedor = true;
  }

  cerrarModalProveedor() {
    this.showModalProveedor = false;
    this.editingProveedor = null;
  }

  guardarProveedor() {
    if (!this.newProveedor.nombre.trim()) return;

    if (this.editingProveedor) {
      this.http
        .put(`${this.API}/${this.editingProveedor._id}`, {
          nombre: this.newProveedor.nombre,
          rif: this.newProveedor.rif,
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
          rif: this.newProveedor.rif,
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
    this.newProveedor.cuentasBancarias = [
      ...this.newProveedor.cuentasBancarias,
      { ...this.newCuentaBancaria },
    ];
    this.newCuentaBancaria = { banco: '', bancosAfiliados: [] as string[], numero: '', tipo: 'corriente', titular: '', pagoMovil: false, cedulaRif: '', tipoPersona: 'personal' };
  }

  eliminarCuentaBancaria(index: number) {
    this.newProveedor.cuentasBancarias = this.newProveedor.cuentasBancarias.filter((_, i) => i !== index);
  }

  abrirModalFactura(proveedorId: string, factura?: FacturaProveedor, index?: number) {
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
      };
    }
    this.proveedorConFactura.set(proveedorId);
    this.showModalFactura = true;
  }

  cerrarModalFactura() {
    this.showModalFactura = false;
    this.editingFactura = null;
    this.cerrarQrCode();
  }

  generarQrCode() {
    const proveedorId = this.proveedorConFactura();
    if (!proveedorId) return;

    this.qrLoading = true;
    const facturaIndex = this.editingFactura?.index ?? -1;

    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
    this.http.post<any>(`${apiUrl}/api/facturas/generate-qr`, { proveedorId, facturaIndex })
      .subscribe({
        next: (response) => {
          this.qrCodeUrl = response.qrCode;
          this.qrLoading = false;
        },
        error: (err) => {
          console.error('Error generating QR:', err);
          this.qrLoading = false;
        },
      });
  }

  cerrarQrCode() {
    this.qrCodeUrl = null;
  }

  guardarFactura() {
    const proveedorId = this.proveedorConFactura();
    if (!proveedorId) return;

    if (this.editingFactura) {
      this.http
        .put(`${this.API}/${proveedorId}/facturas/${this.editingFactura.index}`, this.newFactura)
        .subscribe({
          next: () => {
            this.loadProveedores();
            this.cerrarModalFactura();
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
          if (this.facturaDetalle) {
            const prov = this.proveedores().find(p => p._id === this.facturaDetalle?.proveedor._id);
            if (prov && this.facturaDetalle.index >= 0 && this.facturaDetalle.index < (prov.facturas?.length || 0)) {
              this.facturaDetalle = {
                proveedor: prov,
                factura: prov.facturas[this.facturaDetalle.index],
                index: this.facturaDetalle.index
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
          if (this.facturaDetalle) {
            const prov = this.proveedores().find(p => p._id === this.facturaDetalle?.proveedor._id);
            if (prov && this.facturaDetalle.index >= 0 && this.facturaDetalle.index < (prov.facturas?.length || 0)) {
              this.facturaDetalle = {
                proveedor: prov,
                factura: prov.facturas[this.facturaDetalle.index],
                index: this.facturaDetalle.index
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

  formatMoneda(value: number): string {
    return value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatFecha(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-VE');
  }
}
