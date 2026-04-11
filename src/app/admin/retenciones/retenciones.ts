import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ExcelService, DatosComprobante, EstructuraExcel } from '../../shared/data-access/excel.service';
import { RegistroService } from '../../shared/data-access/registro.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Proveedor {
  _id?: string;
  nombre: string;
  rif: string;
  direccion?: string;
  facturas?: Factura[];
}

interface Factura {
  numero: string;
  fecha: Date;
  tipo?: 'factura' | 'nota' | 'debito' | 'credito';
  monto?: number;
  baseImponible: number;
  baseExenta: number;
  exentoBsf?: number;
  porcentajeIva: number;
  montoBsf: number;
  iva: number;
  iva75: number;
  iva25: number;
  abonos?: number;
  abonosIva?: number;
  abonosIva25?: number;
  totalPagar: number;
  deudaActual: number;
  deudaIva: number;
  deudaIva25: number;
  numeroControl?: string;
}

interface Retencion {
  _id?: string;
  numero: string;
  proveedorRif: string;
  proveedorNombre: string;
  facturaNumero: string;
  facturaFecha: Date;
  fechaPagada: Date;
  numeroControl?: string;
  totalCompras: number;
  baseImponible: number;
  montoBsf?: number;
  exento: number;
  exentoBsf?: number;
  porcentajeIva: number;
  iva: number;
  retenido: number;
}

@Component({
  selector: 'app-retenciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './retenciones.html',
  styleUrl: './retenciones.css',
})
export class Retenciones implements OnInit {
  private http = inject(HttpClient);
  private excelService = inject(ExcelService);
  registroService = inject(RegistroService);

  private API = '/api/proveedores';

  proveedores = signal<Proveedor[]>([]);
  proveedoresFiltrados = signal<Proveedor[]>([]);
  proveedorSeleccionado = signal<Proveedor | null>(null);
  facturaSeleccionada = signal<Factura | null>(null);
  retenciones = signal<Retencion[]>([]);
  retencionExistente = signal<Retencion | null>(null);
  comprobanteNumero = '';
  ultimoNumero = 0;
  busquedaProveedor = '';
  mostrarComprobantePdf = signal(false);
  mostrarModalAccion = signal(false);
  mostrarRetenciones = signal(false);
  today = new Date();
  fechaDesde = '';
  fechaHasta = '';
  mensajeTXT = signal('');
  retencionesPorPagina = 10;
  paginaActualRetenciones = 1;
  totalPaginasRetenciones = 1;
  private RIF_EMPRESA = 'J304883676';
  private PERIODO = '202604';

  ngOnInit() {
    this.loadProveedores();
    this.cargarUltimoNumero();
    this.cargarRetenciones();
  }

  cargarUltimoNumero() {
    this.http.get<{ultimoNumero: number}>('/api/retenciones/ultimo').subscribe({
      next: (res) => {
        this.ultimoNumero = res.ultimoNumero || 0;
        this.generarNumeroComprobante();
      },
      error: () => {
        this.generarNumeroComprobante();
      }
    });
  }

  cargarRetenciones() {
    this.http.get<Retencion[]>('/api/retenciones').subscribe({
      next: (data) => {
        this.retenciones.set(data);
        this.totalPaginasRetenciones = Math.ceil(data.length / this.retencionesPorPagina);
      },
      error: (err) => console.error('Error cargando retenciones:', err)
    });
  }

  eliminarRetencion(id: string) {
    if (!confirm('¿Está seguro de eliminar esta retención?')) return;
    const retencion = this.retenciones().find(r => r._id === id);
    this.http.delete(`/api/retenciones/${id}`).subscribe({
      next: () => {
        this.cargarRetenciones();
        this.registroService.registrar(
          'eliminar',
          'Retenciones',
          `Eliminó retención ${retention?.numero || ''} - Factura ${retention?.facturaNumero || ''}`,
          { retencion: retencion }
        );
      },
      error: (err) => console.error('Error eliminando retención:', err)
    });
  }

  cambiarPaginaRetenciones(pagina: number) {
    if (pagina >= 1 && pagina <= this.totalPaginasRetenciones) {
      this.paginaActualRetenciones = pagina;
    }
  }

