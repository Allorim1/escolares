import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FacturaProveedor {
  numero: string;
  fecha: Date;
  tipo: 'factura' | 'nota' | 'debito' | 'credito';
  monto: number;
  montoIva: number;
  baseImponible: number;
  baseExenta: number;
  exentoBsf?: number;
  porcentajeIva: number;
  iva: number;
  iva75: number;
  iva25: number;
  abonos: number;
  abonosIva: number;
  abonosIva25: number;
  totalPagar: number;
  deudaActual: number;
  numeroControl?: string;
}

interface Proveedor {
  _id?: string;
  nombre: string;
  alias?: string;
  rif: string;
  facturas?: FacturaProveedor[];
}

interface LibroCompraItem {
  fecha: Date;
  rif: string;
  razonSocial: string;
  numeroFactura: string;
  numeroControl: string;
  tipo: string;
  montoTotal: number;
  comprasNoGravadas: number;
  baseImponible: number;
  alicuota: number;
  iva: number;
  ivaRetenido: number;
  proveedorId?: string;
  facturaIndex?: number;
}

@Component({
  selector: 'app-libro-compras',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './libro-compras.html',
  styleUrl: './libro-compras.css',
})
export class LibroCompras implements OnInit {
  private http = inject(HttpClient);

  private API = '/api/proveedores';

  proveedores = signal<Proveedor[]>([]);
  libroCompras = signal<LibroCompraItem[]>([]);

  fechaInicio = signal<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  fechaFin = signal<string>(new Date().toISOString().split('T')[0]);

  alicuotaSeleccionada = signal<number>(16);

  alicuotas = [8, 16, 25, 0];

  constructor() {}

  ngOnInit() {
    this.loadProveedores();
  }

  loadProveedores() {
    this.http.get<Proveedor[]>(this.API).subscribe({
      next: (data) => {
        this.proveedores.set(data);
        this.generarLibroCompras();
      },
      error: (err) => console.error('Error cargando proveedores:', err),
    });
  }

  generarLibroCompras() {
    const items: LibroCompraItem[] = [];
    const inicio = new Date(this.fechaInicio());
    const fin = new Date(this.fechaFin());
    fin.setHours(23, 59, 59, 999);

    this.proveedores().forEach((proveedor) => {
      if (!proveedor.facturas) return;

      proveedor.facturas.forEach((factura, index) => {
        const fechaFactura = new Date(factura.fecha);
        if (fechaFactura < inicio || fechaFactura > fin) return;

        const alicuota = factura.porcentajeIva || 16;
        if (this.alicuotaSeleccionada() > 0 && alicuota !== this.alicuotaSeleccionada()) return;

        let montoTotal = factura.monto || 0;
        
        if (factura.tipo === 'credito' || factura.tipo === 'nota') {
          montoTotal = -Math.abs(montoTotal);
        }

        const tipoDocumento =
          factura.tipo === 'credito'
            ? 'NC'
            : factura.tipo === 'debito'
            ? 'ND'
            : factura.tipo === 'nota'
            ? 'N'
            : 'F';

        items.push({
          fecha: fechaFactura,
          rif: proveedor.rif || '',
          razonSocial: proveedor.nombre || proveedor.alias || '',
          numeroFactura: factura.numero || '',
          numeroControl: factura.numeroControl || '',
          tipo: tipoDocumento,
          montoTotal: montoTotal,
          comprasNoGravadas: factura.baseExenta || 0,
          baseImponible: factura.baseImponible || 0,
          alicuota: alicuota,
          iva: factura.montoIva || 0,
          ivaRetenido: 0,
          proveedorId: proveedor._id,
          facturaIndex: index,
        });
      });
    });

    items.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    this.libroCompras.set(items);
  }

  filtrarPorAlicuota(alicuota: number) {
    this.alicuotaSeleccionada.set(alicuota);
    this.generarLibroCompras();
  }

  getTotalMonto(): number {
    return this.libroCompras().reduce((sum, item) => sum + item.montoTotal, 0);
  }

  getTotalBaseImponible(): number {
    return this.libroCompras().reduce((sum, item) => sum + item.baseImponible, 0);
  }

  getTotalIva(): number {
    return this.libroCompras().reduce((sum, item) => sum + item.iva, 0);
  }

  getTotalComprasNoGravadas(): number {
    return this.libroCompras().reduce((sum, item) => sum + item.comprasNoGravadas, 0);
  }

  formatMoneda(value: number): string {
    return value.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatFecha(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-VE');
  }

  exportarPDF() {
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text('Libro de Compras', 14, 20);

    doc.setFontSize(10);
    doc.text(
      `Período: ${this.formatFecha(this.fechaInicio())} al ${this.formatFecha(this.fechaFin())}`,
      14,
      28
    );

    const tableData = this.libroCompras().map((item) => [
      this.formatFecha(item.fecha),
      item.rif,
      item.razonSocial,
      item.numeroFactura,
      item.numeroControl,
      item.tipo,
      this.formatMoneda(item.montoTotal),
      this.formatMoneda(item.comprasNoGravadas),
      this.formatMoneda(item.baseImponible),
      `${item.alicuota}%`,
      this.formatMoneda(item.iva),
    ]);

    autoTable(doc, {
      head: [
        [
          'Fecha',
          'RIF',
          'Proveedor',
          'N° Factura',
          'N° Control',
          'Tipo',
          'Monto Total',
          'Exento',
          'Base Imponible',
          'Alícuota',
          'IVA',
        ],
      ],
      body: tableData,
      startY: 35,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [41, 128, 185] },
      alternateRowStyles: { fillColor: [240, 240, 240] },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 50;

    doc.setFontSize(10);
    doc.text('Totales:', 14, finalY + 10);
    doc.text(`Monto Total: ${this.formatMoneda(this.getTotalMonto())}`, 14, finalY + 18);
    doc.text(`Base Imponible: ${this.formatMoneda(this.getTotalBaseImponible())}`, 14, finalY + 24);
    doc.text(`IVA: ${this.formatMoneda(this.getTotalIva())}`, 14, finalY + 30);
    doc.text(`Exento: ${this.formatMoneda(this.getTotalComprasNoGravadas())}`, 14, finalY + 36);

    doc.save(`libro-compras-${this.fechaInicio()}-${this.fechaFin()}.pdf`);
  }

  exportarExcel() {
    const headers = [
      'Fecha',
      'RIF',
      'Razón Social',
      'Número de Factura',
      'Número de Control',
      'Tipo',
      'Monto Total',
      'Compras No Gravadas',
      'Base Imponible',
      'Alícuota (%)',
      'IVA',
      'IVA Retenido',
    ];

    const rows = this.libroCompras().map((item) => [
      this.formatFecha(item.fecha),
      item.rif,
      item.razonSocial,
      item.numeroFactura,
      item.numeroControl,
      item.tipo,
      item.montoTotal,
      item.comprasNoGravadas,
      item.baseImponible,
      item.alicuota,
      item.iva,
      item.ivaRetenido,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `libro-compras-${this.fechaInicio()}-${this.fechaFin()}.csv`;
    link.click();
  }
}