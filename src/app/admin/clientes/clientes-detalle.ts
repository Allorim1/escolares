import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { EmpresasService } from '../../shared/data-access/empresas.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Cliente {
  _id?: string;
  nombre: string;
  plantas: string[];
}

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
  divisaFactura?: number;
  status: string;
}

@Component({
  selector: 'app-clientes-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clientes-detalle.html',
  styleUrl: './clientes-detalle.css',
})
export class ClientesDetalle implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private readonly API = '/api/empresas';
  private readonly API_ABONOS = '/api/abonos-polar';
  private empresasService = inject(EmpresasService);

  cliente = signal<Cliente | null>(null);
  clienteId = signal('');
  loading = signal(false);
  saving = signal(false);
  nuevaPlanta = signal('');
  detalleTab = signal(false);
  loadError = signal<string | null>(null);

  showModalAbono = signal(false);
  editingAbono: Abono | null = null;
  abonos = signal<Abono[]>([]);
  abonosLoading = signal(false);

  relFiltroPlanta = signal('');
  relFiltroDesde = signal('');
  relFiltroHasta = signal('');

  showModalColumnas = signal(false);
  columnasDisponibles = [
    { key: 'fecha', label: 'Fecha' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'planta', label: 'Planta' },
    { key: 'nFact', label: 'N. Fact' },
    { key: 'montoFactura', label: 'Monto Factura' },
    { key: 'iva', label: 'IVA' },
    { key: 'diferencia', label: 'Diferencia' },
    { key: 'tasa', label: 'Tasa' },
    { key: 'divisa', label: 'Divisa' },
    { key: 'divisaFactura', label: 'Divisa Factura' },
    { key: 'status', label: 'Status' },
  ];
  columnasSeleccionadas = signal<Set<string>>(new Set(this.columnasDisponibles.map((c) => c.key)));

  plantasCliente = computed(() => {
    return this.cliente()?.plantas ?? [];
  });

  relacionesFiltradas = computed(() => {
    if (!this.cliente()) return [];
    const nombre = this.cliente()!.nombre;
    const planta = this.relFiltroPlanta();
    const desde = this.relFiltroDesde();
    const hasta = this.relFiltroHasta();

    return this.abonos().filter(a => {
      if (a.empresa !== nombre) return false;
      if (planta && a.planta !== planta) return false;
      if (desde && new Date(a.fecha) < new Date(desde)) return false;
      if (hasta && new Date(a.fecha) > new Date(hasta + 'T23:59:59')) return false;
      return true;
    });
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.clienteId.set(id);
      this.loadCliente(id);
      this.cargarAbonos(id);
    }
  }

  loadCliente(id: string) {
    this.loading.set(true);
    this.loadError.set(null);
    this.http.get<Cliente>(`${this.API}/${id}`).subscribe({
      next: (data) => {
        this.cliente.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading cliente:', err);
        this.loadError.set('No se pudo cargar la información del cliente.');
        this.loading.set(false);
      },
    });
  }

  cargarAbonos(id: string) {
    this.abonosLoading.set(true);
    this.http.get<Abono[]>(this.API_ABONOS).subscribe({
      next: (data) => {
        this.abonos.set(data);
        this.abonosLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading abonos:', err);
        this.abonos.set([]);
        this.abonosLoading.set(false);
      },
    });
  }

  volver() {
    this.router.navigate(['/admin/clientes']);
  }

  agregarPlanta() {
    if (!this.cliente()) return;
    const planta = this.nuevaPlanta().trim();
    if (!planta) return;
    if (this.cliente()!.plantas.includes(planta)) return;
    this.cliente.update(e => e ? { ...e, plantas: [...e.plantas, planta] } : e);
    this.nuevaPlanta.set('');
  }

  eliminarPlanta(planta: string) {
    if (!this.cliente()) return;
    this.cliente.update(e => e ? { ...e, plantas: e.plantas.filter(p => p !== planta) } : e);
  }

  actualizarNombre(valor: string) {
    if (!this.cliente()) return;
    this.cliente.update(e => e ? { ...e, nombre: valor } : e);
  }

  guardarCliente() {
    if (!this.cliente() || !this.cliente()!._id) return;
    if (!this.cliente()!.nombre.trim()) {
      alert('El nombre del cliente es requerido');
      return;
    }

    this.saving.set(true);
    this.http.put(`${this.API}/${this.cliente()!._id}`, this.cliente()).subscribe({
      next: () => {
        this.saving.set(false);
        this.loadCliente(this.cliente()!._id!);
        this.empresasService.load();
      },
      error: (err) => {
        console.error('Error updating cliente:', err);
        this.saving.set(false);
      },
    });
  }

  abrirModalAbono(abono?: Abono) {
    if (!this.cliente()) return;
    if (abono) {
      this.editingAbono = {
        ...abono,
        fecha: abono.fecha ? new Date(abono.fecha).toISOString().split('T')[0] : '',
        montoFactura: abono.montoFactura ?? 0,
        iva: abono.iva ?? 0,
        diferencia: abono.diferencia ?? 0,
        tasa: abono.tasa ?? 0,
        divisa: abono.divisa ?? 0,
      };
    } else {
      this.editingAbono = {
        fecha: new Date().toISOString().split('T')[0],
        nombre: '',
        empresa: this.cliente()!.nombre,
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
    this.showModalAbono.set(true);
  }

  cerrarModalAbono() {
    this.showModalAbono.set(false);
    this.editingAbono = null;
  }

  guardarAbono() {
    if (!this.editingAbono) return;
    if (!this.editingAbono.nombre.trim() || !this.editingAbono.empresa || !this.editingAbono.planta || !this.editingAbono.nFact) {
      alert('Por favor, complete los campos requeridos: Nombre, Empresa, Planta y N. Fact');
      return;
    }

    this.saving.set(true);
    if (this.editingAbono._id) {
      this.http.put<Abono>(`${this.API_ABONOS}/${this.editingAbono._id}`, this.editingAbono).subscribe({
        next: (abonoActualizado) => {
          this.saving.set(false);
          this.cerrarModalAbono();
          if (abonoActualizado && abonoActualizado._id) {
            this.abonos.update((lista) => {
              const index = lista.findIndex((a) => a._id === abonoActualizado._id);
              if (index >= 0) {
                lista[index] = abonoActualizado;
              } else {
                lista.unshift(abonoActualizado);
              }
              return [...lista];
            });
          } else if (this.clienteId()) {
            this.cargarAbonos(this.clienteId());
          }
        },
        error: (err) => {
          console.error('Error updating abono:', err);
          this.saving.set(false);
          if (this.clienteId()) this.cargarAbonos(this.clienteId());
        },
      });
    } else {
      this.http.post<Abono>(this.API_ABONOS, this.editingAbono).subscribe({
        next: (abonoCreado) => {
          this.saving.set(false);
          this.cerrarModalAbono();
          if (abonoCreado && abonoCreado._id) {
            this.abonos.update((lista) => [abonoCreado, ...lista]);
          } else if (this.clienteId()) {
            this.cargarAbonos(this.clienteId());
          }
        },
        error: (err) => {
          console.error('Error creating abono:', err);
          this.saving.set(false);
          if (this.clienteId()) this.cargarAbonos(this.clienteId());
        },
      });
    }
  }

  eliminarAbono(id: string) {
    if (!confirm('¿Está seguro de eliminar esta relación?')) return;
    this.http.delete(`${this.API_ABONOS}/${id}`).subscribe({
      next: () => {
        if (this.clienteId()) this.cargarAbonos(this.clienteId());
      },
      error: (err) => console.error('Error deleting abono:', err),
    });
  }

  formatearMontoInput(valor: number | undefined | null): string {
    const num = Number(valor) || 0;
    return num.toFixed(2).replace('.', ',');
  }

  parsearMontoInput(valor: string): number {
    const limpio = valor.replace(',', '.').replace(/\D/g, '');
    const numero = Number(limpio) || 0;
    return Number((numero / 100).toFixed(2));
  }

  onMontoFocus(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  actualizarMonto(event: Event, campo: 'montoFactura' | 'iva' | 'diferencia' | 'tasa' | 'divisa') {
    if (!this.editingAbono) return;
    const input = event.target as HTMLInputElement;
    const valor = this.parsearMontoInput(input.value);
    (this.editingAbono as any)[campo] = valor;
    input.value = this.formatearMontoInput(valor);

    if (campo === 'montoFactura' || campo === 'iva') {
      this.calcularDerivados();
    } else if (campo === 'tasa') {
      this.calcularDivisa();
    }
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

  formatFecha(fecha: string): string {
    const date = new Date(fecha);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const anio = date.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  formatMonto(monto: number): string {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
    }).format(monto);
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
    const datos = this.relacionesFiltradas();
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

    const titulo = 'REPORTE DE PAGOS';

    doc.setFontSize(16);
    doc.setTextColor(0, 51, 111);
    doc.text(titulo, pageWidth / 2, offsetY, { align: 'center' });

    const plantaFiltro = this.relFiltroPlanta();
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
        if (c.key === 'divisaFactura') {
          const mf = (a as any).montoFactura;
          const t = (a as any).tasa;
          return t > 0 ? `$ ${(mf / t).toFixed(2)}` : '$ 0.00';
        }
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

    const fileName = `abonos_${this.cliente()?.nombre?.replace(/\s+/g, '_') || 'cliente'}_${new Date().toISOString().split('T')[0]}.pdf`;

    doc.save(fileName);
  }

  async generarReporteExcel() {
    const datos = this.relacionesFiltradas();
    if (datos.length === 0) {
      alert('No hay datos para generar el reporte');
      return;
    }

    const columnas = this.columnasDisponibles.filter((c) => this.columnasSeleccionadas().has(c.key));
    if (columnas.length === 0) {
      alert('Seleccione al menos una columna');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheetName = `Abonos ${this.cliente()?.nombre || 'Cliente'}`;
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columnas.map(() => ({ width: 18 }));

    const headerRow = worksheet.addRow(columnas.map((c) => c.label));
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D63C1' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    datos.forEach((a: Abono) => {
      const row = worksheet.addRow(
        columnas.map((c) => {
          if (c.key === 'fecha') return this.formatFecha(a.fecha);
          if (c.key === 'montoFactura' || c.key === 'iva' || c.key === 'diferencia') return a[c.key as keyof Abono] ?? 0;
          if (c.key === 'tasa') return a.tasa?.toFixed(2) ?? '0.00';
          if (c.key === 'divisa') return a.divisa?.toFixed(2) ?? '0.00';
          if (c.key === 'divisaFactura') return a.tasa && a.montoFactura ? Number((a.montoFactura / a.tasa).toFixed(2)) : 0;
          return (a as any)[c.key] ?? '';
        })
      );
      row.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `abonos_${this.cliente()?.nombre?.replace(/\s+/g, '_') || 'cliente'}_${new Date().toISOString().split('T')[0]}.xlsx`;

    saveAs(new Blob([buffer]), fileName);
  }
}