  get retencionesPaginadas(): Retencion[] {
    const inicio = (this.paginaActualRetenciones - 1) * this.retencionesPorPagina;
    const fin = inicio + this.retencionesPorPagina;
    return this.retenciones().slice(inicio, fin);
  }

  loadProveedores() {
    this.http.get<Proveedor[]>(this.API).subscribe({
      next: (data) => {
        this.proveedores.set(data);
        this.proveedoresFiltrados.set(data);
      },
      error: (err) => console.error('Error cargando proveedores:', err),
    });
  }

  toggleRetenciones() {
    this.mostrarRetenciones.set(!this.mostrarRetenciones());
  }

  filtrarProveedores() {
    const term = this.busquedaProveedor.toLowerCase().trim();
    if (!term) {
      this.proveedoresFiltrados.set(this.proveedores());
    } else {
      const filtrados = this.proveedores().filter(p => 
        p.nombre.toLowerCase().includes(term)
      );
      this.proveedoresFiltrados.set(filtrados);
    }
  }

  generarNumeroComprobante() {
    const now = new Date();
    const periodo = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const secuencia = this.ultimoNumero + 1;
    this.comprobanteNumero = `${periodo}${String(secuencia).padStart(8, '0')}`;
  }

  aumentarNumero() {
    const now = new Date();
    const periodo = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const secuencia = this.ultimoNumero + 1;
    this.comprobanteNumero = `${periodo}${String(secuencia).padStart(8, '0')}`;
  }

  onComprobanteNumeroChange(value: string) {
    const num = parseInt(value);
    if (!isNaN(num) && num >= this.ultimoNumero) {
      this.ultimoNumero = num;
    }
    const now = new Date();
    const periodo = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const secuencia = this.ultimoNumero;
    this.comprobanteNumero = `${periodo}${String(secuencia).padStart(8, '0')}`;
  }

  seleccionarProveedor(proveedor: Proveedor) {
    this.proveedorSeleccionado.set(proveedor);
    this.facturaSeleccionada.set(null);
  }

  seleccionarFactura(factura: Factura) {
    this.facturaSeleccionada.set(factura);
    const existentes = this.retenciones().filter(r => 
      r.facturaNumero === factura.numero && r.proveedorRif === this.proveedorSeleccionado()?.rif
    );
    if (existentes.length > 0) {
      this.retencionExistente.set(existentes[0]);
    } else {
      this.retencionExistente.set(null);
    }
  }

  async generarComprobante() {
    if (!this.proveedorSeleccionado() || !this.facturaSeleccionada()) {
      alert('Por favor seleccione un proveedor y una factura');
      return;
    }
    if (this.facturaSeleccionada()?.tipo && this.facturaSeleccionada()?.tipo !== 'factura') {
      alert('Solo se pueden generar retenciones para facturas');
      return;
    }

    if (this.retencionExistente()) {
      const existente = this.retencionExistente()!;
      this.comprobanteNumero = existente.numero;
    }
    
    this.mostrarModalAccion.set(true);
  }

