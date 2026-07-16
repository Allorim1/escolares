import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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
  iva?: number;
  diferencia?: number;
  tasa?: number;
  divisa?: number;
  status: string;
}

interface Empresa {
  _id?: string;
  nombre: string;
  plantas: string[];
}

@Component({
  selector: 'app-abonos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './abonos.html',
  styleUrl: './abonos.css',
})
export class Abonos implements OnInit {
  private http = inject(HttpClient);

  private readonly API = '/api/abonos-polar';
  private readonly API_EMPRESAS = '/api/empresas';

  abonos = signal<Abono[]>([]);
  empresas = signal<Empresa[]>([]);
  plantasFiltradas = computed(() => {
    const empresaNombre = this.selectedEmpresaInModal() || this.filtros().empresa;
    if (!empresaNombre) return [];
    const empresa = this.empresas().find((e) => e.nombre === empresaNombre);
    return empresa?.plantas || [];
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
  empresasCargadas = signal(false);

  showModal = signal(false);
  editingAbono: Abono | null = null;
  selectedEmpresaInModal = signal('');

  showModalColumnas = signal(false);
  columnasDisponibles = [
    { key: 'fecha', label: 'Fecha' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'empresa', label: 'Empresa' },
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
  columnasSeleccionadas = signal<Set<string>>(new Set(this.columnasDisponibles.map((c) => c.key)));

  filtros = signal({
    empresa: '',
    planta: '',
    fechaDesde: '',
    fechaHasta: '',
  });

  ngOnInit() {
    this.loadAbonos(true);
    this.cargarEmpresasYSetear();
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

  private cargarEmpresasYSetear(empresaNombre?: string) {
    this.http.get<Empresa[]>(this.API_EMPRESAS).subscribe({
      next: (data) => {
        this.empresas.set(data);
        this.empresasCargadas.set(true);
        if (empresaNombre) {
          this.selectedEmpresaInModal.set(empresaNombre);
        }
      },
      error: (err) => console.error('Error loading empresas:', err),
    });
  }

  onEmpresaFilterChange(empresa: string) {
    this.filtros.update((f) => ({ ...f, empresa, planta: '' }));
  }

  onEmpresaChange() {
    this.filtros.update((f) => ({ ...f, planta: '' }));
  }

  onPlantaFilterChange(planta: string) {
    this.filtros.update((f) => ({ ...f, planta }));
  }

  onFechaDesdeChange(fecha: string) {
    this.filtros.update((f) => ({ ...f, fechaDesde: fecha }));
  }

  onFechaHastaChange(fecha: string) {
    this.filtros.update((f) => ({ ...f, fechaHasta: fecha }));
  }

  abrirModalColumnas() {
    this.showModalColumnas.set(true);
  }

  cerrarModalColumnas() {
    this.showModalColumnas.set(false);
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
            fecha: abonoActualizado.fecha ? new Date(abonoActualizado.fecha).toISOString().split('T')[0] : '',
            empresa: abonoActualizado.empresa || '',
            montoFactura: abonoActualizado.montoFactura ?? 0,
            iva: abonoActualizado.iva ?? 0,
            diferencia: abonoActualizado.diferencia ?? 0,
            tasa: abonoActualizado.tasa ?? 0,
            divisa: abonoActualizado.divisa ?? 0,
          };
          this.cargarEmpresasYSetear(abonoActualizado.empresa);
          this.calcularDerivados();
          this.showModal.set(true);
        },
        error: () => {
          this.editingAbono = {
            ...abono,
            fecha: abono.fecha ? new Date(abono.fecha).toISOString().split('T')[0] : '',
            empresa: abono.empresa || '',
            montoFactura: abono.montoFactura ?? 0,
            iva: abono.iva ?? 0,
            diferencia: abono.diferencia ?? 0,
            tasa: abono.tasa ?? 0,
            divisa: abono.divisa ?? 0,
          };
          this.cargarEmpresasYSetear(abono.empresa);
          this.calcularDerivados();
          this.showModal.set(true);
        },
      });
    } else {
      this.editingAbono = {
        fecha: new Date().toISOString().split('T')[0],
        nombre: '',
        empresa: '',
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
      this.cargarEmpresasYSetear('');
      this.showModal.set(true);
    }
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

    if (this.editingAbono._id) {
      this.http.put<Abono>(`${this.API}/${this.editingAbono._id}`, this.editingAbono).subscribe({
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
        },
        error: (err) => {
          console.error('Error updating abono:', err);
          this.saving.set(false);
          this.loadAbonos(true);
        },
      });
    } else {
      this.http.post<Abono>(this.API, this.editingAbono).subscribe({
        next: (abonoCreado) => {
          this.saving.set(false);
          if (abonoCreado && abonoCreado._id) {
            this.abonos.update((lista) => [abonoCreado, ...lista].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
          } else {
            this.loadAbonos(true);
          }
          this.cerrarModal();
        },
        error: (err) => {
          console.error('Error creating abono:', err);
          this.saving.set(false);
          this.loadAbonos(true);
        },
      });
    }
  }

