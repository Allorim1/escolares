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

interface ComparacionResultado {
  fecha: string;
  totalActual: number;
  totalAnterior1: number;
  totalAnterior2: number;
  convertidoActual: number;
  convertidoAnterior1: number;
  convertidoAnterior2: number;
  variacionPct1: number;
  variacionPct2: number;
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

  tasasManuales = signal<Map<string, number>>(new Map());
  fechasSinTasa = signal<string[]>([]);

  // Archivos de comparación
  ventasAnterior1Nombre = signal('');
  ventasAnterior1Raw = signal<any[][]>([]);
  ventasAnterior1Columnas = signal<string[]>([]);
  columnaFechaAnterior1 = signal('');
  columnaTotalAnterior1 = signal('');
  ventasAnterior1Preview = signal<any[][]>([]);

  ventasAnterior2Nombre = signal('');
  ventasAnterior2Raw = signal<any[][]>([]);
  ventasAnterior2Columnas = signal<string[]>([]);
  columnaFechaAnterior2 = signal('');
  columnaTotalAnterior2 = signal('');
  ventasAnterior2Preview = signal<any[][]>([]);

  resultadosAnterior1 = signal<FilaResultado[]>([]);
  resultadosAnterior2 = signal<FilaResultado[]>([]);
  totalOriginalAnterior1 = signal(0);
  totalConvertidoAnterior1 = signal(0);
  totalOriginalAnterior2 = signal(0);
  totalConvertidoAnterior2 = signal(0);

  comparaciones = signal<ComparacionResultado[]>([]);
  variacionTotalPct1 = signal(0);
  variacionTotalPct2 = signal(0);

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

  onFileAnterior1(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const ext = file.name.split('.').pop()?.toLowerCase();

    this.error.set('');
    if (ext === 'csv') {
      this.parseCSVComparacion(file, 1);
    } else if (ext === 'xlsx' || ext === 'xls') {
      this.parseExcelComparacion(file, 1);
    } else {
      this.error.set('Formato no soportado. Use CSV o Excel (.xlsx)');
    }
  }

