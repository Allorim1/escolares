import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface AbonoPolar {
  _id?: string;
  fecha: string;
  nombre: string;
  planta: string;
  cedula: string;
  telefono: string;
  nFact: string;
  montoFactura: number;
  iva: number;
  diferencia: number;
  tasa: number;
  divisa: number;
  status: string;
}

@Component({
  selector: 'app-abonos-polar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './abonos-polar.html',
  styleUrl: './abonos-polar.css',
})
export class AbonosPolar implements OnInit {
  private http = inject(HttpClient);

  private readonly API = '/api/abonos-polar';

  abonos = signal<AbonoPolar[]>([]);
  abonosFiltrados = computed(() => {
    const f = this.filtros();
    return this.abonos().filter((a) => {
      let passes = true;
      if (f.planta) {
        passes = passes && a.planta === f.planta;
      }
      if (f.fechaDesde) {
        passes = passes && new Date(a.fecha) >= new Date(f.fechaDesde);
      }
      if (f.fechaHasta) {
        passes = passes && new Date(a.fecha) <= new Date(f.fechaHasta + 'T23:59:59');
      }
      return passes;
    });
  });
  loading = signal(false);
  saving = signal(false);

  showModal = signal(false);
  editingAbono: AbonoPolar | null = null;

  showModalColumnas = signal(false);
  columnasDisponibles = [
    { key: 'fecha', label: 'Fecha' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'planta', label: 'Planta' },
    { key: 'cedula', label: 'Cédula' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'nFact', label: 'N. Fact' },
    { key: 'montoFactura', label: 'Monto Factura' },
    { key: 'iva', label: 'IVA' },
    { key: 'diferencia', label: 'Diferencia' },
    { key: 'tasa', label: 'Tasa' },
    { key: 'divisa', label: 'Divisa' },
    { key: 'status', label: 'Status' },
  ];
  columnasSeleccionadas = signal<Set<string>>(new Set(this.columnasDisponibles.map(c => c.key)));

  plantas = ['Salsas y Untables', 'Limpieza', 'Metal Grafica', 'Super Envases', 'Cerveceria'];

  filtros = signal({
    planta: '',
    fechaDesde: '',
    fechaHasta: '',
  });

  ngOnInit() {
    this.loadAbonos();
  }

