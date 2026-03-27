import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import * as ExcelJS from 'exceljs';

interface FilaVenta {
  fecha: string;
  total: number;
  [key: string]: any;
}

interface FilaTasa {
  fecha: string;
  tasa: number;
}

interface FilaResultado {
  fecha: string;
  totalOriginal: number;
  tasa: number;
  totalConvertido: number;
  columnasExtra: { [key: string]: any };
}

@Component({
  selector: 'app-conversion',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './conversion.html',
  styleUrl: './conversion.css',
})
export class Conversion {
  ventasFile = signal<any[][] | null>(null);
  tasasFile = signal<any[][] | null>(null);
  ventasNombre = signal('');
  tasasNombre = signal('');

  ventasData = signal<FilaVenta[]>([]);
  tasasData = signal<FilaTasa[]>([]);
  resultados = signal<FilaResultado[]>([]);

  ventasColumnas = signal<string[]>([]);
  tasasColumnas = signal<string[]>([]);

  columnaFechaVentas = signal('');
  columnaTotalVentas = signal('');
  columnaFechaTasas = signal('');
  columnaTasaTasas = signal('');

  ventasPreview = signal<any[][]>([]);
  tasasPreview = signal<any[][]>([]);

  procesando = signal(false);
  error = signal('');

  totalOriginal = signal(0);
  totalConvertido = signal(0);

