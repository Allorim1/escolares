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
  diviza: number;
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
  loading = signal(false);
  saving = signal(false);

  showModal = signal(false);
  editingAbono: AbonoPolar | null = null;

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

  getAbonosFiltrados(): AbonoPolar[] {
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
  }

  filtrarAbonos() {
  }

  abrirModal(abono?: AbonoPolar) {
    if (abono) {
      this.editingAbono = { ...abono, fecha: abono.fecha ? new Date(abono.fecha).toISOString().split('T')[0] : '' };
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
        diviza: 0,
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
    this.editingAbono.iva = Number((monto * 0.16).toFixed(2));
    this.editingAbono.diferencia = Number((monto - this.editingAbono.iva).toFixed(2));
    this.calcularDiviza();
  }

  calcularDiviza() {
    if (!this.editingAbono) return;
    const tasa = Number(this.editingAbono.tasa);
    if (tasa > 0) {
      this.editingAbono.diviza = Number((this.editingAbono.diferencia / tasa).toFixed(2));
    } else {
      this.editingAbono.diviza = 0;
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
        next: () => {
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
    return new Date(fecha).toLocaleDateString('es-VE');
  }

  generarReportePdf() {
    const datos = this.getAbonosFiltrados();
    if (datos.length === 0) {
      alert('No hay datos para generar el reporte');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setTextColor(29, 99, 193);
    doc.text('Reporte de Abonos Polar', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Total registros: ${datos.length}`, pageWidth / 2, 34, { align: 'center' });

    const plantaFiltro = this.filtros().planta;
    if (plantaFiltro) {
      doc.text(`Planta: ${plantaFiltro}`, pageWidth / 2, 40, { align: 'center' });
    }

    const tableData = datos.map((a) => [
      this.formatFecha(a.fecha),
      a.nombre,
      a.planta,
      a.cedula,
      a.telefono,
      a.nFact,
      a.montoFactura.toFixed(2),
      a.iva.toFixed(2),
      a.diferencia.toFixed(2),
      a.tasa.toFixed(2),
      a.diviza?.toFixed(2) || '0.00',
      a.status,
    ]);

    autoTable(doc, {
      startY: plantaFiltro ? 46 : 40,
      head: [['Fecha', 'Nombre', 'Planta', 'Cédula', 'Teléfono', 'N. Fact', 'Monto Factura', 'IVA', 'Diferencia', 'Tasa', 'Diviza', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [29, 99, 193], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      styles: { cellPadding: 2, fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
        4: { cellWidth: 22 },
        5: { cellWidth: 18 },
        6: { cellWidth: 22 },
        7: { cellWidth: 15 },
        8: { cellWidth: 20 },
        9: { cellWidth: 15 },
        10: { cellWidth: 18 },
        11: { cellWidth: 20 },
      },
    });

    doc.save(`abonos_polar_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  async generarReporteExcel() {
    const datos = this.getAbonosFiltrados();
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