  async ejecutarAccion(opcion: number) {
    this.mostrarModalAccion.set(false);
    
    const proveedor = this.proveedorSeleccionado()!;
    const factura = this.facturaSeleccionada()!;
    const existente = this.retencionExistente();

    const datos: DatosComprobante = {
      numeroComprobante: this.comprobanteNumero,
      fecha: new Date(),
      proveedor: {
        nombre: proveedor.nombre,
        rif: proveedor.rif || 'N/A'
      },
      facturas: [
        {
          operacion: 1,
          fecha: new Date(factura.fecha),
          numeroFactura: factura.numero || '',
          numeroControl: factura.numeroControl || '',
          notaDebito: '',
          notaCredito: '',
          factAfectada: '',
          totalCompras: existente ? existente.totalCompras : (factura.monto || 0) + (factura.iva || 0) + (factura.baseExenta || 0),
          exento: existente ? existente.exento : (factura.baseExenta || 0),
          baseImponible: existente ? existente.baseImponible : (factura.monto || 0),
          porcentajeIva: existente ? existente.porcentajeIva : (factura.porcentajeIva || 16),
          iva: existente ? existente.iva : factura.iva,
          retenido: existente ? existente.retenido : (factura.iva75 || 0)
        }
      ]
    };

    if (!existente) {
      const montoBsf = (factura.montoBsf && factura.montoBsf > 0) 
        ? factura.montoBsf 
        : ((factura.baseImponible || 0) + (factura.iva || 0) + (factura.baseExenta || 0));
      this.http.post('/api/retenciones', {
        numero: this.comprobanteNumero,
        proveedorRif: proveedor.rif || '',
        proveedorNombre: proveedor.nombre,
        facturaNumero: factura.numero || '',
        facturaFecha: factura.fecha,
        fechaPagada: new Date(),
        numeroControl: factura.numeroControl || '',
        totalCompras: montoBsf + (factura.exentoBsf || 0),
        baseImponible: (montoBsf  - (factura.iva || 0)),
        montoBsf: montoBsf,
        exento: factura.exentoBsf || 0,
        exentoBsf: factura.exentoBsf || 0,
        porcentajeIva: factura.porcentajeIva || 16,
        iva: factura.iva,
        retenido: factura.iva75 || 0
      }).subscribe({
        next: () => {
          this.ultimoNumero = parseInt(this.comprobanteNumero.slice(-8));
          this.http.put('/api/retenciones/ultimo', { ultimoNumero: this.ultimoNumero }).subscribe();
          this.cargarRetenciones();
          this.generarNumeroComprobante();
          this.registroService.registrar(
            'crear',
            'Retenciones',
            `Generó comprobante de retención ${this.comprobanteNumero} - Proveedor: ${proveedor.nombre}`,
            { numero: this.comprobanteNumero, proveedor: proveedor.rif, factura: factura.numero }
          );
        },
        error: (err) => {
          if (err.error?.error === 'Ya existe una retención para esta factura') {
            alert('Ya existe una retención para esta factura');
          } else {
            console.error('Error guardando retencion:', err);
          }
        }
      });
    } else {
      this.generarNumeroComprobante();
    }
    
    if (opcion === 1 || opcion === 4) {
      this.mostrarComprobantePdf.set(true);
      setTimeout(() => this.imprimirComprobante(), 100);
    }
    
    if (opcion === 2 || opcion === 4) {
      this.mostrarComprobantePdf.set(true);
      setTimeout(() => this.guardarPdfComprobante(), 100);
    }
    
    if (opcion === 3 || opcion === 4) {
      await this.excelService.generarComprobanteIVA(datos);
    }

    const acciones: string[] = [];
    if (opcion === 1 || opcion === 4) acciones.push('Imprimir');
    if (opcion === 2 || opcion === 4) acciones.push('PDF');
    if (opcion === 3 || opcion === 4) acciones.push('Excel');
    
    if (acciones.length > 0) {
      this.registroService.registrar(
        'crear',
        'Retenciones',
        `Generó comprobante ${this.comprobanteNumero} - Acciones: ${acciones.join(', ')}`,
        { numero: this.comprobanteNumero, proveedor: proveedor.rif, acciones }
      );
    }
  }

  abrirComprobantePdf() {
    this.mostrarComprobantePdf.set(true);
  }

