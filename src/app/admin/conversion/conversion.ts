import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { TasasGuardadasService, TasaGuardada } from '../../shared/data-access/tasas-guardadas.service';

interface FilaResultado {
  fecha: string;
  dia: string;
  diaSemana: number;
  totalOriginal: number;
  tasa: number;
  totalConvertido: number;
  columnasExtra: Record<string, any>;
}

interface ComparacionResultado {
  fecha: string;
  dia: string;
  diaSemana: number;
  totalActual: number;
  totalAnterior: number;
  tasaActual: number;
  tasaAnterior: number;
  convertidoActual: number;
  convertidoAnterior: number;
  variacionPct: number;
}

@Component({
  selector: 'app-conversion',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './conversion.html',
  styleUrl: './conversion.css',
})
export class Conversion implements OnInit {
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

  // Archivo de ventas del período anterior
  ventasAnteriorNombre = signal('');
  ventasAnteriorRaw = signal<any[][]>([]);
  ventasAnteriorColumnas = signal<string[]>([]);
  columnaFechaAnterior = signal('');
  columnaTotalAnterior = signal('');
  ventasAnteriorPreview = signal<any[][]>([]);

  resultadosAnterior = signal<FilaResultado[]>([]);
  totalOriginalAnterior = signal(0);
  totalConvertidoAnterior = signal(0);

  // Archivo de tasas del período anterior
  tasasAnterioresNombre = signal('');
  tasasAnterioresMap = signal<Map<string, number>>(new Map());
  tasasAnterioresFilas = signal<any[][]>([]);
  tasasAnterioresColumnas = signal<string[]>([]);
  tasasAnterioresPreview = signal<any[][]>([]);
  promedioTasaActual = signal<number>(0);
  promedioTasaAnterior = signal<number>(0);
  // Internal cents-based state for compact input behavior
  promedioTasaActualCents = signal<number>(0);
  promedioTasaAnteriorCents = signal<number>(0);
  showBlankActual = signal<boolean>(false);
  showBlankAnterior = signal<boolean>(false);
 
   // Tasas manuales para año anterior
   tasasAnterioresManuales = signal<Map<string, number>>(new Map());
   fechasSinTasaAnterior = signal<string[]>([]);
 
   tasasGuardadas = signal<TasaGuardada[]>([]);
   tasasAnterioresGuardadas = signal<TasaGuardada[]>([]);
 
   constructor(private tasasGuardadasService: TasasGuardadasService) {}

   ngOnInit() {
     this.cargarTasasGuardadas();
     this.cargarTasasAnterioresGuardadas();
   }

   cargarTasasGuardadas() {
     this.tasasGuardadasService.getAll('actual').subscribe({
       next: (tasas) => this.tasasGuardadas.set(tasas),
       error: (err) => console.error('Error cargando tasas guardadas:', err)
     });
   }

   cargarTasasAnterioresGuardadas() {
     this.tasasGuardadasService.getAll('anterior').subscribe({
       next: (tasas) => this.tasasAnterioresGuardadas.set(tasas),
       error: (err) => console.error('Error cargando tasas anteriores guardadas:', err)
     });
   }

   cargarTasaDesdeBD(id: string) {
     this.tasasGuardadasService.getById(id).subscribe({
       next: (tasa) => {
         const mapaTasas = new Map<string, number>();
         tasa.tasas.forEach(t => mapaTasas.set(t.fecha, t.valor));
         this.tasasMap.set(mapaTasas);
         this.tasasNombre.set(tasa.nombre);
         this.error.set('');
       },
       error: (err) => this.error.set('Error al cargar tasas desde BD')
     });
   }

   cargarTasaAnteriorDesdeBD(id: string) {
     this.tasasGuardadasService.getById(id).subscribe({
       next: (tasa) => {
         const mapaTasas = new Map<string, number>();
         tasa.tasas.forEach(t => mapaTasas.set(t.fecha, t.valor));
         this.tasasAnterioresMap.set(mapaTasas);
         this.tasasAnterioresNombre.set(tasa.nombre);
         const preview: any[][] = [['Fecha', 'Tasa'], ...tasa.tasas.map(t => [t.fecha, t.valor])];
         this.tasasAnterioresPreview.set(preview.slice(0, 11));
         this.error.set('');
       },
       error: (err) => this.error.set('Error al cargar tasas anteriores desde BD')
     });
   }

   onSeleccionarTasaGuardada(event: Event) {
     const select = event.target as HTMLSelectElement;
     const id = select.value;
     if (id) {
       this.cargarTasaDesdeBD(id);
     }
   }

   onSeleccionarTasaAnteriorGuardada(event: Event) {
     const select = event.target as HTMLSelectElement;
     const id = select.value;
     if (id) {
       this.cargarTasaAnteriorDesdeBD(id);
     }
   }

comparaciones = signal<ComparacionResultado[]>([]);
    comparacionesActual = signal<ComparacionResultado[]>([]);
    comparacionesAnterior = signal<ComparacionResultado[]>([]);
    variacionTotalPct = signal(0);
    mostrarModalComparacion = signal(false);
    mostrarModalExpectativas = signal(false);
    mostrarModalImpresion = signal(false);
    metaVariacion = signal(30);
    get metaVariacionValue(): number {
      return this.metaVariacion();
    }
    set metaVariacionValue(v: number) {
      this.metaVariacion.set(Number(v));
    }
    comentarioImpresion = signal('');
    columnaFechaVisible = signal(true);
    columnaDiaVisible = signal(true);
    columnaAnteriorBsVisible = signal(true);
    columnaAnteriorUSDVisible = signal(true);
    columnaTasaVisible = signal(true);
    columnaTargetUSDVisible = signal(true);
    columnaTargetBsVisible = signal(true);
    columnaMetaExtraUSDVisible = signal(true);
    columnaMetaExtraBsVisible = signal(true);
    diasSeleccionados = signal<Set<string>>(new Set());

calcularExpectativas(): { targetUSD: number; targetBs: number; tasaPromedio: number } {
     const totalAnteriorUSD = this.totalConvertidoAnterior();
     const meta = this.metaVariacion();
     const tasaPromedio = this.tasaPromedioActual() || this.tasaPromedioAnterior() || this.promedioTasaActual() || this.promedioTasaAnterior();
     
     const targetUSD = totalAnteriorUSD > 0 
       ? Math.round(totalAnteriorUSD * (1 + meta / 100) * 100) / 100 
       : 0;
     
     const targetBs = tasaPromedio > 0 
       ? Math.round(targetUSD * tasaPromedio * 100) / 100 
       : 0;
     
     return { targetUSD, targetBs, tasaPromedio };
   }

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