  eliminarAbono(id: string) {
    if (!confirm('¿Está seguro de eliminar este abono?')) return;
    this.http.delete(`${this.API}/${id}`).subscribe({
      next: () => this.loadAbonos(true),
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

    const columnas = this.columnasDisponibles.filter((c) => this.columnasSeleccionadas().has(c.key));
    if (columnas.length === 0) {
      alert('Seleccione al menos una columna');
      return;
    }

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
    const titulo = empresaSeleccionada ? `REPORTE DE PAGOS ${empresaSeleccionada}` : 'REPORTE DE PAGOS';

    doc.setFontSize(16);
    doc.setTextColor(0, 51, 111);
    doc.text(titulo, pageWidth / 2, offsetY, { align: 'center' });

    const plantaFiltro = this.filtros().planta;
    const infoY = offsetY + 10;
    let headerHeight: number;

    if (plantaFiltro) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Planta: ${plantaFiltro}`, 18, infoY, { align: 'left' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`, pageWidth - 18, infoY, { align: 'right' });
      doc.text(`Total registros: ${datos.length}`, pageWidth - 18, infoY + 6, { align: 'right' });
      headerHeight = infoY + 14;
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
        if (c.key === 'montoFactura' || c.key === 'iva' || c.key === 'diferencia' || c.key === 'tasa') return `Bs ${(a as any)[c.key].toFixed(2)}`;
        if (c.key === 'divisa') return `$ ${(a as any)[c.key]?.toFixed(2) || '0.00'}`;
        return (a as any)[c.key] ?? '';
      });
    });

    const marginBottom = 18;
    const rowHeight = 7;
    const maxRows = Math.floor((pageHeight - headerHeight - marginBottom) / rowHeight);

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

    const fileName = empresaSeleccionada
      ? `abonos_${empresaSeleccionada.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      : `abonos_${new Date().toISOString().split('T')[0]}.pdf`;

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
      { width: 15 },
      { width: 18 },
      { width: 15 },
      { width: 18 },
      { width: 18 },
    ];

    const headerRow = worksheet.addRow(['Fecha', 'Nombre', 'Empresa', 'Planta', 'Cédula', 'Teléfono', 'N. Fact', 'Monto Factura', 'IVA', 'Diferencia', 'Tasa', 'Divisa', 'Status']);
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
        a.cedula,
        a.telefono,
        a.nFact,
        a.montoFactura,
        a.iva,
        a.diferencia,
        a.tasa,
        a.divisa ?? 0,
        a.status,
      ]);
      row.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = empresaSeleccionada
      ? `abonos_${empresaSeleccionada.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
      : `abonos_${new Date().toISOString().split('T')[0]}.xlsx`;

    saveAs(new Blob([buffer]), fileName);
  }
}
