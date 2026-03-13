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
  comprobanteNumero = '';
  busquedaProveedor = '';
  mostrarComprobantePdf = signal(false);
  mostrarModalAccion = signal(false);
  today = new Date();

  ngOnInit() {
    this.loadProveedores();
    this.generarNumeroComprobante();
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
    const ano = now.getFullYear();
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    this.comprobanteNumero = `${ano}${mes}${random}`;
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