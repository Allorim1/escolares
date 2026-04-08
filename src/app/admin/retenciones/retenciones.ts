import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ExcelService, DatosComprobante, EstructuraExcel } from '../../shared/data-access/excel.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Proveedor {
  _id?: string;
  nombre: string;
  rif: string;
  facturas?: Factura[];
}

interface Factura {
  numero: string;
  fecha: Date;
  baseImponible: number;
  baseExenta: number;
  porcentajeIva: number;
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
  totalCompras: number;
  baseImponible: number;
  exento: number;
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

  private API = '/api/proveedores';

  proveedores = signal<Proveedor[]>([]);
  proveedoresFiltrados = signal<Proveedor[]>([]);
  proveedorSeleccionado = signal<Proveedor | null>(null);
  facturaSeleccionada = signal<Factura | null>(null);
  retenciones = signal<Retencion[]>([]);
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
      next: (data) => this.retenciones.set(data),
      error: (err) => console.error('Error cargando retenciones:', err)
    });
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
    this.ultimoNumero++;
    this.comprobanteNumero = String(this.ultimoNumero).padStart(8, '0');
  }

  aumentarNumero() {
    this.ultimoNumero++;
    this.comprobanteNumero = String(this.ultimoNumero).padStart(8, '0');
  }

  onComprobanteNumeroChange(value: string) {
    const num = parseInt(value);
    if (!isNaN(num) && num >= this.ultimoNumero) {
      this.ultimoNumero = num;
      this.comprobanteNumero = String(num).padStart(8, '0');
    } else {
      this.comprobanteNumero = String(this.ultimoNumero).padStart(8, '0');
    }
  }

  seleccionarProveedor(proveedor: Proveedor) {
    this.proveedorSeleccionado.set(proveedor);
    this.facturaSeleccionada.set(null);
  }

  seleccionarFactura(factura: Factura) {
    this.facturaSeleccionada.set(factura);
  }

  async generarComprobante() {
    if (!this.proveedorSeleccionado() || !this.facturaSeleccionada()) {
      alert('Por favor seleccione un proveedor y una factura');
      return;
    }
    this.mostrarModalAccion.set(true);
  }

  async ejecutarAccion(opcion: number) {
    this.mostrarModalAccion.set(false);
    
    const proveedor = this.proveedorSeleccionado()!;
    const factura = this.facturaSeleccionada()!;

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
          totalCompras: factura.totalPagar,
          exento: factura.baseExenta,
          baseImponible: factura.baseImponible,
          porcentajeIva: factura.porcentajeIva || 16,
          iva: factura.iva,
          retenido: factura.iva75 || 0
        }
      ]
    };

    this.http.post('/api/retenciones', {
      numero: this.comprobanteNumero,
      proveedorRif: proveedor.rif || '',
      proveedorNombre: proveedor.nombre,
      facturaNumero: factura.numero || '',
      facturaFecha: factura.fecha,
      totalCompras: factura.totalPagar,
      baseImponible: factura.baseImponible,
      exento: factura.baseExenta,
      porcentajeIva: factura.porcentajeIva || 16,
      iva: factura.iva,
      retenido: factura.iva75 || 0
    }).subscribe({
      next: () => {
        this.http.put('/api/retenciones/ultimo', { ultimoNumero: this.ultimoNumero }).subscribe();
        this.cargarRetenciones();
      },
      error: (err) => console.error('Error guardando retencion:', err)
    });
    
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

    this.generarNumeroComprobante();
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

    const desde = new Date(this.fechaDesde);
    const hasta = new Date(this.fechaHasta);
    hasta.setHours(23, 59, 59, 999);

    const periodo = `${desde.getFullYear()}${String(desde.getMonth() + 1).padStart(2, '0')}`;
    const now = new Date();
    const fechaActual = now.toISOString().split('T')[0];

    let lineas: string[] = [];
    let nComprobante = 1;

    for (const proveedor of this.proveedores()) {
      if (!proveedor.facturas || proveedor.facturas.length === 0) continue;

      for (const factura of proveedor.facturas) {
        const fechaFactura = new Date(factura.fecha);
        
        if (fechaFactura >= desde && fechaFactura <= hasta) {
          const rifProveedor = (proveedor.rif || '').replace(/-/g, '');
          const numeroFactura = factura.numero || '';
          const numeroControl = factura.numeroControl || '';
          const montoTotal = (factura.totalPagar || 0).toFixed(2);
          const baseImponible = (factura.baseImponible || 0).toFixed(2);
          const montoRetencion = (factura.iva75 || 0).toFixed(2);
          const iva = (factura.iva || 0).toFixed(2);
          
          const linea = [
            this.RIF_EMPRESA,
            periodo,
            fechaActual,
            'C',
            '01',
            rifProveedor,
            numeroFactura,
            numeroControl,
            montoTotal,
            baseImponible,
            montoRetencion,
            '0',
            String(nComprobante).padStart(8, '0'),
            iva,
            '0'
          ].join('\t');
          
          lineas.push(linea);
          nComprobante++;
        }
      }
    }

    if (lineas.length === 0) {
      this.mensajeTXT.set('No se encontraron facturas en el rango de fechas seleccionado');
      return;
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