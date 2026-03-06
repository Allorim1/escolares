import { Component, signal, OnInit, inject, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, of, timeout } from 'rxjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Tasa {
  costo: number;
  iva: number;
  cargoPersonalizado: number;
  dolar: number;
  euro: number;
  binance: number;
  pvpBsf: number;
  pvpDolar: number;
}

interface CostoGuardado {
  _id?: any;
  costo: number;
  iva: number;
  cargoPersonalizado: number;
  dolar: number;
  euro: number;
  binance: number;
  pvpBsf: number;
  pvpDolar: number;
  tasaPvp: string;
  ivaActivo: boolean;
  fecha: Date;
}

@Component({
  selector: 'app-costo-tasa',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './costo-tasa.html',
  styleUrl: './costo-tasa.css',
})
export class CostoTasa implements OnInit {
  @ViewChild('tablaCostos') tablaCostos!: ElementRef;

  private http = inject(HttpClient);

  tasa = signal<Tasa>({
    costo: 0,
    iva: 0,
    cargoPersonalizado: 0,
    dolar: 0,
    euro: 0,
    binance: 0,
    pvpBsf: 0,
    pvpDolar: 0,
  });

  costo = signal(0);
  ivaActivo = signal(false);
  cargoPersonalizadoPorcentaje = signal(10);
  dolar = signal(0);
  euro = signal(0);
  binance = signal(0);

  tasaPvp = signal<'dolar' | 'euro' | 'binance'>('dolar');

  loadingTasa = signal(false);
  tasaError = signal<string | null>(null);
  costosGuardados = signal<CostoGuardado[]>([]);
  saving = signal(false);

  private readonly API_DOLAR = 'http://localhost:3000/api/tasas';
  private readonly API_COSTOS = 'http://localhost:3000/api/costos';

  ngOnInit() {
    this.loadTasas();
    this.loadCostos();
  }

  loadCostos() {
    this.http
      .get<CostoGuardado[]>(this.API_COSTOS)
      .pipe(
        catchError((err) => {
          console.error('Error loading costos:', err);
          return of([]);
        }),
      )
      .subscribe((data) => {
        this.costosGuardados.set(data);
      });
  }

  guardarCosto() {
    this.saving.set(true);
    const costoData = {
      costo: this.tasa().costo,
      iva: this.tasa().iva,
      cargoPersonalizado: this.tasa().cargoPersonalizado,
      dolar: this.tasa().dolar,
      euro: this.tasa().euro,
      binance: this.tasa().binance,
      pvpBsf: this.tasa().pvpBsf,
      pvpDolar: this.tasa().pvpDolar,
      tasaPvp: this.tasaPvp(),
      ivaActivo: this.ivaActivo(),
    };

    this.http
      .post(this.API_COSTOS, costoData)
      .pipe(
        catchError((err) => {
          console.error('Error guardando costo:', err);
          return of(null);
        }),
      )
      .subscribe(() => {
        this.saving.set(false);
        this.loadCostos();
      });
  }

  eliminarCosto(id: any) {
    this.http
      .delete(`${this.API_COSTOS}/${id}`)
      .pipe(
        catchError((err) => {
          console.error('Error eliminando costo:', err);
          return of(null);
        }),
      )
      .subscribe(() => {
        this.loadCostos();
      });
  }

  toggleIva(item: CostoGuardado, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const nuevoIva = checked ? item.costo * 0.16 : 0;

    const tasaSeleccionada = item.tasaPvp;
    let tasa = 0;
    if (tasaSeleccionada === 'dolar') {
      tasa = item.dolar;
    } else if (tasaSeleccionada === 'euro') {
      tasa = item.euro;
    } else if (tasaSeleccionada === 'binance') {
      tasa = item.binance;
    }

    const pvpDolar = item.costo + nuevoIva + item.cargoPersonalizado;
    const pvpBsf = pvpDolar * tasa;

    this.http
      .put(`${this.API_COSTOS}/${item._id}`, {
        ivaActivo: checked,
        iva: nuevoIva,
        pvpBsf: Math.round(pvpBsf * 100) / 100,
        pvpDolar: Math.round(pvpDolar * 100) / 100,
      })
      .pipe(
        catchError((err) => {
          console.error('Error actualizando IVA:', err);
          return of(null);
        }),
      )
      .subscribe(() => {
        this.loadCostos();
      });
  }