  onFileSelect(event: Event, tipo: 'ventas' | 'tasas') {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      this.parseCSV(file, tipo);
    } else if (ext === 'xlsx' || ext === 'xls') {
      this.parseExcel(file, tipo);
    } else {
      this.error.set('Formato no soportado. Use CSV o Excel (.xlsx)');
    }
  }

  private parseCSV(file: File, tipo: 'ventas' | 'tasas') {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        this.error.set('El archivo CSV debe tener al menos una fila de encabezado y una de datos');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows: any[][] = [headers];

      for (let i = 1; i < lines.length; i++) {
        const cols = this.parseCSVLine(lines[i]);
        rows.push(cols);
      }

      this.asignarDatos(tipo, file.name, headers, rows);
    };
    reader.readAsText(file);
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  private parseExcel(file: File, tipo: 'ventas' | 'tasas') {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          this.error.set('El archivo Excel no tiene hojas');
          return;
        }

        const rows: any[][] = [];
        worksheet.eachRow((row) => {
          const rowData: any[] = [];
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            let value = cell.value;
            if (value instanceof Date) {
              value = value.toISOString().split('T')[0];
            } else if (typeof value === 'object' && value !== null) {
              value = (value as any).result ?? (value as any).text ?? String(value);
            }
            rowData.push(value ?? '');
          });
          rows.push(rowData);
        });

        if (rows.length < 2) {
          this.error.set('El archivo Excel debe tener al menos encabezado y una fila de datos');
          return;
        }

        const headers = rows[0].map(h => String(h).trim());
        this.asignarDatos(tipo, file.name, headers, rows);
      } catch (err) {
        console.error('Error parsing Excel:', err);
        this.error.set('Error al leer el archivo Excel');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  private asignarDatos(tipo: 'ventas' | 'tasas', nombre: string, headers: string[], rows: any[][]) {
    this.error.set('');

    if (tipo === 'ventas') {
      this.ventasFile.set(rows as any);
      this.ventasNombre.set(nombre);
      this.ventasColumnas.set(headers);
      this.ventasPreview.set(rows.slice(0, 6));

      const colFecha = headers.find(h =>
        h.toLowerCase().includes('fecha') || h.toLowerCase().includes('date')
      );
      const colTotal = headers.find(h =>
        h.toLowerCase().includes('total') || h.toLowerCase().includes('monto') || h.toLowerCase().includes('amount')
      );
      if (colFecha) this.columnaFechaVentas.set(colFecha);
      if (colTotal) this.columnaTotalVentas.set(colTotal);
    } else {
      this.tasasFile.set(rows as any);
      this.tasasNombre.set(nombre);
      this.tasasColumnas.set(headers);
      this.tasasPreview.set(rows.slice(0, 6));

      const colFecha = headers.find(h =>
        h.toLowerCase().includes('fecha') || h.toLowerCase().includes('date')
      );
      const colTasa = headers.find(h =>
        h.toLowerCase().includes('tasa') || h.toLowerCase().includes('rate') || h.toLowerCase().includes('valor')
      );
      if (colFecha) this.columnaFechaTasas.set(colFecha);
      if (colTasa) this.columnaTasaTasas.set(colTasa);
    }
  }

  procesar() {
    if (!this.columnaFechaVentas() || !this.columnaTotalVentas() ||
        !this.columnaFechaTasas() || !this.columnaTasaTasas()) {
      this.error.set('Debe seleccionar las columnas de fecha y total/tasa para ambos archivos');
      return;
    }

    this.procesando.set(true);
    this.error.set('');

    try {
      const ventasRows = this.ventasFile() as any[][];
      const tasasRows = this.tasasFile() as any[][];

      if (!ventasRows || !tasasRows) {
        this.error.set('Debe cargar ambos archivos');
        this.procesando.set(false);
        return;
      }

      const ventasHeaders = ventasRows[0];
      const tasasHeaders = tasasRows[0];

      const idxFechaV = ventasHeaders.indexOf(this.columnaFechaVentas());
      const idxTotalV = ventasHeaders.indexOf(this.columnaTotalVentas());
      const idxFechaT = tasasHeaders.indexOf(this.columnaFechaTasas());
      const idxTasaT = tasasHeaders.indexOf(this.columnaTasaTasas());

      if (idxFechaV < 0 || idxTotalV < 0 || idxFechaT < 0 || idxTasaT < 0) {
        this.error.set('No se encontraron las columnas seleccionadas');
        this.procesando.set(false);
        return;
      }

      const tasaMap = new Map<string, number>();
      for (let i = 1; i < tasasRows.length; i++) {
        const fecha = this.normalizarFecha(tasasRows[i][idxFechaT]);
        const tasa = this.parseNumber(tasasRows[i][idxTasaT]);
        if (fecha && tasa > 0) {
          tasaMap.set(fecha, tasa);
        }
      }

      const resultados: FilaResultado[] = [];
      let totalOrig = 0;
      let totalConv = 0;

      for (let i = 1; i < ventasRows.length; i++) {
        const row = ventasRows[i];
        const fecha = this.normalizarFecha(row[idxFechaV]);
        const total = this.parseNumber(row[idxTotalV]);

        if (!fecha) continue;

        const tasa = tasaMap.get(fecha) || 0;
        const totalConvertido = tasa > 0 ? total * tasa : 0;

        const columnasExtra: { [key: string]: any } = {};
        ventasHeaders.forEach((h: string, idx: number) => {
          if (idx !== idxFechaV && idx !== idxTotalV) {
            columnasExtra[h] = row[idx];
          }
        });

        resultados.push({
          fecha,
          totalOriginal: total,
          tasa,
          totalConvertido,
          columnasExtra
        });

        totalOrig += total;
        totalConv += totalConvertido;
      }

      this.resultados.set(resultados);
      this.totalOriginal.set(Math.round(totalOrig * 100) / 100);
      this.totalConvertido.set(Math.round(totalConv * 100) / 100);
    } catch (err) {
      console.error('Error procesando:', err);
      this.error.set('Error al procesar los archivos');
    } finally {
      this.procesando.set(false);
    }
  }

  private normalizarFecha(valor: any): string {
    if (!valor) return '';
    if (valor instanceof Date) {
      return valor.toISOString().split('T')[0];
    }
    const str = String(valor).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.substring(0, 10);
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
      const parts = str.split('/');
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].substring(0, 4);
      return `${year}-${month}-${day}`;
    }
    if (/^\d{1,2}-\d{1,2}-\d{4}/.test(str)) {
      const parts = str.split('-');
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].substring(0, 4);
      return `${year}-${month}-${day}`;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return str;
  }

  private parseNumber(valor: any): number {
    if (typeof valor === 'number') return valor;
    if (!valor) return 0;
    const str = String(valor).replace(/[^\d.,-]/g, '');
    if (str.includes(',') && str.includes('.')) {
      return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    }
    if (str.includes(',')) {
      return parseFloat(str.replace(',', '.')) || 0;
    }
    return parseFloat(str) || 0;
  }

  getColumnasExtra(): string[] {
    const resultados = this.resultados();
    if (resultados.length === 0) return [];
    return Object.keys(resultados[0].columnasExtra);
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
  }

  exportarResultados() {
    if (this.resultados().length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Conversión');

    const columnasExtra = this.getColumnasExtra();
    const headers = ['Fecha', ...columnasExtra, 'Total Original ($)', 'Tasa', 'Total Convertido (Bs)'];

    worksheet.addRow(headers);
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D63C1' } };

    for (const r of this.resultados()) {
      const row = [
        r.fecha,
        ...columnasExtra.map(c => r.columnasExtra[c] ?? ''),
        r.totalOriginal,
        r.tasa,
        r.totalConvertido
      ];
      worksheet.addRow(row);
    }

    const totalRow = worksheet.addRow([
      'TOTALES',
      ...columnasExtra.map(() => ''),
      this.totalOriginal(),
      '',
      this.totalConvertido()
    ]);
    totalRow.font = { bold: true };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };

    worksheet.columns.forEach(col => {
      col.width = 18;
    });

    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'conversion-tasas.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  limpiar() {
    this.ventasFile.set(null);
    this.tasasFile.set(null);
    this.ventasNombre.set('');
    this.tasasNombre.set('');
    this.ventasData.set([]);
    this.tasasData.set([]);
    this.resultados.set([]);
    this.ventasColumnas.set([]);
    this.tasasColumnas.set([]);
    this.columnaFechaVentas.set('');
    this.columnaTotalVentas.set('');
    this.columnaFechaTasas.set('');
    this.columnaTasaTasas.set('');
    this.ventasPreview.set([]);
    this.tasasPreview.set([]);
    this.error.set('');
    this.totalOriginal.set(0);
    this.totalConvertido.set(0);
  }
}