  imprimirComprobante() {
        const contenido = document.getElementById('comprobante-content');
    if (!contenido) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprobante de Retención</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica', 'Arial', sans-serif; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${contenido.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }

  guardarPdfComprobante() {
    const contenido = document.getElementById('comprobante-content');
    if (!contenido) return;

         html2canvas(contenido, {
      scale: 2,
      useCORS: true,
      logging: false
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgWidth = 270;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Comprobante_Retencion_${this.comprobanteNumero}.pdf`);
    });

  }

  generarTxtRetenciones() {
    if (!this.fechaDesde || !this.fechaHasta) {
      this.mensajeTXT.set('Por favor seleccione un rango de fechas');
      return;
    }

    const desde = new Date(this.fechaDesde + 'T00:00:00');
    const hasta = new Date(this.fechaHasta + 'T23:59:59.999');

    const periodo = `${desde.getFullYear()}${String(desde.getMonth() + 1).padStart(2, '0')}`;
    const now = new Date();
    const fechaActual = now.toISOString().split('T')[0];

    const retencionesFiltradas = this.retenciones().filter(r => {
      const fechaPagada = new Date(r.fechaPagada);
      return fechaPagada >= desde && fechaPagada <= hasta;
    });

    if (retencionesFiltradas.length === 0) {
      this.mensajeTXT.set('No se encontraron retenciones en el rango de fechas seleccionado');
      return;
    }

    let lineas: string[] = [];
    let nComprobante = 1;

    for (const retencion of retencionesFiltradas) {
      const rifProveedor = (retencion.proveedorRif || '').replace(/-/g, '');
      const numeroFactura = retencion.facturaNumero || '';
      const numeroControl = retencion.numeroControl || '';
      const montoRetencion = (retencion.retenido || 0).toFixed(2);
      const iva = (retencion.iva || 0).toFixed(2);
      const exento = (retencion.exentoBsf || 0).toFixed(2);
      const montoBsf = retencion.montoBsf != null ? retencion.montoBsf : (retencion.totalCompras || 0);
      const baseImponible = (montoBsf - (retencion.exentoBsf || 0) - (retencion.iva || 0)).toFixed(2);
      const numero = (retencion.numero || 0).toString();
      const totalCompras = montoBsf.toFixed(2);
      
      const linea = 
        this.RIF_EMPRESA + 'ㅤㅤ' +
        periodo + 'ㅤ' +
        fechaActual + 'ㅤㅤㅤㅤ' +
        'C' + 'ㅤㅤㅤㅤ' +
        '01' + 'ㅤㅤㅤㅤ' +
        rifProveedor + 'ㅤㅤㅤㅤ' +
        numeroFactura + 'ㅤㅤㅤㅤ' +
        numeroControl + 'ㅤㅤㅤㅤ' +
        totalCompras + 'ㅤㅤㅤㅤ' +
        baseImponible + 'ㅤㅤㅤㅤ' +
        exento + 'ㅤㅤㅤㅤ' +
        '0' + 'ㅤㅤㅤㅤ' +
        numero + 'ㅤ' +
        '16.00' + 'ㅤ' +
        '0';
      
      lineas.push(linea);
      nComprobante++;
    }

    const contenidoTxt = lineas.join('\n');
    const blob = new Blob([contenidoTxt], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retenciones_${periodo}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    this.mensajeTXT.set(`TXT generado con ${lineas.length} registro(s)`);
    this.registroService.registrar(
      'crear',
      'Retenciones',
      `Generó TXT de retenciones período ${periodo} con ${lineas.length} registro(s)`,
      { periodo, cantidad: lineas.length, fechaDesde: this.fechaDesde, fechaHasta: this.fechaHasta }
    );
  }
}
 /* 
     html2canvas(contenido, {
      scale: 2,
      useCORS: true,
      logging: false
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Comprobante_Retencion_${this.comprobanteNumero}.pdf`);
    });
 */

    /*
    html2canvas(contenido, { scale: 2, useCORS: true }).then(canvas => {
  const nuevoCanvas = document.createElement('canvas');
  const ctx = nuevoCanvas.getContext('2d');

  // Para 90 grados, intercambiamos ancho y alto
  nuevoCanvas.width = canvas.height;
  nuevoCanvas.height = canvas.width;

  // Realizamos la transformación
  ctx!.translate(nuevoCanvas.width / 2, nuevoCanvas.height / 2);
  ctx!.rotate((90 * Math.PI) / 180);
  
  // Dibujamos el canvas original centrado
  ctx!.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

  // AHORA convertimos el NUEVO canvas a imagen
  const imgData = nuevoCanvas.toDataURL('image/png');
  
  // Usamos las dimensiones del nuevo canvas para el PDF
  const pdf = new jsPDF('l', 'mm', 'a4');
  const imgWidth = 260;
  const imgHeight = (nuevoCanvas.height * imgWidth) / nuevoCanvas.width;

  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  pdf.save(`Comprobante_Rotado.pdf`);
});

    */