  onFileAnterior2(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const ext = file.name.split('.').pop()?.toLowerCase();

    this.error.set('');
    if (ext === 'csv') {
      this.parseCSVComparacion(file, 2);
    } else if (ext === 'xlsx' || ext === 'xls') {
      this.parseExcelComparacion(file, 2);
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
      const headers = ['FECHA', 'DIA', 'VENTAS'];
      
      // Extraer solo los datos relevantes
      const dataRows: any[][] = [headers];
      
      for (let i = 0; i < allRows.length; i++) {
        const row = allRows[i];
        if (row.length < 17) continue; // Saltar filas incompletas
        
        // Los datos reales están en las posiciones 12-16
        const fecha = row[12];
        const dia = row[13];
        const ventas = row[14];
        const total = row[16];
        
        // Verificar que hay datos válidos
        if (fecha && ventas && total) {
          dataRows.push([fecha, dia, ventas, total]);
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
      this.columnaTotalVentas.set('VENTAS');
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

  private parseCSVComparacion(file: File, slot: 1 | 2) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        this.error.set('El archivo CSV debe tener encabezado y datos');
        return;
      }

      const allRows: any[][] = [];
      for (let i = 0; i < lines.length; i++) {
        allRows.push(this.parseCSVLine(lines[i]));
      }

      let headerRowIndex = -1;
      let fechaColIdx = -1;
      let totalColIdx = -1;

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
        }
        if (headerRowIndex >= 0) break;
      }

      if (headerRowIndex < 0) {
        headerRowIndex = 0;
        fechaColIdx = 6;
        totalColIdx = 10;
      }

      const headers = ['FECHA', 'DIA', 'VENTAS'];
      const dataRows: any[][] = [headers];

      for (let i = 0; i < allRows.length; i++) {
        const row = allRows[i];
        if (row.length < 17) continue;
        const fecha = row[12];
        const dia = row[13];
        const ventas = row[14];
        const total = row[16];
        if (fecha && ventas && total) {
          dataRows.push([fecha, dia, ventas, total]);
        }
      }

      if (dataRows.length < 2) {
        this.error.set('No se encontraron datos válidos en el archivo de comparación');
        return;
      }

      if (slot === 1) {
        this.ventasAnterior1Raw.set(dataRows);
        this.ventasAnterior1Columnas.set(headers);
        this.ventasAnterior1Nombre.set(file.name);
        this.ventasAnterior1Preview.set(dataRows.slice(0, 6));
        this.columnaFechaAnterior1.set('FECHA');
        this.columnaTotalAnterior1.set('VENTAS');
      } else {
        this.ventasAnterior2Raw.set(dataRows);
        this.ventasAnterior2Columnas.set(headers);
        this.ventasAnterior2Nombre.set(file.name);
        this.ventasAnterior2Preview.set(dataRows.slice(0, 6));
        this.columnaFechaAnterior2.set('FECHA');
        this.columnaTotalAnterior2.set('VENTAS');
      }
    };
    reader.readAsText(file);
  }

  private parseExcelComparacion(file: File, slot: 1 | 2) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const fileName = file.name.toLowerCase();
        let rows: any[][] = [];

        const isXlsByExtension = fileName.endsWith('.xls') && !fileName.endsWith('.xlsx');

        if (isXlsByExtension) {
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            this.error.set('El archivo Excel no tiene hojas');
            return;
          }
          const worksheet = workbook.Sheets[sheetName];
          rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true }) as any[][];
        } else {
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
        const colFecha = headers.find(h =>
          h.toLowerCase().includes('fecha') || h.toLowerCase().includes('date')
        );
        const colTotal = headers.find(h =>
          h.toLowerCase().includes('total') || h.toLowerCase().includes('monto') || h.toLowerCase().includes('amount')
        );

        if (slot === 1) {
          this.ventasAnterior1Raw.set(rows);
          this.ventasAnterior1Columnas.set(headers);
          this.ventasAnterior1Nombre.set(file.name);
          this.ventasAnterior1Preview.set(rows.slice(0, 6));
          if (colFecha) this.columnaFechaAnterior1.set(colFecha);
          if (colTotal) this.columnaTotalAnterior1.set(colTotal);
        } else {
          this.ventasAnterior2Raw.set(rows);
          this.ventasAnterior2Columnas.set(headers);
          this.ventasAnterior2Nombre.set(file.name);
          this.ventasAnterior2Preview.set(rows.slice(0, 6));
          if (colFecha) this.columnaFechaAnterior2.set(colFecha);
          if (colTotal) this.columnaTotalAnterior2.set(colTotal);
        }
      } catch (err) {
        console.error('Error parsing Excel comparación:', err);
        this.error.set('Error al leer el archivo Excel de comparación: ' + (err as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
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
        const hojasDetectadas: string[] = [];

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
            hojasDetectadas.push(sheetName);
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
            hojasDetectadas.push(nombreHoja);
            const fecha = this.normalizarFecha(nombreHoja);
            console.log(`Sheet "${nombreHoja}" -> fecha normalizada: "${fecha}"`);
            if (!fecha) {
              console.log('  -> Skipping sheet (not a date):', nombreHoja);
              return;
            }

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
          const nombresHojas = hojasDetectadas.length > 0 ? hojasDetectadas.join(', ') : 'ninguna';
          const mensaje = `No se encontraron tasas. Hojas detectadas: [${nombresHojas}]. `
            + `Las hojas deben tener nombres con fechas (ej: "2025-03-28", "28/03/2025", "28 de marzo 2025") `
            + `y contener una fila con "USD". Revisa la consola (F12) para más detalles.`;
          this.error.set(mensaje);
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
      const tasasManuales = this.tasasManuales();
      const todasLasTasas = new Map<string, number>([...tasaMap, ...tasasManuales]);
      const fechasFaltantes: string[] = [];

      // Primera pasada: recopilar todas las fechas únicas de ventas
      const fechasVentas = new Set<string>();
      for (let i = 1; i < ventasRows.length; i++) {
        const fecha = this.normalizarFecha(ventasRows[i][idxFechaV]);
        if (fecha) fechasVentas.add(fecha);
      }

      // Para fechas de fin de semana sin tasa, buscar la del próximo lunes
      for (const fecha of fechasVentas) {
        if (todasLasTasas.has(fecha)) continue;
        const fechaDate = new Date(fecha + 'T00:00:00');
        const diaSemana = fechaDate.getDay(); // 0=Dom, 6=Sáb

        if (diaSemana === 0 || diaSemana === 6) {
          // Buscar el próximo lunes
          const diasHastaLunes = diaSemana === 6 ? 2 : 1;
          const lunesDate = new Date(fechaDate);
          lunesDate.setDate(lunesDate.getDate() + diasHastaLunes);
          const lunesStr = `${lunesDate.getFullYear()}-${String(lunesDate.getMonth() + 1).padStart(2, '0')}-${String(lunesDate.getDate()).padStart(2, '0')}`;
          const tasaLunes = todasLasTasas.get(lunesStr);
          if (tasaLunes) {
            todasLasTasas.set(fecha, tasaLunes);
            console.log(`Fin de semana ${fecha} (${diaSemana === 6 ? 'Sábado' : 'Domingo'}) -> tasa del lunes ${lunesStr}: ${tasaLunes}`);
          }
        }
      }

      // Detectar fechas laborales sin tasa (no fin de semana)
      for (const fecha of fechasVentas) {
        if (todasLasTasas.has(fecha)) continue;
        const fechaDate = new Date(fecha + 'T00:00:00');
        const diaSemana = fechaDate.getDay();
        if (diaSemana !== 0 && diaSemana !== 6) {
          fechasFaltantes.push(fecha);
        }
      }

      this.fechasSinTasa.set(fechasFaltantes);

      // Segunda pasada: calcular resultados
      const resultados: FilaResultado[] = [];
      let totalOrig = 0;
      let totalConv = 0;

      for (let i = 1; i < ventasRows.length; i++) {
        const row = ventasRows[i];
        const fecha = this.normalizarFecha(row[idxFechaV]);
        const total = this.parseNumber(row[idxTotalV]);

        if (!fecha) continue;

        const tasa = todasLasTasas.get(fecha) || 0;
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

  procesarComparacion() {
    if (this.tasasMap().size === 0) {
      this.error.set('Debe cargar y procesar el archivo de tasas primero');
      return;
    }

    const tasaMap = this.tasasMap();
    const tasasManuales = this.tasasManuales();
    const todasLasTasas = new Map<string, number>([...tasaMap, ...tasasManuales]);

    // Procesar archivo anterior 1 si existe
    if (this.ventasAnterior1Raw().length >= 2) {
      const res1 = this.calcularResultados(
        this.ventasAnterior1Raw(),
        this.columnaFechaAnterior1(),
        this.columnaTotalAnterior1(),
        todasLasTasas
      );
      this.resultadosAnterior1.set(res1.resultados);
      this.totalOriginalAnterior1.set(res1.totalOrig);
      this.totalConvertidoAnterior1.set(res1.totalConv);
    }

    // Procesar archivo anterior 2 si existe
    if (this.ventasAnterior2Raw().length >= 2) {
      const res2 = this.calcularResultados(
        this.ventasAnterior2Raw(),
        this.columnaFechaAnterior2(),
        this.columnaTotalAnterior2(),
        todasLasTasas
      );
      this.resultadosAnterior2.set(res2.resultados);
      this.totalOriginalAnterior2.set(res2.totalOrig);
      this.totalConvertidoAnterior2.set(res2.totalConv);
    }

    // Calcular comparaciones
    this.calcularComparaciones();
  }

  private calcularResultados(
    ventasRows: any[][],
    colFecha: string,
    colTotal: string,
    todasLasTasas: Map<string, number>
  ): { resultados: FilaResultado[]; totalOrig: number; totalConv: number } {
    const ventasHeaders = ventasRows[0];
    const idxFechaV = ventasHeaders.indexOf(colFecha);
    const idxTotalV = ventasHeaders.indexOf(colTotal);

    if (idxFechaV < 0 || idxTotalV < 0) {
      return { resultados: [], totalOrig: 0, totalConv: 0 };
    }

    const resultados: FilaResultado[] = [];
    let totalOrig = 0;
    let totalConv = 0;

    for (let i = 1; i < ventasRows.length; i++) {
      const row = ventasRows[i];
      const fecha = this.normalizarFecha(row[idxFechaV]);
      const total = this.parseNumber(row[idxTotalV]);

      if (!fecha) continue;

      const tasa = todasLasTasas.get(fecha) || 0;
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

    return {
      resultados,
      totalOrig: Math.round(totalOrig * 100) / 100,
      totalConv: Math.round(totalConv * 100) / 100
    };
  }

  private calcularComparaciones() {
    const actuales = this.resultados();
    const anteriores1 = this.resultadosAnterior1();
    const anteriores2 = this.resultadosAnterior2();

    if (actuales.length === 0) return;

    const mapaActual = new Map<string, FilaResultado>();
    for (const r of actuales) {
      mapaActual.set(r.fecha, r);
    }

    const mapaAnterior1 = new Map<string, FilaResultado>();
    for (const r of anteriores1) {
      mapaAnterior1.set(r.fecha, r);
    }

    const mapaAnterior2 = new Map<string, FilaResultado>();
    for (const r of anteriores2) {
      mapaAnterior2.set(r.fecha, r);
    }

    const todasLasFechas = new Set<string>([
      ...mapaActual.keys(),
      ...mapaAnterior1.keys(),
      ...mapaAnterior2.keys()
    ]);

    const comparaciones: ComparacionResultado[] = [];

    for (const fecha of todasLasFechas) {
      const actual = mapaActual.get(fecha);
      const anterior1 = mapaAnterior1.get(fecha);
      const anterior2 = mapaAnterior2.get(fecha);

      const totalActual = actual?.totalOriginal ?? 0;
      const totalAnterior1 = anterior1?.totalOriginal ?? 0;
      const totalAnterior2 = anterior2?.totalOriginal ?? 0;
      const convertidoActual = actual?.totalConvertido ?? 0;
      const convertidoAnterior1 = anterior1?.totalConvertido ?? 0;
      const convertidoAnterior2 = anterior2?.totalConvertido ?? 0;

      const variacionPct1 = totalAnterior1 > 0
        ? Math.round(((totalActual - totalAnterior1) / totalAnterior1) * 10000) / 100
        : 0;
      const variacionPct2 = totalAnterior2 > 0
        ? Math.round(((totalActual - totalAnterior2) / totalAnterior2) * 10000) / 100
        : 0;

      comparaciones.push({
        fecha,
        totalActual,
        totalAnterior1,
        totalAnterior2,
        convertidoActual,
        convertidoAnterior1,
        convertidoAnterior2,
        variacionPct1,
        variacionPct2
      });
    }

    comparaciones.sort((a, b) => a.fecha.localeCompare(b.fecha));
    this.comparaciones.set(comparaciones);

    // Calcular variación total porcentual
    const totalAct = this.totalOriginal();
    const totalAnt1 = this.totalOriginalAnterior1();
    const totalAnt2 = this.totalOriginalAnterior2();

    this.variacionTotalPct1.set(
      totalAnt1 > 0 ? Math.round(((totalAct - totalAnt1) / totalAnt1) * 10000) / 100 : 0
    );
    this.variacionTotalPct2.set(
      totalAnt2 > 0 ? Math.round(((totalAct - totalAnt2) / totalAnt2) * 10000) / 100 : 0
    );
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

    // YYYYMMDD o DDMMYYYY (8 dígitos sin separador)
    if (/^\d{8}$/.test(str)) {
      // Intentar YYYYMMDD primero
      const y1 = parseInt(str.substring(0, 4));
      const m1 = parseInt(str.substring(4, 6));
      const d1 = parseInt(str.substring(6, 8));
      if (esAnioValido(y1) && esMesValido(m1) && esDiaValido(d1)) {
        return `${y1}-${str.substring(4, 6)}-${str.substring(6, 8)}`;
      }
      // Intentar DDMMYYYY
      const d2 = parseInt(str.substring(0, 2));
      const m2 = parseInt(str.substring(2, 4));
      const y2 = parseInt(str.substring(4, 8));
      if (esAnioValido(y2) && esMesValido(m2) && esDiaValido(d2)) {
        return `${y2}-${str.substring(2, 4)}-${str.substring(0, 2)}`;
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

    // Hoja principal de conversión
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

    // Hoja de comparación si hay datos
    if (this.comparaciones().length > 0) {
      const wsComp = workbook.addWorksheet('Comparación');
      const hasAnt1 = this.ventasAnterior1Nombre() !== '';
      const hasAnt2 = this.ventasAnterior2Nombre() !== '';

      const compHeaders = ['Fecha', 'Total Actual (Bs)'];
      if (hasAnt1) compHeaders.push('Total Anterior 1 (Bs)', 'Variación % 1');
      if (hasAnt2) compHeaders.push('Total Anterior 2 (Bs)', 'Variación % 2');
      compHeaders.push('Convertido Actual ($)');
      if (hasAnt1) compHeaders.push('Convertido Ant. 1 ($)');
      if (hasAnt2) compHeaders.push('Convertido Ant. 2 ($)');

      wsComp.addRow(compHeaders);
      const compHeaderRow = wsComp.getRow(1);
      compHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      compHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };

      for (const c of this.comparaciones()) {
        const row: any[] = [c.fecha, c.totalActual];
        if (hasAnt1) row.push(c.totalAnterior1, c.variacionPct1 + '%');
        if (hasAnt2) row.push(c.totalAnterior2, c.variacionPct2 + '%');
        row.push(c.convertidoActual);
        if (hasAnt1) row.push(c.convertidoAnterior1);
        if (hasAnt2) row.push(c.convertidoAnterior2);
        wsComp.addRow(row);
      }

      // Fila de totales
      const totRow: any[] = ['TOTALES', this.totalOriginal()];
      if (hasAnt1) totRow.push(this.totalOriginalAnterior1(), this.variacionTotalPct1() + '%');
      if (hasAnt2) totRow.push(this.totalOriginalAnterior2(), this.variacionTotalPct2() + '%');
      totRow.push(this.totalConvertido());
      if (hasAnt1) totRow.push(this.totalConvertidoAnterior1());
      if (hasAnt2) totRow.push(this.totalConvertidoAnterior2());
      const compTotalRow = wsComp.addRow(totRow);
      compTotalRow.font = { bold: true };
      compTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };

      wsComp.columns.forEach(col => { col.width = 20; });
    }

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
    this.tasasManuales.set(new Map());
    this.fechasSinTasa.set([]);
    // Limpiar comparaciones
    this.ventasAnterior1Nombre.set('');
    this.ventasAnterior1Raw.set([]);
    this.ventasAnterior1Columnas.set([]);
    this.columnaFechaAnterior1.set('');
    this.columnaTotalAnterior1.set('');
    this.ventasAnterior1Preview.set([]);
    this.ventasAnterior2Nombre.set('');
    this.ventasAnterior2Raw.set([]);
    this.ventasAnterior2Columnas.set([]);
    this.columnaFechaAnterior2.set('');
    this.columnaTotalAnterior2.set('');
    this.ventasAnterior2Preview.set([]);
    this.resultadosAnterior1.set([]);
    this.resultadosAnterior2.set([]);
    this.totalOriginalAnterior1.set(0);
    this.totalConvertidoAnterior1.set(0);
    this.totalOriginalAnterior2.set(0);
    this.totalConvertidoAnterior2.set(0);
    this.comparaciones.set([]);
    this.variacionTotalPct1.set(0);
    this.variacionTotalPct2.set(0);
  }

  asignarTasaManual(fecha: string, valor: any) {
    const tasa = parseFloat(valor);
    if (isNaN(tasa) || tasa <= 0) return;
    const manuales = new Map(this.tasasManuales());
    manuales.set(fecha, tasa);
    this.tasasManuales.set(manuales);
    this.procesar();
  }

  eliminarTasaManual(fecha: string) {
    const manuales = new Map(this.tasasManuales());
    manuales.delete(fecha);
    this.tasasManuales.set(manuales);
    this.procesar();
  }

  esFinDeSemana(fecha: string): boolean {
    const d = new Date(fecha + 'T00:00:00');
    return d.getDay() === 0 || d.getDay() === 6;
  }

  diaSemanaLabel(fecha: string): string {
    const d = new Date(fecha + 'T00:00:00');
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[d.getDay()];
  }
}