  generarPdf() {
    const element = this.tablaCostos.nativeElement;
    const acciones = element.querySelectorAll('th:last-child, td:last-child');

    acciones.forEach((el: any) => {
      el.style.display = 'none';
    });

    html2canvas(element, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');

      const imgWidth = 280;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save('costos-guardados.pdf');

      acciones.forEach((el: any) => {
        el.style.display = '';
      });
    });
  }

  imprimirCostos() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const costos = this.costosGuardados();
    let tablaHtml = `
      <html>
        <head>
          <title>Costos Guardados</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { color: #1d63c1; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: center; }
            th { background: #1d63c1; color: white; }
            tr:nth-child(even) { background: #f8f9fa; }
            .iva-checkbox { display: flex; align-items: center; justify-content: center; }
          </style>
        </head>
        <body>
          <h2>Costos Guardados</h2>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Costo</th>
                <th>IVA</th>
                <th>Tasa PVP</th>
                <th>Utilidad $</th>
                <th>PVP Bs</th>
                <th>PVP $</th>
              </tr>
            </thead>
            <tbody>
    `;

    for (const item of costos) {
      tablaHtml += `
        <tr>
          <td>${new Date(item.fecha).toLocaleString('es-VE')}</td>
          <td>$${item.costo.toFixed(2)}</td>
          <td>${item.ivaActivo ? 'Sí' : 'No'} ($${item.iva.toFixed(2)})</td>
          <td>${item.tasaPvp.toUpperCase()}</td>
          <td>$${item.cargoPersonalizado.toFixed(2)}</td>
          <td>Bs ${item.pvpBsf.toFixed(2)}</td>
          <td>$${item.pvpDolar.toFixed(2)}</td>
        </tr>
      `;
    }

    tablaHtml += `
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(tablaHtml);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }

  loadTasas() {
    this.loadingTasa.set(true);
    this.tasaError.set(null);

    this.http
      .get<any>(this.API_DOLAR)
      .pipe(
        timeout(10000),
        catchError((err) => {
          console.error('Error loading tasas:', err);
          return of(null);
        }),
      )
      .subscribe({
        next: (data) => {
          if (!data) {
            this.tasaError.set('No se pudieron cargar las tasas. Ingrésalas manualmente.');
            this.loadingTasa.set(false);
            return;
          }
          try {
            const usd = data.current?.usd;
            const eur = data.current?.eur;
            const binance = data.current?.binance;

            console.log('API Response:', data);

            if (usd) {
              const dolarValue = parseFloat(String(usd).replace(',', '.'));
              if (!isNaN(dolarValue)) {
                this.dolar.set(dolarValue);
              }
            }

            if (eur) {
              const euroValue = parseFloat(String(eur).replace(',', '.'));
              if (!isNaN(euroValue)) {
                this.euro.set(euroValue);
              }
            }

            if (binance) {
              const binanceValue = parseFloat(String(binance).replace(',', '.'));
              if (!isNaN(binanceValue)) {
                this.binance.set(binanceValue);
              }
            }

            this.calculatePVP();
          } catch (e) {
            console.error('Error parsing tasas:', e);
            this.tasaError.set('Error al procesar las tasas. Ingrésalas manualmente.');
          } finally {
            this.loadingTasa.set(false);
          }
        },
        error: (err) => {
          console.error('Error loading tasas:', err);
          let mensaje = 'No se pudieron cargar las tasas.';
          if (err.status === 401) {
            mensaje = 'API key inválida. Ingrésalas manualmente.';
          } else if (err.status === 0) {
            mensaje = 'Error de conexión. Verifica tu internet.';
          }
          this.tasaError.set(mensaje);
          this.loadingTasa.set(false);
        },
      });
  }

  calculatePVP() {
    const costoBase = this.costo();
    const ivaAmount = this.ivaActivo() ? costoBase * 0.16 : 0;
    const costoConIva = costoBase + ivaAmount;

    const cargoPorcentaje = this.cargoPersonalizadoPorcentaje() / 100;
    const pvpDolarConCargo = costoConIva * (1 + cargoPorcentaje);

    const dolar = this.dolar() * costoConIva;
    const euro = this.euro() * costoConIva;
    const binance = this.binance() * costoConIva;

    const pvpDolarValue = pvpDolarConCargo;

    const tasaSeleccionada = this.tasaPvp();
    let pvpBsfValue = 0;
    if (tasaSeleccionada === 'dolar') {
      pvpBsfValue = pvpDolarValue * this.dolar();
    } else if (tasaSeleccionada === 'euro') {
      pvpBsfValue = pvpDolarValue * this.euro();
    } else if (tasaSeleccionada === 'binance') {
      pvpBsfValue = pvpDolarValue * this.binance();
    }

    this.tasa.set({
      costo: costoBase,
      iva: ivaAmount,
      cargoPersonalizado: pvpDolarConCargo - costoConIva,
      dolar,
      euro,
      binance,
      pvpBsf: Math.round(pvpBsfValue * 100) / 100,
      pvpDolar: Math.round(pvpDolarValue * 100) / 100,
    });
  }

  onCostoChange(value: number) {
    this.costo.set(value);
    this.calculatePVP();
  }

  onCostoFocus(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    if (this.costo() === 0) {
      input.value = '';
    }
  }

  onCostoBlur(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    if (input.value === '') {
      this.costo.set(0);
      this.calculatePVP();
    }
  }

  onIvaActivoChange(value: boolean) {
    this.ivaActivo.set(value);
    this.calculatePVP();
  }

  onCargoPersonalizadoPorcentajeChange(value: number) {
    this.cargoPersonalizadoPorcentaje.set(value);
    this.calculatePVP();
  }

  onUtilidadFocus(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    if (this.cargoPersonalizadoPorcentaje() === 10) {
      input.value = '';
    }
  }

  onUtilidadBlur(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    if (input.value === '') {
      this.cargoPersonalizadoPorcentaje.set(10);
      this.calculatePVP();
    }
  }

  onDolarChange(value: number) {
    this.dolar.set(value);
    this.calculatePVP();
  }

  onEuroChange(value: number) {
    this.euro.set(value);
    this.calculatePVP();
  }

  onBinanceChange(value: number) {
    this.binance.set(value);
    this.calculatePVP();
  }

  onTasaPvpChange(value: 'dolar' | 'euro' | 'binance') {
    this.tasaPvp.set(value);
    this.calculatePVP();
  }

  onEnterBlur(event: Event) {
    (event.target as HTMLInputElement).blur();
  }
}