  onFileAnterior(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const ext = file.name.split('.').pop()?.toLowerCase();

    this.error.set('');
    if (ext === 'csv') {
      this.parseCSVComparacion(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      this.parseExcelComparacion(file);
    } else {
      this.error.set('Formato no soportado. Use CSV o Excel (.xlsx)');
    }
  }

  onFileTasasAnteriores(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const ext = file.name.split('.').pop()?.toLowerCase();

    this.error.set('');
    if (ext === 'csv') {
      this.parseCSVTasasAnteriores(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      this.parseExcelTasasAnteriores(file);
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

  private parseCSVTasasAnteriores(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        this.error.set('El archivo CSV de tasas anteriores debe tener encabezado y datos');
        return;
      }
      const headers = this.parseCSVLine(lines[0]);
      const rows: any[][] = [headers];
      for (let i = 1; i < lines.length; i++) {
        rows.push(this.parseCSVLine(lines[i]));
      }
      this.tasasAnterioresFilas.set(rows);
      this.tasasAnterioresColumnas.set(headers);
      this.tasasAnterioresNombre.set(file.name);
      this.tasasAnterioresPreview.set(rows.slice(0, 6));
    };
    reader.readAsText(file);
  }

  private parseCSVComparacion(file: File) {
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

      this.ventasAnteriorRaw.set(dataRows);
      this.ventasAnteriorColumnas.set(headers);
      this.ventasAnteriorNombre.set(file.name);
      this.ventasAnteriorPreview.set(dataRows.slice(0, 6));
      this.columnaFechaAnterior.set('FECHA');
      this.columnaTotalAnterior.set('VENTAS');
    };
    reader.readAsText(file);
  }

  private parseExcelComparacion(file: File) {
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

        this.ventasAnteriorRaw.set(rows);
        this.ventasAnteriorColumnas.set(headers);
        this.ventasAnteriorNombre.set(file.name);
        this.ventasAnteriorPreview.set(rows.slice(0, 6));
        if (colFecha) this.columnaFechaAnterior.set(colFecha);
        if (colTotal) this.columnaTotalAnterior.set(colTotal);
      } catch (err) {
        console.error('Error parsing Excel comparación:', err);
        this.error.set('Error al leer el archivo Excel de comparación: ' + (err as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  private parseExcelTasasAnteriores(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const fileName = file.name.toLowerCase();
        const mapaTasas = new Map<string, number>();
        const hojasDetectadas: string[] = [];

        const isXlsByExtension = fileName.endsWith('.xls') && !fileName.endsWith('.xlsx');

        if (isXlsByExtension) {
          const workbook = XLSX.read(buffer, { type: 'array' });

          workbook.SheetNames.forEach((sheetName, idx) => {
            hojasDetectadas.push(sheetName);
            const fecha = this.normalizarFecha(sheetName.trim());
            
            if (!fecha) return;

            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true }) as any[][];

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
              }

              // Fallback: buscar primer valor numérico después de la celda USD
              if (tasaValue <= 0) {
                for (let i = usdColIdx + 1; i < usdRow.length; i++) {
                  const valor = this.parseNumber(usdRow[i]);
                  if (valor > 0) {
                    tasaValue = valor;
                    break;
                  }
                }
              }

              if (tasaValue > 0) {
                mapaTasas.set(fecha, tasaValue);
              }
            }
          });
        } else {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);

          workbook.eachSheet((worksheet, sheetId) => {
            const nombreHoja = worksheet.name.trim();
            hojasDetectadas.push(nombreHoja);
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

        if (mapaTasas.size === 0) {
          const nombresHojas = hojasDetectadas.length > 0 ? hojasDetectadas.join(', ') : 'ninguna';
          const mensaje = `No se encontraron tasas anteriores. Hojas detectadas: [${nombresHojas}].`;
          this.error.set(mensaje);
          return;
        }

        this.tasasAnterioresMap.set(mapaTasas);
        this.tasasAnterioresNombre.set(file.name);
        this.tasasAnterioresColumnas.set(['Fecha', 'Tasa']);

        const preview: any[][] = [['Fecha', 'Tasa']];
        mapaTasas.forEach((tasa, fecha) => {
          preview.push([fecha, tasa]);
        });
        this.tasasAnterioresPreview.set(preview.slice(0, 11));
      } catch (err) {
        console.error('Error parsing Excel tasas anteriores:', err);
        this.error.set('Error al leer el archivo Excel de tasas anteriores: ' + (err as Error).message);
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
     this.guardarTasasEnBD();
   }

   guardarTasasEnBD() {
     if (this.tasasMap().size === 0) return;
     
     const nombre = `Tasas ${new Date().toLocaleDateString('es-VE')}`;
     this.tasasGuardadasService.save(nombre, this.tasasMap(), 'actual').subscribe({
       next: () => {
         this.cargarTasasGuardadas();
       },
       error: (err) => console.error('Error guardando tasas:', err)
     });
   }

  procesarTasasAnterioresDesdeTabla() {
    const filas = this.tasasAnterioresFilas();
    if (filas.length < 2) {
      this.error.set('No hay datos de tasas anteriores para procesar');
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

this.tasasAnterioresMap.set(mapaTasas);
     this.guardarTasasAnterioresEnBD();
   }

   guardarTasasAnterioresEnBD() {
     if (this.tasasAnterioresMap().size === 0) return;
     
     const nombre = `Tasas Anterior ${new Date().toLocaleDateString('es-VE')}`;
     this.tasasGuardadasService.save(nombre, this.tasasAnterioresMap(), 'anterior').subscribe({
       next: () => {
         this.cargarTasasAnterioresGuardadas();
       },
       error: (err) => console.error('Error guardando tasas anteriores:', err)
     });
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

      const tasaMap = this.tasasMap();
      const tasasManuales = this.tasasManuales();
      const todasLasTasas = new Map<string, number>([...tasaMap, ...tasasManuales]);
      const promedioActual = this.promedioTasaActual();
      const fechasFaltantes: string[] = [];

      if (todasLasTasas.size === 0 && promedioActual <= 0) {
        this.error.set('Debe cargar tasas o ingresar la tasa promedio actual primero');
        this.procesando.set(false);
        return;
      }

      // Primera pasada: recopilar todas las fechas únicas de ventas
      const fechasVentas = new Set<string>();
      for (let i = 1; i < ventasRows.length; i++) {
        const fecha = this.normalizarFecha(ventasRows[i][idxFechaV]);
        if (fecha) fechasVentas.add(fecha);
      }

      // Para fechas de fin de semana sin tasa, buscar la del próximo lunes
      for (const fecha of fechasVentas) {
        if (todasLasTasas.has(fecha)) continue;
        if (promedioActual > 0) {
          todasLasTasas.set(fecha, promedioActual);
          continue;
        }

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

      const idxDiaV = ventasHeaders.findIndex(h => h.toUpperCase() === 'DIA');

      for (let i = 1; i < ventasRows.length; i++) {
        const row = ventasRows[i];
        const fecha = this.normalizarFecha(row[idxFechaV]);
        const dia = idxDiaV >= 0 ? String(row[idxDiaV] || '') : '';
        const total = this.parseNumber(row[idxTotalV]);

        if (!fecha) continue;

        const fechaDate = new Date(fecha + 'T00:00:00');
        const diaSemana = fechaDate.getDay();

        const tasa = todasLasTasas.get(fecha) || 0;
        const totalConvertido = tasa > 0 ? total / tasa : 0;

        const columnasExtra: Record<string, any> = {};
        ventasHeaders.forEach((h: string, idx: number) => {
          if (idx !== idxFechaV && idx !== idxTotalV) {
            columnasExtra[h] = row[idx];
          }
        });

        resultados.push({
          fecha,
          dia,
          diaSemana,
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
    const tasaMap = this.tasasMap();
    const tasasManuales = this.tasasManuales();
    const todasLasTasas = new Map<string, number>([...tasaMap, ...tasasManuales]);
    const promedioActual = this.promedioTasaActual();

    const tasasAnterioresBase = this.tasasAnterioresMap();
    const tasasAnterioresManual = this.tasasAnterioresManuales();
    let todasLasTasasAnteriores = new Map<string, number>([...tasasAnterioresBase, ...tasasAnterioresManual]);
    const promedioAnterior = this.promedioTasaAnterior();

    // Si no hay tasas anteriores, usar las actuales como fallback
    if (todasLasTasasAnteriores.size === 0) {
      todasLasTasasAnteriores = new Map(todasLasTasas);
    }

    const fechasFaltantesAnterior: string[] = [];

    // Procesar archivo actual con tasas actuales
    if (this.resultados().length === 0 && this.ventasRaw().length >= 2) {
      if (todasLasTasas.size === 0 && promedioActual > 0) {
        const ventasHeaders = this.ventasRaw()[0];
        const idxFechaV = ventasHeaders.indexOf(this.columnaFechaVentas());
        const fechasVentas = new Set<string>();
        for (let i = 1; i < this.ventasRaw().length; i++) {
          const fecha = this.normalizarFecha(this.ventasRaw()[i][idxFechaV]);
          if (fecha) fechasVentas.add(fecha);
        }
        fechasVentas.forEach(fecha => todasLasTasas.set(fecha, promedioActual));
      }

      const resActual = this.calcularResultados(
        this.ventasRaw(),
        this.columnaFechaVentas(),
        this.columnaTotalVentas(),
        todasLasTasas
      );
      this.resultados.set(resActual.resultados);
      this.totalOriginal.set(resActual.totalOrig);
      this.totalConvertido.set(resActual.totalConv);
    }

    // Procesar archivo anterior con tasas anteriores (o tasas actuales como fallback)
    if (this.ventasAnteriorRaw().length >= 2) {
      // Primera pasada: recopilar todas las fechas únicas de ventas anteriores
      const ventasAnteriorRows = this.ventasAnteriorRaw();
      const ventasAnteriorHeaders = ventasAnteriorRows[0];
      const idxFechaAnterior = ventasAnteriorHeaders.indexOf(this.columnaFechaAnterior());
      
      const fechasVentasAnterior = new Set<string>();
      for (let i = 1; i < ventasAnteriorRows.length; i++) {
        const fecha = this.normalizarFecha(ventasAnteriorRows[i][idxFechaAnterior]);
        if (fecha) fechasVentasAnterior.add(fecha);
      }

      // Para fechas de fin de semana sin tasa, buscar la del próximo lunes
      for (const fecha of fechasVentasAnterior) {
        if (todasLasTasasAnteriores.has(fecha)) continue;
        if (promedioAnterior > 0) {
          todasLasTasasAnteriores.set(fecha, promedioAnterior);
          continue;
        }
        if (promedioActual > 0) {
          todasLasTasasAnteriores.set(fecha, promedioActual);
          continue;
        }

        const fechaDate = new Date(fecha + 'T00:00:00');
        const diaSemana = fechaDate.getDay();

        if (diaSemana === 0 || diaSemana === 6) {
          const diasHastaLunes = diaSemana === 6 ? 2 : 1;
          const lunesDate = new Date(fechaDate);
          lunesDate.setDate(lunesDate.getDate() + diasHastaLunes);
          const lunesStr = `${lunesDate.getFullYear()}-${String(lunesDate.getMonth() + 1).padStart(2, '0')}-${String(lunesDate.getDate()).padStart(2, '0')}`;
          const tasaLunes = todasLasTasasAnteriores.get(lunesStr);
          if (tasaLunes) {
            todasLasTasasAnteriores.set(fecha, tasaLunes);
          }
        }
      }

      // Detectar fechas laborales sin tasa
      for (const fecha of fechasVentasAnterior) {
        if (todasLasTasasAnteriores.has(fecha)) continue;
        const fechaDate = new Date(fecha + 'T00:00:00');
        const diaSemana = fechaDate.getDay();
        if (diaSemana !== 0 && diaSemana !== 6) {
          fechasFaltantesAnterior.push(fecha);
        }
      }

      this.fechasSinTasaAnterior.set(fechasFaltantesAnterior);

      const resAnterior = this.calcularResultados(
        this.ventasAnteriorRaw(),
        this.columnaFechaAnterior(),
        this.columnaTotalAnterior(),
        todasLasTasasAnteriores
      );
      this.resultadosAnterior.set(resAnterior.resultados);
      this.totalOriginalAnterior.set(resAnterior.totalOrig);
      this.totalConvertidoAnterior.set(resAnterior.totalConv);
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
    const idxDiaV = ventasHeaders.findIndex(h => h.toUpperCase() === 'DIA');

    if (idxFechaV < 0 || idxTotalV < 0) {
      return { resultados: [], totalOrig: 0, totalConv: 0 };
    }

    const resultados: FilaResultado[] = [];
    let totalOrig = 0;
    let totalConv = 0;

    for (let i = 1; i < ventasRows.length; i++) {
      const row = ventasRows[i];
      const fecha = this.normalizarFecha(row[idxFechaV]);
      const dia = idxDiaV >= 0 ? String(row[idxDiaV] || '') : '';
      const total = this.parseNumber(row[idxTotalV]);

      if (!fecha) continue;

      const fechaDate = new Date(fecha + 'T00:00:00');
      const diaSemana = fechaDate.getDay();

      const tasa = todasLasTasas.get(fecha) || 0;
      const totalConvertido = tasa > 0 ? total / tasa : 0;

      const columnasExtra: Record<string, any> = {};
      ventasHeaders.forEach((h: string, idx: number) => {
        if (idx !== idxFechaV && idx !== idxTotalV) {
          columnasExtra[h] = row[idx];
        }
      });

      resultados.push({
        fecha,
        dia,
        diaSemana,
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
    const anteriores = this.resultadosAnterior();

    if (actuales.length === 0) return;

    const mapaActual = new Map<string, FilaResultado>();
    for (const r of actuales) {
      mapaActual.set(r.fecha, r);
    }

    const mapaAnterior = new Map<string, FilaResultado>();
    for (const r of anteriores) {
      mapaAnterior.set(r.fecha, r);
    }

    const todasLasFechas = new Set<string>([
      ...mapaActual.keys(),
      ...mapaAnterior.keys()
    ]);

    const comparaciones: ComparacionResultado[] = [];
    const comparacionesActualList: ComparacionResultado[] = [];
    const comparacionesAnteriorList: ComparacionResultado[] = [];

    // Listas separadas para cada año
    for (const fecha of Array.from(mapaActual.keys()).sort()) {
      const actual = mapaActual.get(fecha);
      if (actual) {
        comparacionesActualList.push({
          fecha,
          dia: actual.dia || '',
          diaSemana: actual.diaSemana ?? 0,
          totalActual: actual.totalOriginal,
          totalAnterior: 0,
          tasaActual: actual.tasa,
          tasaAnterior: 0,
          convertidoActual: actual.totalConvertido,
          convertidoAnterior: 0,
          variacionPct: 0
        });
      }
    }

    for (const fecha of Array.from(mapaAnterior.keys()).sort()) {
      const anterior = mapaAnterior.get(fecha);
      if (anterior) {
        comparacionesAnteriorList.push({
          fecha,
          dia: anterior.dia || '',
          diaSemana: anterior.diaSemana ?? 0,
          totalActual: 0,
          totalAnterior: anterior.totalOriginal,
          tasaActual: 0,
          tasaAnterior: anterior.tasa,
          convertidoActual: 0,
          convertidoAnterior: anterior.totalConvertido,
          variacionPct: 0
        });
      }
    }

    for (const fecha of todasLasFechas) {
      const actual = mapaActual.get(fecha);
      const anterior = mapaAnterior.get(fecha);

      const totalActual = actual?.totalOriginal ?? 0;
      const totalAnterior = anterior?.totalOriginal ?? 0;
      const tasaActual = actual?.tasa ?? 0;
      const tasaAnterior = anterior?.tasa ?? 0;
      const convertidoActual = actual?.totalConvertido ?? 0;
      const convertidoAnterior = anterior?.totalConvertido ?? 0;

      const variacionPct = totalAnterior > 0
        ? Math.round(((totalActual - totalAnterior) / totalAnterior) * 10000) / 100
        : 0;

      comparaciones.push({
        fecha,
        dia: actual?.dia || anterior?.dia || '',
        diaSemana: actual?.diaSemana ?? anterior?.diaSemana ?? 0,
        totalActual,
        totalAnterior,
        tasaActual,
        tasaAnterior,
        convertidoActual,
        convertidoAnterior,
        variacionPct
      });
    }

    comparaciones.sort((a, b) => a.fecha.localeCompare(b.fecha));
    this.comparaciones.set(comparaciones);
    this.comparacionesActual.set(comparacionesActualList);
    this.comparacionesAnterior.set(comparacionesAnteriorList);

    // Calcular variación total porcentual
    const totalAct = this.totalOriginal();
    const totalAnt = this.totalOriginalAnterior();

    this.variacionTotalPct.set(
      totalAnt > 0 ? Math.round(((totalAct - totalAnt) / totalAnt) * 10000) / 100 : 0
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
      const hasAnterior = this.ventasAnteriorNombre() !== '';

      const compHeaders = ['Fecha', 'Total Actual (Bs)'];
      if (hasAnterior) compHeaders.push('Total Anterior (Bs)', 'Variación %');
      compHeaders.push('Convertido Actual ($)');
      if (hasAnterior) compHeaders.push('Convertido Anterior ($)');

      wsComp.addRow(compHeaders);
      const compHeaderRow = wsComp.getRow(1);
      compHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      compHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };

      for (const c of this.comparaciones()) {
        const row: any[] = [c.fecha, c.totalActual];
        if (hasAnterior) row.push(c.totalAnterior, c.variacionPct + '%');
        row.push(c.convertidoActual);
        if (hasAnterior) row.push(c.convertidoAnterior);
        wsComp.addRow(row);
      }

      // Fila de totales
      const totRow: any[] = ['TOTALES', this.totalOriginal()];
      if (hasAnterior) totRow.push(this.totalOriginalAnterior(), this.variacionTotalPct() + '%');
      totRow.push(this.totalConvertido());
      if (hasAnterior) totRow.push(this.totalConvertidoAnterior());
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
    this.ventasAnteriorNombre.set('');
    this.ventasAnteriorRaw.set([]);
    this.ventasAnteriorColumnas.set([]);
    this.columnaFechaAnterior.set('');
    this.columnaTotalAnterior.set('');
    this.ventasAnteriorPreview.set([]);
    this.resultadosAnterior.set([]);
    this.totalOriginalAnterior.set(0);
    this.totalConvertidoAnterior.set(0);
    // Limpiar tasas anteriores
    this.tasasAnterioresNombre.set('');
    this.tasasAnterioresMap.set(new Map());
    this.tasasAnterioresFilas.set([]);
    this.tasasAnterioresColumnas.set([]);
    this.tasasAnterioresPreview.set([]);
    this.tasasAnterioresManuales.set(new Map());
    this.fechasSinTasaAnterior.set([]);
    this.comparaciones.set([]);
    this.comparacionesActual.set([]);
    this.comparacionesAnterior.set([]);
this.variacionTotalPct.set(0);
     this.mostrarModalComparacion.set(false);
     this.mostrarModalExpectativas.set(false);
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

  asignarTasaAnteriorManual(fecha: string, valor: any) {
    const tasa = parseFloat(valor);
    if (isNaN(tasa) || tasa <= 0) return;
    const manuales = new Map(this.tasasAnterioresManuales());
    manuales.set(fecha, tasa);
    this.tasasAnterioresManuales.set(manuales);
    this.procesarComparacion();
  }

  eliminarTasaAnteriorManual(fecha: string) {
    const manuales = new Map(this.tasasAnterioresManuales());
    manuales.delete(fecha);
    this.tasasAnterioresManuales.set(manuales);
    this.procesarComparacion();
  }

  abrirModalComparacion() {
    this.procesarComparacion();
    this.mostrarModalComparacion.set(true);
  }

cerrarModalExpectativas() {
     this.mostrarModalExpectativas.set(false);
   }

   cerrarModalComparacion() {
     this.mostrarModalComparacion.set(false);
   }

  diferenciaUSD(): number {
    return Math.round((this.totalConvertido() - this.totalConvertidoAnterior()) * 100) / 100;
  }

  variacionUSDPorcentaje(): number {
    const anterior = this.totalConvertidoAnterior();
    if (anterior === 0) return 0;
    return Math.round(((this.totalConvertido() - anterior) / anterior) * 10000) / 100;
  }

  tasaPromedioActual(): number {
    const resultados = this.resultados();
    if (resultados.length === 0) return 0;
    const sumaTasa = resultados.reduce((sum, r) => sum + (r.tasa > 0 ? r.tasa : 0), 0);
    const count = resultados.filter(r => r.tasa > 0).length;
    return count > 0 ? Math.round((sumaTasa / count) * 10000) / 10000 : 0;
  }

  tasaPromedioAnterior(): number {
    const resultados = this.resultadosAnterior();
    if (resultados.length === 0) return 0;
    const sumaTasa = resultados.reduce((sum, r) => sum + (r.tasa > 0 ? r.tasa : 0), 0);
    const count = resultados.filter(r => r.tasa > 0).length;
    return count > 0 ? Math.round((sumaTasa / count) * 10000) / 10000 : 0;
  }

  // Helpers for compact rate input (cent-based shifting)
  formatRateFromCents(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  onRateFocus(kind: 'actual' | 'anterior') {
    if (kind === 'actual') {
      if (this.promedioTasaActualCents() === 0) this.showBlankActual.set(true);
    } else {
      if (this.promedioTasaAnteriorCents() === 0) this.showBlankAnterior.set(true);
    }
  }

  onRateBlur(kind: 'actual' | 'anterior') {
    if (kind === 'actual') {
      this.showBlankActual.set(false);
    } else {
      this.showBlankAnterior.set(false);
    }
  }

  onRateKey(event: KeyboardEvent, kind: 'actual' | 'anterior') {
    const key = event.key;
    const isDigit = /^[0-9]$/.test(key);
    if (isDigit) {
      event.preventDefault();
      const d = parseInt(key, 10);
      if (kind === 'actual') {
        let cents = this.promedioTasaActualCents();
        cents = Math.min(Math.floor(cents * 10 + d), 999999999);
        this.promedioTasaActualCents.set(cents);
        this.promedioTasaActual.set(Math.round((cents / 100) * 10000) / 10000);
        this.showBlankActual.set(false);
      } else {
        let cents = this.promedioTasaAnteriorCents();
        cents = Math.min(Math.floor(cents * 10 + d), 999999999);
        this.promedioTasaAnteriorCents.set(cents);
        this.promedioTasaAnterior.set(Math.round((cents / 100) * 10000) / 10000);
        this.showBlankAnterior.set(false);
      }
      return;
    }

    if (key === 'Backspace') {
      event.preventDefault();
      if (kind === 'actual') {
        let cents = Math.floor(this.promedioTasaActualCents() / 10);
        this.promedioTasaActualCents.set(cents);
        this.promedioTasaActual.set(Math.round((cents / 100) * 10000) / 10000);
      } else {
        let cents = Math.floor(this.promedioTasaAnteriorCents() / 10);
        this.promedioTasaAnteriorCents.set(cents);
        this.promedioTasaAnterior.set(Math.round((cents / 100) * 10000) / 10000);
      }
      return;
    }

    if (key === 'Delete') {
      event.preventDefault();
      if (kind === 'actual') {
        this.promedioTasaActualCents.set(0);
        this.promedioTasaActual.set(0);
      } else {
        this.promedioTasaAnteriorCents.set(0);
        this.promedioTasaAnterior.set(0);
      }
      return;
    }

    // Treat dot as noop (input is cents-shifting); prevent default to avoid caret
    if (key === '.' || key === ',') {
      event.preventDefault();
      return;
    }
  }

  onRatePaste(event: ClipboardEvent, kind: 'actual' | 'anterior') {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') || '';
    const parsed = parseFloat(text.replace(',', '.'));
    if (isNaN(parsed)) return;
    const cents = Math.round(parsed * 100);
    if (kind === 'actual') {
      this.promedioTasaActualCents.set(cents);
      this.promedioTasaActual.set(Math.round((cents / 100) * 10000) / 10000);
      this.showBlankActual.set(false);
    } else {
      this.promedioTasaAnteriorCents.set(cents);
      this.promedioTasaAnterior.set(Math.round((cents / 100) * 10000) / 10000);
      this.showBlankAnterior.set(false);
    }
  }

  getDiaSemanaNum(diaSemana: number): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[diaSemana] || '';
  }

esMismoDiaSemana(dia1: number, dia2: number): boolean {
    return dia1 === dia2;
  }

cumpleMeta(variacion: number): boolean {
     return variacion >= this.metaVariacion();
   }

   getMetaVariacion(): number {
     return this.metaVariacion();
   }

   getPorcCumplimiento(): number {
     const expectativas = this.calcularExpectativas();
     return expectativas.targetUSD > 0 
       ? Math.round((this.totalConvertido() / expectativas.targetUSD) * 10000) / 100 
       : 0;
   }

  formatFechaDisplay(fecha: string | Date | null | undefined): string {
    if (!fecha) return '';
    if (fecha instanceof Date && !isNaN(fecha.getTime())) {
      const dia = String(fecha.getDate()).padStart(2, '0');
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const anio = fecha.getFullYear();
      return `${dia}/${mes}/${anio}`;
    }
    if (typeof fecha === 'string') {
      const isoMatch = fecha.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (isoMatch) {
        const [, year, month, day] = isoMatch;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }
      const parsedDate = new Date(fecha);
      if (!isNaN(parsedDate.getTime())) {
        const dia = String(parsedDate.getDate()).padStart(2, '0');
        const mes = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const anio = parsedDate.getFullYear();
        return `${dia}/${mes}/${anio}`;
      }
    }
    return '';
  }

  getResumenPorDiaSemana(): { dia: string; actual: number; anterior: number; variacion: number }[] {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const actuales = this.resultados();
    const anteriores = this.resultadosAnterior();

    const totalesPorDia = new Map<number, { actual: number; anterior: number }>();

    for (let i = 0; i < 7; i++) {
      totalesPorDia.set(i, { actual: 0, anterior: 0 });
    }

    actuales.forEach(r => {
      const current = totalesPorDia.get(r.diaSemana);
      if (current) {
        current.actual += r.totalConvertido;
      }
    });

    anteriores.forEach(r => {
      const current = totalesPorDia.get(r.diaSemana);
      if (current) {
        current.anterior += r.totalConvertido;
      }
    });

    return Array.from(totalesPorDia.entries()).map(([diaSemana, valores]) => ({
      dia: dias[diaSemana],
      actual: Math.round(valores.actual * 100) / 100,
      anterior: Math.round(valores.anterior * 100) / 100,
      variacion: valores.anterior > 0 
        ? Math.round(((valores.actual - valores.anterior) / valores.anterior) * 10000) / 100 
        : 0
    }));
  }

  getComparacionDiaPorDia(): { fechaActual: string; fechaAnterior: string; dia: string; actual: number; anterior: number; variacion: number }[] {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const actuales = this.resultados();
    const anteriores = this.resultadosAnterior();

    const mapaActual = new Map<number, FilaResultado[]>();
    const mapaAnterior = new Map<number, FilaResultado[]>();

    actuales.forEach(r => {
      const lista = mapaActual.get(r.diaSemana) || [];
      lista.push(r);
      mapaActual.set(r.diaSemana, lista);
    });

    anteriores.forEach(r => {
      const lista = mapaAnterior.get(r.diaSemana) || [];
      lista.push(r);
      mapaAnterior.set(r.diaSemana, lista);
    });

    const resultado: { fechaActual: string; fechaAnterior: string; dia: string; actual: number; anterior: number; variacion: number }[] = [];

    for (let diaSemana = 0; diaSemana < 7; diaSemana++) {
      const diasActual = mapaActual.get(diaSemana) || [];
      const diasAnterior = mapaAnterior.get(diaSemana) || [];

      const maxLen = Math.max(diasActual.length, diasAnterior.length);
      const minLen = Math.min(diasActual.length, diasAnterior.length);

      for (let i = 0; i < minLen; i++) {
        const actual = diasActual[i];
        const anterior = diasAnterior[i];

        const actualUSD = actual?.totalConvertido || 0;
        const anteriorUSD = anterior?.totalConvertido || 0;

        resultado.push({
          fechaActual: actual?.fecha || '',
          fechaAnterior: anterior?.fecha || '',
          dia: dias[diaSemana],
          actual: Math.round(actualUSD * 100) / 100,
          anterior: Math.round(anteriorUSD * 100) / 100,
          variacion: anteriorUSD > 0 ? Math.round(((actualUSD - anteriorUSD) / anteriorUSD) * 10000) / 100 : 0
        });
      }

      if (diasActual.length > diasAnterior.length) {
        const primerDiaAnterior = diasAnterior[0];
        const anteriorUSD = primerDiaAnterior?.totalConvertido || 0;
        
        for (let i = minLen; i < diasActual.length; i++) {
          const actual = diasActual[i];
          const actualUSD = actual?.totalConvertido || 0;

          resultado.push({
            fechaActual: actual?.fecha || '',
            fechaAnterior: primerDiaAnterior?.fecha || '',
            dia: dias[diaSemana],
            actual: Math.round(actualUSD * 100) / 100,
            anterior: Math.round(anteriorUSD * 100) / 100,
            variacion: anteriorUSD > 0 ? Math.round(((actualUSD - anteriorUSD) / anteriorUSD) * 10000) / 100 : 0
          });
        }
      } else if (diasAnterior.length > diasActual.length) {
        const ultimoDiaActual = diasActual[diasActual.length - 1];
        const actualUSD = ultimoDiaActual?.totalConvertido || 0;

        for (let i = minLen; i < diasAnterior.length; i++) {
          const anterior = diasAnterior[i];
          const anteriorUSD = anterior?.totalConvertido || 0;

          resultado.push({
            fechaActual: ultimoDiaActual?.fecha || '',
            fechaAnterior: anterior?.fecha || '',
            dia: dias[diaSemana],
            actual: Math.round(actualUSD * 100) / 100,
            anterior: Math.round(anteriorUSD * 100) / 100,
            variacion: anteriorUSD > 0 ? Math.round(((actualUSD - anteriorUSD) / anteriorUSD) * 10000) / 100 : 0
          });
        }
      }
    }

    return resultado.filter(r => r.fechaActual || r.fechaAnterior);
  }

  procesarSoloAnterior() {
    let todasLasTasasAnteriores = new Map<string, number>([
      ...this.tasasAnterioresMap(),
      ...this.tasasAnterioresManuales()
    ]);

    // Si no hay tasas anteriores, usar las actuales como fallback
    if (todasLasTasasAnteriores.size === 0 && this.tasasMap().size > 0) {
      todasLasTasasAnteriores = new Map(this.tasasMap());
    }

    if (this.ventasAnteriorRaw().length < 2 || todasLasTasasAnteriores.size === 0) return;

    const ventasAnteriorRows = this.ventasAnteriorRaw();
    const ventasAnteriorHeaders = ventasAnteriorRows[0];
    const idxFechaAnterior = ventasAnteriorHeaders.indexOf(this.columnaFechaAnterior());
    const idxTotalAnterior = ventasAnteriorHeaders.indexOf(this.columnaTotalAnterior());

    if (idxFechaAnterior < 0 || idxTotalAnterior < 0) return;

    const fechasFaltantesAnterior: string[] = [];
    const fechasVentasAnterior = new Set<string>();

    for (let i = 1; i < ventasAnteriorRows.length; i++) {
      const fecha = this.normalizarFecha(ventasAnteriorRows[i][idxFechaAnterior]);
      if (fecha) fechasVentasAnterior.add(fecha);
    }

    for (const fecha of fechasVentasAnterior) {
      if (todasLasTasasAnteriores.has(fecha)) continue;
      const fechaDate = new Date(fecha + 'T00:00:00');
      const diaSemana = fechaDate.getDay();

      if (diaSemana === 0 || diaSemana === 6) {
        const diasHastaLunes = diaSemana === 6 ? 2 : 1;
        const lunesDate = new Date(fechaDate);
        lunesDate.setDate(lunesDate.getDate() + diasHastaLunes);
        const lunesStr = `${lunesDate.getFullYear()}-${String(lunesDate.getMonth() + 1).padStart(2, '0')}-${String(lunesDate.getDate()).padStart(2, '0')}`;
        const tasaLunes = todasLasTasasAnteriores.get(lunesStr);
        if (tasaLunes) {
          todasLasTasasAnteriores.set(fecha, tasaLunes);
        }
      }
    }

    for (const fecha of fechasVentasAnterior) {
      if (todasLasTasasAnteriores.has(fecha)) continue;
      const fechaDate = new Date(fecha + 'T00:00:00');
      const diaSemana = fechaDate.getDay();
      if (diaSemana !== 0 && diaSemana !== 6) {
        fechasFaltantesAnterior.push(fecha);
      }
    }

    this.fechasSinTasaAnterior.set(fechasFaltantesAnterior);

    const resAnterior = this.calcularResultados(
      this.ventasAnteriorRaw(),
      this.columnaFechaAnterior(),
      this.columnaTotalAnterior(),
      todasLasTasasAnteriores
    );
    this.resultadosAnterior.set(resAnterior.resultados);
    this.totalOriginalAnterior.set(resAnterior.totalOrig);
    this.totalConvertidoAnterior.set(resAnterior.totalConv);
  }

  abrirModalExpectativas() {
    if (this.ventasRaw().length >= 2 && this.tasasMap().size > 0 && this.resultados().length === 0) {
      this.procesar();
    }
    this.procesarSoloAnterior();
    this.mostrarModalExpectativas.set(true);
  }

  getExpectativasPorDia(): { fecha: string; dia: string; anteriorBs: number; anteriorUSD: number; tasa: number; targetUSD: number; targetBs: number; metaExtraUSD: number; metaExtraBs: number }[] {
    const resultadosAnterior = this.resultadosAnterior();
    const meta = this.metaVariacion();
    
    if (resultadosAnterior.length === 0) return [];
    
    return resultadosAnterior.map(r => {
      const expectativaUSD = r.totalConvertido > 0 
        ? Math.round(r.totalConvertido * (1 + meta / 100) * 100) / 100 
        : 0;
      const metaExtraUSD = expectativaUSD - r.totalConvertido;
      const expectativaBs = r.tasa > 0 
        ? Math.round(expectativaUSD * r.tasa * 100) / 100 
        : 0;
      const metaExtraBs = r.tasa > 0 
        ? Math.round(metaExtraUSD * r.tasa * 100) / 100 
        : 0;
      
      return {
        fecha: r.fecha,
        dia: r.dia || '',
        anteriorBs: r.totalOriginal,
        anteriorUSD: r.totalConvertido,
        tasa: r.tasa,
        targetUSD: expectativaUSD,
        targetBs: expectativaBs,
        metaExtraUSD: metaExtraUSD,
        metaExtraBs: metaExtraBs
      };
    });
  }

    abrirModalImpresion() {
      this.mostrarModalImpresion.set(true);
      this.diasSeleccionados.set(new Set(this.resultadosAnterior().map(r => r.fecha)));
    }

    cerrarModalImpresion() {
      this.mostrarModalImpresion.set(false);
    }

    toggleDiaSeleccionado(fecha: string) {
      const seleccionados = new Set(this.diasSeleccionados());
      if (seleccionados.has(fecha)) {
        seleccionados.delete(fecha);
      } else {
        seleccionados.add(fecha);
      }
      this.diasSeleccionados.set(seleccionados);
    }

    seleccionarTodosLosDias() {
      this.diasSeleccionados.set(new Set(this.resultadosAnterior().map(r => r.fecha)));
    }

    deseleccionarTodosLosDias() {
      this.diasSeleccionados.set(new Set());
    }

imprimirExpectativas() {
       const expectativas = this.getExpectativasPorDia().filter(e => this.diasSeleccionados().has(e.fecha));
       const comentario = this.comentarioImpresion();
       const resultadosAnterior = this.resultadosAnterior();
       
       let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Expectativas de Ventas</title>
          <style>
            @page {
              size: letter portrait;
              margin: 0.2in;
            }
            html, body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              font-size: 8pt;
              box-sizing: border-box;
              height: 100%;
            }
            .container {
              padding: 5px;
              box-sizing: border-box;
              min-height: 100%;
              display: flex;
              flex-direction: column;
            }
            .print-header {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 12px;
            }
            .print-logo {
              width: 140px;
              max-height: 120px;
              object-fit: contain;
            }
            .print-title-section {
              flex: 1;
              text-align: center;
            }
            h1 { color: #1d63c1; text-align: center; font-size: 16pt; margin: 0 0 6px 0; }
            .meta-info { text-align: center; margin-bottom: 6px; font-size: 10.5pt; }
            table { 
              width: 100%; 
              border-collapse: collapse;
              flex: 1;
              font-size: 9pt;
            }
            th, td { 
              border: 1px solid #666; 
              padding: 4px 6px; 
              text-align: left;
              font-size: 9pt;
              line-height: 1.25;
            }
            th { background: #ff9800 !important; color: #111 !important; font-weight: 800 !important; font-size: 10pt !important; }
            th.numeric, td.numeric { text-align: right; }
            .expectativa-meta { text-align: right; }
            .comment { 
              margin-top: auto;
              margin-bottom: 5px;
              padding: 5px; 
              background: #f5f5f5; 
              border-radius: 3px;
              font-size: 8pt;
            }
            .footer { 
              margin-top: 10px; 
              font-size: 10pt; 
              color: #333;
              font-weight: 600;
              text-align: right;
            }
            input[type="checkbox"] { 
              width: 16px; 
              height: 16px; 
              margin: 0;
              padding: 0;
            }
            .cumplido-checkbox {
              padding: 0 !important;
              text-align: center;
              width: 22px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="print-header">
              <img src="/public/ESCOLARES%20AZUL%20RIF%20GRANDE.png" class="print-logo" alt="Escolares logo" onerror="this.style.display='none'">
              <div class="print-title-section">
                <h1>Metas Ventas</h1>
                <div class="meta-info">Período de ventas: ${resultadosAnterior.length > 0 ? this.formatFechaDisplay(resultadosAnterior[0].fecha) + ' - ' + this.formatFechaDisplay(resultadosAnterior[resultadosAnterior.length - 1].fecha) : '-'}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
          `;
      
      if (this.columnaFechaVisible()) html += '<th>Fecha</th>';
      if (this.columnaDiaVisible()) html += '<th>Día</th>';
      if (this.columnaAnteriorBsVisible()) html += '<th class="numeric">Ventas Ant. (Bs)</th>';
      if (this.columnaAnteriorUSDVisible()) html += '<th class="numeric">Ventas Ant. ($)</th>';
      if (this.columnaTasaVisible()) html += '<th class="numeric">Tasa</th>';
if (this.columnaMetaExtraUSDVisible()) html += '<th class="numeric">Meta ($)</th>';
       if (this.columnaMetaExtraBsVisible()) html += '<th class="numeric">Meta (Bs)</th>';
       if (this.columnaTargetUSDVisible()) html += '<th class="numeric">Total ($)</th>';
       if (this.columnaTargetBsVisible()) html += '<th class="numeric">Total (Bs)</th>';
      html += '<th>Cumplido</th>';
      
      html += `
              </tr>
            </thead>
            <tbody>
      `;
      
      for (const e of expectativas) {
        html += '<tr>';
        if (this.columnaFechaVisible()) html += `<td>${this.formatFechaDisplay(e.fecha)}</td>`;
        if (this.columnaDiaVisible()) html += `<td>${e.dia}</td>`;
if (this.columnaAnteriorBsVisible()) html += `<td class="expectativa-anterior-bs numeric">Bs ${this.formatearMoneda(e.anteriorBs)}</td>`;
         if (this.columnaAnteriorUSDVisible()) html += `<td class="expectativa-anterior-usd numeric">$${this.formatearMoneda(e.anteriorUSD)}</td>`;
if (this.columnaTasaVisible()) html += `<td class="expectativa-tasa numeric">${e.tasa > 0 ? this.formatearMoneda(e.tasa) : '-'}</td>`;
         if (this.columnaMetaExtraUSDVisible()) html += `<td class="meta-extra-usd numeric">$${this.formatearMoneda(e.metaExtraUSD)}</td>`;
         if (this.columnaMetaExtraBsVisible()) html += `<td class="meta-extra-bs numeric">Bs ${this.formatearMoneda(e.metaExtraBs)}</td>`;
         if (this.columnaTargetUSDVisible()) html += `<td class="expectativa-target-usd numeric">$${this.formatearMoneda(e.targetUSD)}</td>`;
         if (this.columnaTargetBsVisible()) html += `<td class="expectativa-target-bs numeric">Bs ${this.formatearMoneda(e.targetBs)}</td>`;
         html += '<td class="cumplido-checkbox"><input type="checkbox"></td>';
        html += '</tr>';
      }
      
html += `
             </tbody>
           </table>
           
           <div style="flex: 1; min-height: 20px;"></div>
       `;
       
       if (comentario) {
         html += `<div class="comment" style="margin-top: auto;"><strong>Comentario:</strong><br>${comentario.replace(/\n/g, '<br>')}</div>`;
       }
      
      html += `<div class="footer"><p>Fecha: ${this.formatFechaDisplay(new Date())}</p></div>
          </div>
<script>
(function(){
  function doPrint(){ try{ window.focus(); window.print(); }catch(e){} }
  function whenImagesLoaded(cb){
    var imgs = document.images, total = imgs.length; if(total === 0){ cb(); return; }
    var count = 0; function check(){ if(++count >= total) cb(); }
    for(var i=0;i<total;i++){ if(imgs[i].complete) check(); else { imgs[i].addEventListener('load', check); imgs[i].addEventListener('error', check); } }
  }
  whenImagesLoaded(function(){ setTimeout(doPrint, 120); });
})();
</script>
          </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        this.cerrarModalImpresion();
      }
    }

  imprimirComparacionDiaPorDia() {
    const comparacion = this.getComparacionDiaPorDia();
    const totalActual = this.totalConvertido();
    const totalAnterior = this.totalConvertidoAnterior();
    const variacion = this.variacionUSDPorcentaje();

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comparación Día a Día</title>
        <style>
          @page {
            size: letter portrait;
            margin: 0.2in;
          }
          html, body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            font-size: 8pt;
            box-sizing: border-box;
            height: 100%;
          }
          .container {
            padding: 6px;
            box-sizing: border-box;
            min-height: 100%;
            display: flex;
            flex-direction: column;
          }
          .print-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
          }
          .print-logo {
            width: 140px;
            max-height: 120px;
            object-fit: contain;
          }
          .print-title-section {
            flex: 1;
            text-align: center;
          }
          h1 { color: #e65100; text-align: center; font-size: 16pt; margin: 0 0 6px 0; }
          .meta-info { text-align: center; margin-bottom: 6px; font-size: 10.5pt; }
          table {
            width: 100%;
            border-collapse: collapse;
            flex: 1;
            font-size: 8.5pt;
          }
          th, td {
            border: 1px solid #666;
            padding: 4px 6px;
            text-align: left;
            font-size: 9pt;
            line-height: 1.25;
          }
          th { background: #e65100 !important; color: #111 !important; font-weight: 800 !important; font-size: 10pt !important; }
          th.numeric, td.numeric { text-align: right; }
          .footer {
            margin-top: 6px;
            font-size: 10pt;
            color: #333;
            font-weight: 600;
            text-align: right;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="print-header">
            <img src="/public/ESCOLARES%20AZUL%20RIF%20GRANDE.png" class="print-logo" alt="Escolares logo" onerror="this.style.display='none'">
            <div class="print-title-section">
              <h1>📊 Comparación Día a Día</h1>
              <div class="meta-info">Meta: ${this.metaVariacion()}% | Total Actual: $ ${this.formatearMoneda(totalActual)} | Total Anterior: ${totalAnterior > 0 ? '$ ' + this.formatearMoneda(totalAnterior) : '-'}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Día</th>
                <th>Fecha Año Actual</th>
                <th class="numeric">Actual ($)</th>
                <th>Fecha Año Anterior</th>
                <th class="numeric">Anterior ($)</th>
                <th class="numeric">Var. (%)</th>
              </tr>
            </thead>
            <tbody>
    `;

    for (const r of comparacion) {
      html += `
              <tr>
                <td>${r.dia}</td>
                <td>${this.formatFechaDisplay(r.fechaActual)}</td>
                <td class="numeric">${r.actual > 0 ? '$ ' + this.formatearMoneda(r.actual) : '-'}</td>
                <td>${this.formatFechaDisplay(r.fechaAnterior)}</td>
                <td class="numeric">${r.anterior > 0 ? '$ ' + this.formatearMoneda(r.anterior) : '-'}</td>
                <td class="numeric">${r.variacion > 0 ? '+' : ''}${r.variacion}%</td>
              </tr>
      `;
    }

    html += `
            </tbody>
            <tfoot>
              <tr>
                <td><strong>TOTAL</strong></td>
                <td></td>
                <td></td>
                <td class="numeric"><strong>$ ${this.formatearMoneda(totalActual)}</strong></td>
                <td class="numeric"><strong>${totalAnterior > 0 ? '$ ' + this.formatearMoneda(totalAnterior) : '-'}</strong></td>
                <td class="numeric"><strong>${variacion > 0 ? '+' : ''}${variacion}%</strong></td>
              </tr>
            </tfoot>
          </table>
          <div class="footer">Fecha: ${this.formatFechaDisplay(new Date())}</div>
        </div>
<script>
(function(){
  function doPrint(){ try{ window.focus(); window.print(); }catch(e){} }
  function whenImagesLoaded(cb){
    var imgs = document.images, total = imgs.length; if(total === 0){ cb(); return; }
    var count = 0; function check(){ if(++count >= total) cb(); }
    for(var i=0;i<total;i++){ if(imgs[i].complete) check(); else { imgs[i].addEventListener('load', check); imgs[i].addEventListener('error', check); } }
  }
  whenImagesLoaded(function(){ setTimeout(doPrint, 120); });
})();
</script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  }
}