  loadAbonos() {
    this.loading.set(true);
    this.http.get<AbonoPolar[]>(this.API).subscribe({
      next: (data) => {
        this.abonos.set(data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading abonos:', err);
        this.loading.set(false);
      },
    });
  }

  abrirModalColumnas() {
    this.showModalColumnas.set(true);
  }

  cerrarModalColumnas() {
    this.showModalColumnas.set(false);
  }

  toggleColumna(key: string) {
    this.columnasSeleccionadas.update(actual => {
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
  }

  abrirModal(abono?: AbonoPolar) {
    if (abono) {
      this.editingAbono = { 
        ...abono, 
        fecha: abono.fecha ? new Date(abono.fecha).toISOString().split('T')[0] : '',
      };
    } else {
      this.editingAbono = {
        fecha: new Date().toISOString().split('T')[0],
        nombre: '',
        planta: '',
        cedula: '',
        telefono: '',
        nFact: '',
        montoFactura: 0,
        iva: 0,
        diferencia: 0,
        tasa: 0,
        divisa: 0,
        status: '',
      };
    }
    this.showModal.set(true);
  }

  cerrarModal() {
    this.showModal.set(false);
    this.editingAbono = null;
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
      this.editingAbono.divisa = Number((this.editingAbono.diferencia / tasa).toFixed(2));
    } else {
      this.editingAbono.divisa = 0;
    }
  }

  guardarAbono() {
    if (!this.editingAbono) return;

    if (!this.editingAbono.nombre.trim() || !this.editingAbono.planta || !this.editingAbono.nFact) {
      alert('Por favor, complete los campos requeridos: Nombre, Planta y N. Fact');
      return;
    }

    this.saving.set(true);

    if (this.editingAbono._id) {
      this.http
        .put(`${this.API}/${this.editingAbono._id}`, this.editingAbono)
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.cerrarModal();
            this.loadAbonos();
          },
          error: (err) => {
            console.error('Error updating abono:', err);
            this.saving.set(false);
          },
        });
    } else {
      this.http.post(this.API, this.editingAbono).subscribe({
        next: (res: any) => {
          this.saving.set(false);
          this.cerrarModal();
          this.loadAbonos();
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
      next: () => this.loadAbonos(),
      error: (err) => console.error('Error deleting abono:', err),
    });
  }

  formatMonto(monto: number): string {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
    }).format(monto);
  }

  formatFecha(fecha: string): string {
    const date = new Date(fecha);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const anio = date.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  generarReportePdf() {
    const datos = this.abonosFiltrados();
    if (datos.length === 0) {
      alert('No hay datos para generar el reporte');
      return;
    }

    const columnas = this.columnasDisponibles.filter(c => this.columnasSeleccionadas().has(c.key));
    if (columnas.length === 0) {
      alert('Seleccione al menos una columna');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(16);
    doc.setTextColor(29, 99, 193);
    doc.text('Reporte de Pagos', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Total registros: ${datos.length}`, pageWidth / 2, 34, { align: 'center' });

    const plantaFiltro = this.filtros().planta;
    if (plantaFiltro) {
      doc.text(`Planta: ${plantaFiltro}`, pageWidth / 2, 40, { align: 'center' });
    }

    const headerHeight = plantaFiltro ? 46 : 40;
    const marginBottom = 18;
    const rowHeight = 7;
    const maxRows = Math.floor((pageHeight - headerHeight - marginBottom) / rowHeight);

    const head = columnas.map(c => c.label);
    const body = datos.map((a) => {
      return columnas.map(c => {
        if (c.key === 'fecha') return this.formatFecha(a.fecha);
        if (c.key === 'montoFactura' || c.key === 'iva' || c.key === 'diferencia' || c.key === 'tasa') return `Bs ${(a as any)[c.key].toFixed(2)}`;
        if (c.key === 'divisa') return `$ ${(a as any)[c.key]?.toFixed(2) || '0.00'}`;
        return (a as any)[c.key] ?? '';
      });
    });

    while (body.length < maxRows) {
      body.push(columnas.map(() => ''));
    }

    const columnWidths: any = {};
    columnas.forEach((c, i) => {
      columnWidths[i] = { cellWidth: c.key === 'nombre' ? 32 : c.key === 'planta' ? 24 : 20 };
    });

    autoTable(doc, {
      startY: headerHeight,
      head: [head],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [29, 99, 193], textColor: 255, fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      styles: { cellPadding: 1.5, fontSize: 7, overflow: 'linebreak' },
      margin: { left: 18, right: 18 },
      tableWidth: 'auto',
      columnStyles: columnWidths,
    });

    doc.save(`abonos_polar_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  async generarReporteExcel() {
    const datos = this.abonosFiltrados();
    if (datos.length === 0) {
      alert('No hay datos para generar el reporte');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Abonos Polar');

    worksheet.columns = [
      { width: 15 },
      { width: 30 },
      { width: 25 },
      { width: 18 },
      { width: 18 },
      { width: 15 },
      { width: 20 },
      { width: 15 },
      { width: 18 },
      { width: 15 },
      { width: 18 },
      { width: 18 },
    ];

    const headerRow = worksheet.addRow(['Fecha', 'Nombre', 'Planta', 'Cédula', 'Teléfono', 'N. Fact', 'Monto Factura', 'IVA', 'Diferencia', 'Tasa', 'Diviza', 'Status']);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D63C1' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    datos.forEach((a) => {
      const row = worksheet.addRow([
        this.formatFecha(a.fecha),
        a.nombre,
        a.planta,
        a.cedula,
        a.telefono,
        a.nFact,
        a.montoFactura,
        a.iva,
        a.diferencia,
        a.tasa,
        a.diviza ?? 0,
        a.status,
      ]);
      row.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `abonos_polar_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}
