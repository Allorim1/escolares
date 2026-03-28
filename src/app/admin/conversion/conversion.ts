import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

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
  ventasNombre = signal('');
  tasasNombre = signal('');

  ventasColumnas = signal<string[]>([]);
  tasasColumnas = signal<string[]>([]);
  tasasFilas = signal<any[][]>([]);

  columnaFechaVentas = signal('');
  columnaTotalVentas = signal('');

  ventasRaw = signal<any[][]>([]);
  tasasMap = signal<Map<string, number>>(new Map());

  ventasPreview = signal<any[][]>([]);
  tasasPreview = signal<any[][]>([]);

  resultados = signal<FilaResultado[]>([]);
  procesando = signal(false);
  error = signal('');

  totalOriginal = signal(0);
  totalConvertido = signal(0);

  onFileVentas(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const ext = file.name.split('.').pop()?.toLowerCase();

    this.error.set('');
    if (ext === 'csv') {
      this.parseCSVVentas(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      this.parseExcelVentas(file);
    } else {
      this.error.set('Formato no soportado. Use CSV o Excel (.xlsx)');
    }
  }

  onFileTasas(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const ext = file.name.split('.').pop()?.toLowerCase();

    this.error.set('');
    if (ext === 'csv') {
      this.parseCSVTasas(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      this.parseExcelTasas(file);
    } else {
      this.error.set('Formato no soportado. Use CSV o Excel (.xlsx)');
    }
  }

  private parseCSVVentas(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        this.error.set('El archivo CSV debe tener encabezado y datos');
        return;
      }
      
      // Parsear todas las líneas
      const allRows: any[][] = [];
      for (let i = 0; i < lines.length; i++) {
        allRows.push(this.parseCSVLine(lines[i]));
      }

      // Detectar estructura del archivo
      // Buscar la fila que contiene los encabezados reales (FECHA, DIA, VENTAS, GASTOS, TOTAL)
      let headerRowIndex = -1;
      let fechaColIdx = -1;
      let totalColIdx = -1;
      let ventasColIdx = -1;

      for (let i = 0; i < allRows.length; i++) {
        const row = allRows[i];
        for (let j = 0; j < row.length; j++) {
          const cell = String(row[j]).trim().toUpperCase();
          if (cell === 'FECHA') {
            headerRowIndex = i;
            fechaColIdx = j;
          }
          if (cell === 'TOTAL' && headerRowIndex === i) {
            totalColIdx = j;
          }
          if (cell === 'VENTAS' && headerRowIndex === i) {
            ventasColIdx = j;
          }
        }
        if (headerRowIndex >= 0) break;
      }

      // Si no se encontraron encabezados específicos, usar los índices por defecto
      // Basado en la estructura observada: FECHA=6, VENTAS=8, TOTAL=10
      // Los datos reales están en: fecha=12, ventas=14, total=16
      if (headerRowIndex < 0) {
        headerRowIndex = 0;
        fechaColIdx = 6;
        ventasColIdx = 8;
        totalColIdx = 10;
      }

      // Crear encabezados simplificados
      const headers = ['FECHA', 'DIA', 'VENTAS', 'GASTOS', 'TOTAL'];
      
      // Extraer solo los datos relevantes
      const dataRows: any[][] = [headers];
      
      for (let i = 0; i < allRows.length; i++) {
        const row = allRows[i];
        if (row.length < 17) continue; // Saltar filas incompletas
        
        // Los datos reales están en las posiciones 12-16
        const fecha = row[12];
        const dia = row[13];
        const ventas = row[14];
        const gastos = row[15];
        const total = row[16];
        
        // Verificar que hay datos válidos
        if (fecha && ventas && total) {
          dataRows.push([fecha, dia, ventas, gastos, total]);
        }
      }

      if (dataRows.length < 2) {
        this.error.set('No se encontraron datos de ventas válidos en el archivo');
        return;
      }

      this.ventasRaw.set(dataRows);
      this.ventasColumnas.set(headers);
      this.ventasNombre.set(file.name);
      this.ventasPreview.set(dataRows.slice(0, 6));

      // Configurar columnas automáticamente
      this.columnaFechaVentas.set('FECHA');
      this.columnaTotalVentas.set('TOTAL');
    };
    reader.readAsText(file);
  }

  private parseCSVTasas(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        this.error.set('El archivo CSV de tasas debe tener encabezado y datos');
        return;
      }
      const headers = this.parseCSVLine(lines[0]);
      const rows: any[][] = [headers];
      for (let i = 1; i < lines.length; i++) {
        rows.push(this.parseCSVLine(lines[i]));
      }
      this.tasasFilas.set(rows);
      this.tasasColumnas.set(headers);
      this.tasasNombre.set(file.name);
      this.tasasPreview.set(rows.slice(0, 6));
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
      } else if ((char === ',' || char === ';' || char === '\t') && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  private parseExcelVentas(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const fileName = file.name.toLowerCase();
        let rows: any[][] = [];

        // Verificar por extensión PRIMERO
        const isXlsByExtension = fileName.endsWith('.xls') && !fileName.endsWith('.xlsx');

        if (isXlsByExtension) {
          // Archivo .xls - usar librería xlsx
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            this.error.set('El archivo Excel no tiene hojas');
            return;
          }
          const worksheet = workbook.Sheets[sheetName];
          rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true }) as any[][];
        } else {
          // Archivo .xlsx - usar ExcelJS
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);

          const worksheet = workbook.worksheets[0];
          if (!worksheet) {
            this.error.set('El archivo Excel no tiene hojas');
            return;
          }

          worksheet.eachRow((row) => {
            const rowData: any[] = [];
            row.eachCell({ includeEmpty: true }, (cell) => {
              let value = cell.value;
              if (value instanceof Date && !isNaN(value.getTime())) {
                const y = value.getFullYear();
                const m = String(value.getMonth() + 1).padStart(2, '0');
                const d = String(value.getDate()).padStart(2, '0');
                value = `${y}-${m}-${d}`;
              } else if (typeof value === 'object' && value !== null) {
                value = (value as any).result ?? (value as any).text ?? String(value);
              }
              rowData.push(value ?? '');
            });
            rows.push(rowData);
          });
        }

        if (rows.length < 2) {
          this.error.set('El archivo Excel debe tener encabezado y datos');
          return;
        }

        const headers = rows[0].map(h => String(h).trim());
        this.ventasRaw.set(rows);
        this.ventasColumnas.set(headers);
        this.ventasNombre.set(file.name);
        this.ventasPreview.set(rows.slice(0, 6));

        const colFecha = headers.find(h =>
          h.toLowerCase().includes('fecha') || h.toLowerCase().includes('date')
        );
        const colTotal = headers.find(h =>
          h.toLowerCase().includes('total') || h.toLowerCase().includes('monto') || h.toLowerCase().includes('amount')
        );
        if (colFecha) this.columnaFechaVentas.set(colFecha);
        if (colTotal) this.columnaTotalVentas.set(colTotal);
      } catch (err) {
        console.error('Error parsing Excel ventas:', err);
        this.error.set('Error al leer el archivo Excel de ventas: ' + (err as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  private parseExcelTasas(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const fileName = file.name.toLowerCase();
        const mapaTasas = new Map<string, number>();

        console.log('Parsing tasas file:', fileName, 'size:', buffer.byteLength);

        // Verificar por extensión PRIMERO (más confiable)
        const isXlsByExtension = fileName.endsWith('.xls') && !fileName.endsWith('.xlsx');

        console.log('Is .xls by extension:', isXlsByExtension);

        if (isXlsByExtension) {
          // Archivo .xls - usar librería xlsx (SheetJS)
          console.log('Using xlsx library for .xls file');
          const workbook = XLSX.read(buffer, { type: 'array' });
          console.log('Sheets found:', workbook.SheetNames.length, workbook.SheetNames);

          workbook.SheetNames.forEach((sheetName, idx) => {
            const fecha = this.normalizarFecha(sheetName.trim());
            console.log(`Sheet ${idx}: "${sheetName}" -> fecha normalizada: "${fecha}"`);
            
            if (!fecha) {
              console.log('  -> Skipping sheet (not a date):', sheetName);
              return;
            }

            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true }) as any[][];
            console.log('  -> Rows:', jsonData.length);

            // Log de las primeras filas para entender estructura
            for (let i = 0; i < Math.min(5, jsonData.length); i++) {
              console.log(`  Row ${i}:`, jsonData[i]);
            }

            // Buscar columna COMPRA (BID) en cualquier fila
            let compraColIdx = -1;
            let headerRowIdx = -1;

            for (let r = 0; r < Math.min(10, jsonData.length); r++) {
              const row = jsonData[r];
              if (!row) continue;
              for (let c = 0; c < row.length; c++) {
                const cell = String(row[c] ?? '').toLowerCase().trim();
                if (cell.includes('compra') || cell.includes('bid')) {
                  compraColIdx = c;
                  headerRowIdx = r;
                  console.log(`  -> Found COMPRA/BID at row ${r}, col ${c}: "${row[c]}"`);
                }
              }
              if (compraColIdx >= 0) break;
            }

            // Buscar fila con USD en cualquier columna
            let usdRowIdx = -1;
            let usdColIdx = 0;

            for (let r = 0; r < jsonData.length; r++) {
              const row = jsonData[r];
              if (!row) continue;
              for (let c = 0; c < row.length; c++) {
                const cell = String(row[c] ?? '').toLowerCase().trim();
                if (cell === 'usd' || cell === 'dolar' || cell === 'dólar' || cell === '$') {
                  usdRowIdx = r;
                  usdColIdx = c;
                  console.log(`  -> Found USD at row ${r}, col ${c}: "${row[c]}"`);
                  break;
                }
              }
              if (usdRowIdx >= 0) break;
            }

            // Extraer la tasa USD
            if (usdRowIdx >= 0) {
              const usdRow = jsonData[usdRowIdx];
              let tasaValue = 0;

              if (compraColIdx >= 0 && compraColIdx < usdRow.length) {
                tasaValue = this.parseNumber(usdRow[compraColIdx]);
                console.log(`  -> USD rate from COMPRA col ${compraColIdx}:`, tasaValue);
              }

              // Fallback: buscar primer valor numérico después de la celda USD
              if (tasaValue <= 0) {
                for (let i = usdColIdx + 1; i < usdRow.length; i++) {
                  const valor = this.parseNumber(usdRow[i]);
                  if (valor > 0) {
                    tasaValue = valor;
                    console.log(`  -> USD rate from fallback col ${i}:`, valor);
                    break;
                  }
                }
              }

              if (tasaValue > 0) {
                mapaTasas.set(fecha, tasaValue);
                console.log(`  -> TASA GUARDADA: ${fecha} = ${tasaValue}`);
              } else {
                console.log(`  -> No se encontró valor de tasa para ${fecha}`);
              }
            } else {
              console.log(`  -> No se encontró fila USD en sheet ${sheetName}`);
            }
          });
        } else {
          // Archivo .xlsx - usar ExcelJS
          console.log('Using ExcelJS for .xlsx file');
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);

          workbook.eachSheet((worksheet, sheetId) => {
            const nombreHoja = worksheet.name.trim();
            const fecha = this.normalizarFecha(nombreHoja);
            if (!fecha) return;

            worksheet.eachRow((row) => {
              const primeraCelda = String(row.getCell(1).value ?? '').toLowerCase().trim();
              if (primeraCelda === 'usd' || primeraCelda === 'dolar' || primeraCelda === 'dólar') {
                const valorCompra = this.parseNumber(row.getCell(2).value);
                if (valorCompra > 0) {
                  mapaTasas.set(fecha, valorCompra);
                }
              }
            });
          });
        }

        console.log('Total tasas found:', mapaTasas.size);

        if (mapaTasas.size === 0) {
          this.error.set('No se encontraron tasas en el archivo. Verifique que las hojas tengan nombres con fechas y contengan una fila con "USD"');
          return;
        }

        this.tasasMap.set(mapaTasas);
        this.tasasNombre.set(file.name);
        this.tasasColumnas.set(['Fecha', 'Tasa']);

        const preview: any[][] = [['Fecha', 'Tasa']];
        mapaTasas.forEach((tasa, fecha) => {
          preview.push([fecha, tasa]);
        });
        this.tasasPreview.set(preview.slice(0, 11));
      } catch (err) {
        console.error('Error parsing Excel tasas:', err);
        this.error.set('Error al leer el archivo Excel de tasas: ' + (err as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  procesarTasasDesdeTabla() {
    const filas = this.tasasFilas();
    if (filas.length < 2) {
      this.error.set('No hay datos de tasas para procesar');
      return;
    }

    const headers = filas[0];
    const mapaTasas = new Map<string, number>();

    for (let i = 1; i < filas.length; i++) {
      const row = filas[i];
      for (let j = 0; j < headers.length; j++) {
        const fecha = this.normalizarFecha(row[j]);
        if (fecha) {
          const tasa = this.parseNumber(row[j + 1] ?? row[1]);
          if (tasa > 0) {
            mapaTasas.set(fecha, tasa);
          }
        }
      }
    }

    this.tasasMap.set(mapaTasas);
  }

  procesar() {
    if (!this.columnaFechaVentas() || !this.columnaTotalVentas()) {
      this.error.set('Debe seleccionar las columnas de fecha y total del archivo de ventas');
      return;
    }

    const ventasRows = this.ventasRaw();
    if (ventasRows.length < 2) {
      this.error.set('Debe cargar el archivo de ventas');
      return;
    }

    this.procesando.set(true);
    this.error.set('');

    try {
      const ventasHeaders = ventasRows[0];
      const idxFechaV = ventasHeaders.indexOf(this.columnaFechaVentas());
      const idxTotalV = ventasHeaders.indexOf(this.columnaTotalVentas());

      if (idxFechaV < 0 || idxTotalV < 0) {
        this.error.set('No se encontraron las columnas seleccionadas');
        this.procesando.set(false);
        return;
      }

      if (this.tasasMap().size === 0) {
        this.error.set('Debe cargar y procesar el archivo de tasas primero');
        this.procesando.set(false);
        return;
      }

      const tasaMap = this.tasasMap();
      const resultados: FilaResultado[] = [];
      let totalOrig = 0;
      let totalConv = 0;

      for (let i = 1; i < ventasRows.length; i++) {
        const row = ventasRows[i];
        const fecha = this.normalizarFecha(row[idxFechaV]);
        const total = this.parseNumber(row[idxTotalV]);

        if (!fecha) continue;

        const tasa = tasaMap.get(fecha) || 0;
        const totalConvertido = tasa > 0 ? total / tasa : 0;

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

    // Si es un número (fecha serial de Excel), convertir
    if (typeof valor === 'number' && valor > 1) {
      // Excel serial date: días desde 1900-01-01 (con ajuste por bug de Excel)
      const utcDays = valor - 25569;
      const utcValue = utcDays * 86400 * 1000;
      const date = new Date(utcValue);
      if (!isNaN(date.getTime()) && date.getUTCFullYear() > 1990 && date.getUTCFullYear() < 2050) {
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return '';
    }

    if (valor instanceof Date) {
      if (isNaN(valor.getTime())) return '';
      const y = valor.getFullYear();
      if (y < 1991 || y > 2049) return '';
      const m = String(valor.getMonth() + 1).padStart(2, '0');
      const d = String(valor.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    const str = String(valor).trim();
    if (!str || str === 'undefined' || str === 'null') return '';

    const esAnioValido = (a: number) => a >= 1991 && a <= 2049;
    const esMesValido = (m: number) => m >= 1 && m <= 12;
    const esDiaValido = (d: number) => d >= 1 && d <= 31;

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const y = parseInt(str.substring(0, 4));
      const m = parseInt(str.substring(5, 7));
      const d = parseInt(str.substring(8, 10));
      if (esAnioValido(y) && esMesValido(m) && esDiaValido(d)) {
        return str.substring(0, 10);
      }
    }

    // DD/MM/YYYY o D/M/YYYY o DD/MM/YY o D/M/YY
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)) {
      const parts = str.split('/');
      let anio = parts[2];
      if (anio.length === 2) {
        const yy = parseInt(anio);
        anio = yy >= 50 ? `19${anio}` : `20${anio}`;
      }
      const y = parseInt(anio);
      const m = parseInt(parts[1]);
      const d = parseInt(parts[0]);
      if (esAnioValido(y) && esMesValido(m) && esDiaValido(d)) {
        return `${anio}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }

    // DD-MM-YYYY o D-M-YYYY o DD-MM-YY o D-M-YY
    if (/^\d{1,2}-\d{1,2}-\d{2,4}$/.test(str)) {
      const parts = str.split('-');
      let anio = parts[2];
      if (anio.length === 2) {
        const yy = parseInt(anio);
        anio = yy >= 50 ? `19${anio}` : `20${anio}`;
      }
      const y = parseInt(anio);
      const m = parseInt(parts[1]);
      const d = parseInt(parts[0]);
      if (esAnioValido(y) && esMesValido(m) && esDiaValido(d)) {
        return `${anio}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }

    // YYYYMMDD
    if (/^\d{8}$/.test(str)) {
      const y = parseInt(str.substring(0, 4));
      const m = parseInt(str.substring(4, 6));
      const d = parseInt(str.substring(6, 8));
      if (esAnioValido(y) && esMesValido(m) && esDiaValido(d)) {
        return `${y}-${str.substring(4, 6)}-${str.substring(6, 8)}`;
      }
    }

    // YYYY/M/D o YYYY/M/DD
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(str)) {
      const parts = str.split('/');
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      const d = parseInt(parts[2]);
      if (esAnioValido(y) && esMesValido(m) && esDiaValido(d)) {
        return `${parts[0]}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }

    // Nombres de meses en español e inglés
    const meses: Record<string, string> = {
      'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
      'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
      'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12',
      'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
      'jun': '06', 'jul': '07', 'ago': '08', 'sep': '09',
      'oct': '10', 'nov': '11', 'dic': '12',
      'jan': '01', 'apr': '04', 'may': '05', 'aug': '08', 'dec': '12',
      'january': '01', 'february': '02', 'march': '03', 'april': '04',
      'june': '06', 'july': '07', 'august': '08',
      'september': '09', 'october': '10', 'november': '11', 'december': '12',
    };

    const lowerStr = str.toLowerCase();
    for (const [mes, num] of Object.entries(meses)) {
      if (lowerStr.includes(mes)) {
        const diaMatch = lowerStr.match(/(\d{1,2})/);
        const anioMatch = lowerStr.match(/(\d{4})/);
        if (diaMatch && anioMatch) {
          const y = parseInt(anioMatch[1]);
          const d = parseInt(diaMatch[1]);
          if (esAnioValido(y) && esDiaValido(d)) {
            return `${anioMatch[1]}-${num}-${diaMatch[1].padStart(2, '0')}`;
          }
        }
      }
    }

    return '';
  }

  private parseNumber(valor: any): number {
    if (typeof valor === 'number') return valor;
    if (!valor) return 0;
    const str = String(valor).replace(/[^\d.,-]/g, '');
    if (str.includes(',') && str.includes('.')) {
      const lastComma = str.lastIndexOf(',');
      const lastDot = str.lastIndexOf('.');
      if (lastComma > lastDot) {
        return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
      }
      return parseFloat(str.replace(/,/g, '')) || 0;
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
    const headers = ['Fecha', ...columnasExtra, 'Total Original (Bs)', 'Tasa USD', 'Total Convertido ($)'];

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

    worksheet.columns.forEach(col => { col.width = 18; });

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
    this.ventasNombre.set('');
    this.tasasNombre.set('');
    this.ventasColumnas.set([]);
    this.tasasColumnas.set([]);
    this.tasasFilas.set([]);
    this.columnaFechaVentas.set('');
    this.columnaTotalVentas.set('');
    this.ventasRaw.set([]);
    this.tasasMap.set(new Map());
    this.ventasPreview.set([]);
    this.tasasPreview.set([]);
    this.resultados.set([]);
    this.error.set('');
    this.totalOriginal.set(0);
    this.totalConvertido.set(0);
  }
}
