import { Injectable, inject } from '@angular/core';
import { Cotizacion } from '../interfaces/cotizacion.interface';
import { HttpClient } from '@angular/common/http';
import { CurrencyService } from '../data-access/currency.service';

// Declaración para window.pdfMake (cargado desde CDN en index.html)
declare const pdfMake: any;

export interface ConstanciaTrabajo {
  nombreCompleto: string;
  cedula: string;
  cargo: string;
  departamento: string;
  fechaIngreso: string;
  fechaEmision: string;
  sueldoMensual: string;
}

export interface ConstanciaComercial {
  destino: string;
  titular: string;
  cedula: string;
  desdeFecha: string;
  diasCredito: string;
  cifras: string;
  tipoCifras: string;
  fecha: string;
}

export interface ConstanciaPersonal {
  nombreCompleto: string;
  cedula: string;
  direccion: string;
  motivo: string;
  fechaEmision: string;
}

export interface ReciboPago {
  nombrePagador: string;
  cedula: string;
  concepto: string;
  monto: number;
  moneda: string;
  fechaPago: string;
  numeroRecibo: string;
}

@Injectable({
  providedIn: 'root',
})
export class ExportarPdfService {
  private http = inject(HttpClient);
  private currencyService = inject(CurrencyService);


   formatFecha(fechaRaw: string | Date): string {
    if (typeof fechaRaw === 'string') {
      const parts = fechaRaw.split('-');
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    }
    const date = new Date(fechaRaw);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }

private cargarImagenLocal(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fetch(url)
        .then(response => response.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject('Error leyendo imagen');
          reader.readAsDataURL(blob);
        })
        .catch(() => reject('No se pudo cargar la imagen: ' + url));
    });
  }

private rotarImagen90(imageBase64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject('No se pudo obtener el contexto del canvas');
        return;
      }

      const angleRad = (-10 * Math.PI) / 180;
      const sin = Math.abs(Math.sin(angleRad));
      const cos = Math.abs(Math.cos(angleRad));

      // Recalcula el lienzo para no recortar las esquinas al rotar
      canvas.width = img.width * cos + img.height * sin;
      canvas.height = img.width * sin + img.height * cos;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(angleRad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject('Error cargando imagen para rotar');
    img.src = imageBase64;
  });
}

async generarCotizacionPdf(data: Cotizacion) {
    let logoBase64 = '';
    try {
      logoBase64 = await this.cargarImagenLocal('/ESCOLARES AZUL RIF GRANDE.png');
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e);
    }

    const MAX_ARTICULOS = 12;
    const articulosActuales = data.items ? data.items.length : 0;

    const lineasFaltantes = Math.max(0, MAX_ARTICULOS - articulosActuales);
    const stringRelleno = '\n'.repeat(lineasFaltantes * 2);

    const ivaCalculado = data.items.reduce((sum: number, item: any) => {
      const tieneIva = item.tieneIva ?? false;
      const itemIvaPorcentaje = item.ivaPorcentaje ?? 16;
      if (!tieneIva) return sum;
      const discountedBase = (item.montoTotalBs * (100 - data.totales.porcentajeDescuento)) / 100;
      return sum + (discountedBase * itemIvaPorcentaje) / 100;
    }, 0);

    const docDefinition: any = {
      content: [
        {
          columns: [
            {
              width: '28%',
              stack: [
                ...(logoBase64 ? [{ image: logoBase64, width: 200, margin: [0, 0, 0, 2] }] : [{ text: 'ESCOLARES', fontSize: 16, bold: true, margin: [0, 0, 0, 2] }]),
              ]
            },
            {
              text: [
                { text: 'Calle Girardoth, entre Av. Constitucion y diaz Moreno\n', style: 'datosEmpresa' },
                { text: 'Telf. 0241-8580281 WhatsApp. 04144329235\n', style: 'datosEmpresa' },
                { text: 'Valencia Edo. Carabobo\n', style: 'datosEmpresa' },
                { text: 'R.I.F.: J-30488367-6\n',  style: 'datosEmpresa'  },
                { text: 'www.escolaresonline.com', style: 'webSite' }
              ],
              width: '48%',
              alignment: 'center',
              margin: [0, -10, 0, 0]

            },
            {
              stack: [
                { text: 'COTIZACION', style: 'tituloDoc' },
                { text: data.numeroCotizacion, style: 'numeroDoc', alignment: 'center'  },
              ],
              alignment: 'right',
              width: '24%',
              margin: [0, 10, 0, 0]
            }
          ]
        },

        { text: '', margin: [0, 10]},

        // CONTENEDOR UNIFICADO: Una sola tabla para igualar las alturas de forma nativa y exacta
        {
          table: {
            widths: ['54%', '2%', '44%'],
            body: [
              [
                // --- CELDA IZQUIERDA: CUADRO DE CLIENTE ---
                // Al ser una celda de la misma fila, se estira automáticamente a la altura de la derecha.
                {
                  stack: [
                    { text: 'CLIENTE:', style: 'labelCliente', bold: true, margin: [2, 2, 0, 0] },
                    { text: data.cliente.nombre, style: 'valorCliente', margin: [2, 4, 0, 4] },
                    { text: data.cliente.direccion ? `Dirección: ${data.cliente.direccion}` : ' ', style: 'campoCliente', margin: [2, 2, 0, 0] }
                  ],
                  // Usamos un margen interno inferior alto (margin: [left, top, right, bottom])
                  // para "empujar" los bordes de la celda y dejar el espacio para el RIF abajo
                  padding: [6, 4, 6, 20], 
                  borderColor: ['#000000', '#000000', '#000000', '#000000']
                },

                // --- ESPACIADOR CENTRAL (SIN BORDES) ---
                { text: '', border: [false, false, false, false] },

                // --- CELDA DERECHA: BLOQUE DE FECHA Y VALIDEZ (Se mantiene estructurado) ---
                {
                  stack: [
                    {
                      table: {
                        widths: [65, 45, '*'],
                        body: [
                          [{ text: 'FECHA', style: 'thControl'}, { text: '', colSpan: 2, border: [false, false, false, false]}],
                          [{ text: this.formatFecha(data.fecha), style: 'tdControl'}, { text: '', colSpan: 2, border: [false, false, false, false]} ]
                        ]
                      },
                      layout: 'cuadroNegro',
                      margin: [0, 0, 0, -1]
                    },
                    {
                      table: {
                        widths: [65, 45, '*'],
                        body: [
                          [{ text: 'VALIDEZ', style: 'thControl'}, { text: 'Zona No.', style: 'thControl'}, { text: 'VENDEDOR', style: 'thControl' }],
                          [
                            { text: `${data.referencia.validezDias} dias`, style: 'tdControl'},
                            { text: data.referencia.nroZona || '', style: 'tdControl' },
                            { text: data.referencia.vendedor || '', style: 'tdControl' }
                          ]
                        ]
                      },
                      layout: 'cuadroNegro'
                    }
                  ],
                  border: [false, false, false, false] // Quitamos el borde externo porque este bloque ya tiene sus propias tablas
                }
              ],
              
              // --- FILA INFERIOR EXCLUSIVA PARA EL RIF Y EL TELÉFONO ---
              // Al ponerlos en una fila separada justo debajo, garantizamos que se alineen horizontalmente al ras inferior de toda la estructura
              [
                {
                  // Esta celda se dibuja justo debajo del cuadro del cliente compartiendo paredes
                  columns: [
                    { text: `RIF: ${data.cliente.rif}`, style: 'campoCliente', width: 'auto', margin: [2, 0, 0, 2] },
                    { text: data.cliente.telefono ? `Teléfono: ${data.cliente.telefono}` : '', style: 'campoCliente', alignment: 'right', width: '*' }
                  ],
                  margin: [0, -12, 0, 0], // Sube el texto ligeramente para que quede adentro del cuadro visual del cliente
                  border: [false, false, false, false]
                },
                { text: '', border: [false, false, false, false] },
                { text: '', border: [false, false, false, false] }
              ]
            ]
          },
          layout: {
            // Layout a la medida para pintar solo el recuadro exterior del cliente
            hLineWidth: (i: number) => (i === 0 || i === 1) ? 1 : 0,
            vLineWidth: (i: number) => (i === 0 || i === 1) ? 1 : 0,
            hLineColor: () => '#000000',
            vLineColor: () => '#000000',
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0
          },
          margin: [0, 0, 0, 3]
        },
        // --- TABLA UNIFICADA: ARTÍCULOS + RELLENO + TOTALES ---
        // --- TABLA UNIFICADA: ARTÍCULOS, RELLENO, CONDICIONES Y TOTALES SIN BORDES ---
        {
          table: {
            widths: ['auto', 'auto', '*', 'auto', 'auto'],
            body: [
              // Encabezados de la tabla (Mantienen su layout comercial normal)
              [
                { text: 'CODIGO', style: 'headerCen' },
                { text: 'CANTIDAD', style: 'headerCen', alignment: 'center' },
                { text: 'D E S C R I P C I O N', style: 'headerCen' },
                { text: 'P. UNITARIO Bs.', style: 'headers', alignment: 'right' },
                { text: 'MONTO TOTAL Bs.', style: 'headers', alignment: 'right' }
              ],
              
              // Artículos dinámicos
              ...data.items.map(item => [
                { text: item.codigo, alignment: 'left', style: 'tdMini', border: [true, false, true, false] },
                { text: item.cantidad.toString(), alignment: 'center', style: 'tdMini', border: [true, false, true, false] },
                { text: item.descripcion, style: 'tdMini', border: [true, false, true, false] },
                { text: item.precioUnitarioBs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), alignment: 'right', style: 'tdMini', border: [true, false, true, false] },
                { text: item.montoTotalBs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), alignment: 'right', style: 'tdMini', border: [true, false, true, false] }
              ]),

              // Fila de relleno para espaciado
              [
                { text: '', style: 'tdRelleno', border: [true, false, true, true] },
                { text: '', style: 'tdRelleno', border: [true, false, true, true] },
                { text: stringRelleno, style: 'tdRelleno', border: [true, false, true, true] },
                { text: '', style: 'tdRelleno', border: [true, false, true, true] },
                { text: '', style: 'tdRelleno', border: [true, false, true, true] }
              ],

              // --- FILAS DE TOTALES: SOLO EL MONTO TIENE RECUADRO ---
              [
                {
                  rowSpan: 6, // Mantiene el bloque informativo alineado arriba al ras del NETO
                  stack: [
                    { text: 'LOS PRECIOS ESTAN SUJETOS A CAMBIOS SIN PREVIO AVISO', fontSize: 6.5 },
                    { text: 'NO SE ACEPTAN DEVOLUCIONES DESPUES DE 48 HORAS DE RECIBIDA LA MERCANCIA', fontSize: 6.5, margin: [0, 1, 0, 3] },
                    { text: 'FAVOR TRANSFERENCIA BANCARIA A NOMBRE DE: ESCOLARES, C.A.   R.I.F.: J-30488367-6', fontSize: 7.5, bold: true, margin: [0, 1, 0, 1] },
                    { text: 'A CUALQUIERA DE NUESTRAS CUENTAS CORRIENTES:', fontSize: 7, bold: true },
                    { text: 'VENEZUELA: 0102-0391-16-0000000589        BANESCO: 0134-0187-08-1871037067', fontSize: 7.5, bold: true, margin: [0, 1, 0, 1] },
                    { text: 'PAGO MOVIL BANESCO: RIF: 304883676 TELF. 04144000800, ESCOLARES CA.', fontSize: 7.5, bold: true, margin: [0, 2, 0, 1] },
                    { text: 'AL REALIZAR SU TRANSFERENCIA REPORTAR EL PAGO A: cobranzascorp@escolaresonline.com', fontSize: 7, bold: true, italic: true },
                  ],
                  colSpan: 3,
                  border: [false, false, false, false],
                  margin: [0, 6, 10, 0]
                },
                '', '', 
                { text: 'NETO Bs.', style: 'labelTotalBold', border: [false, false, false, false] },
                { text: data.totales.netoBs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), style: 'valorTotalDerecha', fillColor: '#DBDBDB', border: [true, true, true, true] }
              ],
              [
                '', '', '', 
                { text: `DESCUENTO ${data.totales.porcentajeDescuento.toLocaleString('de-DE', { minimumFractionDigits: 2 })}% Bs.`, style: 'labelTotalBold', border: [false, false, false, false] },
                { text: data.totales.descuentoBs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), style: 'valorTotalDerecha', fillColor: '#DBDBDB', border: [true, true, true, true] }
              ],
              [
                '', '', '', 
                { text: 'SUB TOTAL Bs.', style: 'labelTotalBold', border: [false, false, false, false] },
                { text: data.totales.subTotalBs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), style: 'valorTotalDerecha', fillColor: '#DBDBDB', border: [true, true, true, true] }
              ],
              [
                '', '', '', 
                { text: `I.V.A. ${data.totales.ivaPorcentaje}% Bs.`, style: 'labelTotalBold', border: [false, false, false, false] },
                { text: ivaCalculado.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), style: 'valorTotalDerecha', fillColor: '#DBDBDB', border: [true, true, true, true] }
              ],
              [
                '', '', '', 
                { text: 'EXENTO Bs.', style: 'labelTotalBold', border: [false, false, false, false] },
                { text: data.totales.exentoBs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), style: 'valorTotalDerecha', fillColor: '#DBDBDB', border: [true, true, true, true] }
              ],
              [
                '', '', '', 
                { text: 'TOTAL Bs.', style: 'labelTotalBold', border: [false, false, false, false] },
                { text: data.totales.totalBs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), style: 'valorTotalBoldDerecha', fillColor: '#EAEAEA', border: [true, true, true, true] }
              ]
            ]
          },
          layout: 'tablaComercial'
        },

        // --- OBSERVACIONES Y FIRMAS (COMPACTADAS) ---
        {
          margin: [0, 60, 0, 0], // Reducido de 40 a 20 para ahorrar mucho espacio vertical
          columns: [
            { width: '50%', text: [{ text: 'OBSERVACIONES: ', bold: true, fontSize: 7.5}, { text: `EL TOTAL DE LA COTIZACIÓN SE REGIRA POR LA REFERENCIA ESTABLECIDA NRO: ${this.currencyService.currentTasa() > 0 ? (data.totales.totalBs / this.currencyService.currentTasa()).toFixed(2) : '0.00'}`, fontSize: 7.5}]},
            { width: '25%', text: '_______________________\nELABORADO POR', alignment: 'center', style: 'firma', margin: [0, 0, 0, 2] },
            { width: '25%', text: '_______________________\nRECIBIDO POR\nFIRMA Y SELLO', alignment: 'center', style: 'firma', bold: true }
          ]
        }
      ],

      // --- AJUSTE DE ESTILOS GLOBALES ---
      styles: {
        headerTitle: { fontSize: 16, bold: true, color: '#0d3b66' },
        headerSub: { fontSize: 10, bold: true },
        datosEmpresa: { fontSize: 10, bold: true, color: '#000000' },
        webSite: { fontSize: 9, bold: true, color: '#D32F2F' },
        tituloDoc: { fontSize: 18, bold: true, tracking: 1 },
        numeroDoc: { fontSize: 14, bold: true, color: '#000000' },
        fechaDoc: { fontSize: 9, bold: true },
        seccionCliente: { fontSize: 9, lineHeight: 1.2 },
        thMini: { fontSize: 7, bold: true, fillColor: '#EEEEEB', alignment: 'center' },
        tdMini: { fontSize: 7.5 }, // Reducido de 8 a 7.5
        headers: { fontSize: 7.5, bold: true, fillColor: '#DBDBDB' }, // Reducido de 8 a 7.5
        headerCen: { fontSize: 8.5, bold: true, alignment: 'center', fillColor: '#DBDBDB'}, // Reducido de 9 a 8.5
        td: { fontSize: 8 },
        labelCliente: { fontSize: 7.5, bold: true, color: '#444444' },
        valorCliente: { fontSize: 9.5, bold: true },
        campoCliente: { fontSize: 8.5 },
        tdRelleno: { margin: [0, 0, 0, 0] },
        labelTotalBold: { fontSize: 8.5, bold: true, alignment: 'right', margin: [0, 2, 0, 2] }, // Optimizado padding y texto
        valorTotalDerecha: { fontSize: 8.5, alignment: 'right', margin: [0, 2, 0, 2] }, // Optimizado padding
        valorTotalBoldDerecha: { fontSize: 8.5, bold: true, alignment: 'right', margin: [0, 2, 0, 2] }, // Optimizado padding
        thControl: { fontSize: 8, bold: true, fillColor: '#EAEAEA', alignment: 'center', margin: [0, 2, 0, 2] },
        tdControl: { fontSize: 8.5, alignment: 'center', margin: [0, 4, 0, 4] },
        firma: { fontSize: 7.5, bold: true } // Reducido de 8 a 7.5
      },
      pageSize: 'A4',
      pageMargins: [40, 30, 40, 30] // Reducidos los márgenes superior/inferior de 40 a 30 para ganar más área útil
    };

docDefinition.tableLayouts = {
tablaComercial: {
    hLineWidth: (i: number, node: any) => {
      // Deja que las celdas controlen sus propios bordes de forma nativa
      return 0.8;
    },
    vLineWidth: (i: number, node: any) => {
      return (i === 0 || i === node.table.widths.length) ? 1.2 : 0.8;
    },
    hLineColor: () => '#000000',
    vLineColor: () => '#000000',
    paddingLeft: () => 4,
    paddingRight: () => 4,
    paddingTop: () => 4,    // Espaciado limpio para los artículos
    paddingBottom: () => 4
  },
  cuadroNegro: {
    hLineWidth: () => 1,
    vLineWidth: () => 1,
    hLineColor: () => '#000000',
    vLineColor: () => '#000000',
    paddingLeft: () => 6,
    paddingRight: () => 6,
    paddingTop: () => 4,
    paddingBottom: () => 4
  },
  noBorders: {
    hLineWidth: () => 0,
    vLineWidth: () => 0,
    hLineColor: () => '#FFFFFF',
    vLineColor: () => '#FFFFFF',
    paddingTop: () => 4,
    paddingBottom: () => 4
  }
};

    return docDefinition;
  }

  async generarYAbrirPdf(data: Cotizacion) {
    try {
      const docDefinition = await this.generarCotizacionPdf(data);
      pdfMake.createPdf(docDefinition).open();
    } catch (error) {
      console.error('Error generando PDF:', error);
    }
  }

   descargarPdf(docDefinition: any, fileName: string) {
    pdfMake.createPdf(docDefinition).download(fileName);
  }

   async generarConstanciaTrabajoPdf(data: ConstanciaTrabajo) {
    let logoBase64 = '';
    try {
      logoBase64 = await this.cargarImagenLocal('/ESCOLARES AZUL RIF GRANDE.png');
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e);
    }

    const docDefinition: any = {
      content: [
        {
          columns: [
            {
              width: '28%',
              stack: [
                ...(logoBase64 ? [{ image: logoBase64, width: 200, margin: [0, 0, 0, 2] }] : [{ text: 'ESCOLARES', fontSize: 16, bold: true, margin: [0, 0, 0, 2] }]),
              ]
            },
            {
              text: [
                { text: 'Calle Girardoth, entre Av. Constitucion y diaz Moreno\n', style: 'datosEmpresa' },
                { text: 'Telf. 0241-8580281 WhatsApp. 04144329235\n', style: 'datosEmpresa' },
                { text: 'Valencia Edo. Carabobo\n', style: 'datosEmpresa' },
                { text: 'R.I.F.: J-30488367-6\n', style: 'datosEmpresa' },
                { text: 'www.escolaresonline.com', style: 'webSite' }
              ],
              width: '48%',
              alignment: 'center',
              margin: [0, -10, 0, 0]
            },
            {
              stack: [
                { text: 'CONSTANCIA', style: 'tituloDoc' },
                { text: 'DE TRABAJO', style: 'subtituloDoc', alignment: 'center' }
              ],
              alignment: 'right',
              width: '24%',
              margin: [0, 10, 0, 0]
            }
          ]
        },
        { text: '', margin: [0, 20] },
        {
          text: 'Por medio de la presente, se hace constar que el(la) señor(a):',
          style: 'textoNormal',
          margin: [0, 0, 0, 10]
        },
        {
          text: data.nombreCompleto,
          style: 'nombreDestacado',
          alignment: 'center',
          margin: [0, 0, 0, 10]
        },
        {
          text: 'titular de la Cédula de Identidad Nro. V-___________',
          style: 'textoNormal',
          alignment: 'center',
          margin: [0, 0, 0, 20]
        },
        {
          table: {
            widths: ['40%', '60%'],
            body: [
              [
                { text: 'Cargo:', style: 'labelCampo' },
                { text: data.cargo, style: 'valorCampo' }
              ],
              [
                { text: 'Departamento:', style: 'labelCampo' },
                { text: data.departamento, style: 'valorCampo' }
              ],
              [
                { text: 'Fecha de Ingreso:', style: 'labelCampo' },
                { text: this.formatFecha(data.fechaIngreso), style: 'valorCampo' }
              ],
              [
                { text: 'Fecha de Emisión:', style: 'labelCampo' },
                { text: this.formatFecha(data.fechaEmision), style: 'valorCampo' }
              ],
              ...(data.sueldoMensual ? [
                [
                  { text: 'Sueldo Mensual (USD):', style: 'labelCampo' },
                  { text: data.sueldoMensual, style: 'valorCampo' }
                ]
              ] : [])
            ]
          },
          layout: 'tablaConstancia',
          margin: [0, 0, 0, 30]
        },
        {
          text: 'La presente constancia se expide a solicitud del interesado(a), a los _____ días del mes de ___________ del año ___________',
          style: 'textoNormal',
          margin: [0, 0, 0, 50]
        },
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: '_________________________', alignment: 'center' },
                { text: 'Firma del Empleado(a)', alignment: 'center', style: 'labelFirma' }
              ]
            },
            {
              width: '50%',
              stack: [
                { text: '_________________________', alignment: 'center' },
                { text: 'Firma y Sello de la Empresa', alignment: 'center', style: 'labelFirma' }
              ]
            }
          ]
        }
      ],
      styles: {
        datosEmpresa: { fontSize: 10, bold: true, color: '#000000' },
        webSite: { fontSize: 9, bold: true, color: '#D32F2F' },
        tituloDoc: { fontSize: 18, bold: true, color: '#1d63c1' },
        subtituloDoc: { fontSize: 14, bold: true, color: '#1d63c1', margin: [0, 5, 0, 0] },
        textoNormal: { fontSize: 11, lineHeight: 1.5 },
        nombreDestacado: { fontSize: 14, bold: true, color: '#333' },
        labelCampo: { fontSize: 10, bold: true, color: '#555', margin: [0, 3, 0, 3] },
        valorCampo: { fontSize: 10, color: '#333', margin: [0, 3, 0, 3] },
        labelFirma: { fontSize: 9, color: '#666', margin: [0, 5, 0, 0] }
      },
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40]
    };

    docDefinition.tableLayouts = {
      tablaConstancia: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#ddd',
        vLineColor: () => '#ddd',
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6
      }
    };

    return docDefinition;
  }

   async generarConstanciaComercialPdf(data: ConstanciaComercial) {
    let logoBase64 = '';
    let logoMarcaAgua = '';
    try {
      const logoOriginal = await this.cargarImagenLocal('/ESCOLARES AZUL RIF GRANDE.png');
      logoBase64 = logoOriginal;
      try {
        logoMarcaAgua = await this.rotarImagen90(logoOriginal);
      } catch (e) {
        console.warn('No se pudo generar la marca de agua:', e);
      }
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e);
    }

    const desdeFechaTexto = this.calcularTiempoTranscurrido(data.desdeFecha);
    const diasCreditoTexto = this.convertirNumeroATexto(data.diasCredito) + (data.diasCredito && !isNaN(parseInt(data.diasCredito, 10)) ? ' días' : '');
    const cifrasTexto = this.convertirNumeroATexto(data.cifras) + (data.cifras && !isNaN(parseInt(data.cifras, 10)) ? ' cifras' : '');
    const fechaLarga = this.formatearFechaComercial(data.fecha);

    const background: any = logoMarcaAgua ? {
      image: logoMarcaAgua,
      width: 400,
      opacity: 0.08,
      absolutePosition: { x: 40, y: 240 }
    } : undefined;

    const docDefinition: any = {
      content: [
        {
          columns: [
            {
              width: '28%',
              stack: [
                ...(logoBase64 ? [{ image: logoBase64, width: 140, margin: [0, 0, 0, 2] }] : [{ text: 'ESCOLARES', fontSize: 16, bold: true, margin: [0, 0, 0, 2] }]),
              ]
            },
          ]
        },
        { text: '', margin: [0, 25] },
        { text: 'Señores,', style: 'saludo', margin: [0, 0, 0, 8] },
        { text: data.destino, style: 'destino', margin: [0, 0, 0, 20] },
        {
          text: `ESCOLARES, C.A, por medio de la presente hace constar que ${data.titular}, titular de C.I. ${data.cedula}, mantiene relaciones comerciales con esta empresa desde hace aproximadamente ${desdeFechaTexto}, con créditos de ${diasCreditoTexto}, y un promedio de ${cifrasTexto} ${data.tipoCifras}, demostrando ser una empresa responsable y fiel, cumplidora en sus pagos correspondientes y por tal motivo podemos dar cualquier tipo de referencia ampliamente.`,
          style: 'textoNormal',
          alignment: 'justify',
          margin: [0, 0, 0, 40]
        },
        background,
        { text: `Referencia que se expide a petición de la parte interesada en la ciudad de Valencia ${fechaLarga}.`, style: 'textoNormal', margin: [0, 0, 0, 60] },
        {
          columns: [
            { width: '*', text: '' },
            {
              width: '50%',
              stack: [
                { text: 'Atentamente,', style: 'textoNormal', alignment: 'center', margin: [0, 0, 0, 50] },
                { text: '_________________________', alignment: 'center', margin: [0, 50, 0, 0] },
                { text: 'Gregory Alvarado', alignment: 'center', style: 'firmaNombre', margin: [0, 20, 0, 0] },
                { text: 'Director Gerente', alignment: 'center', style: 'firmaCargo' }
              ]
            },
            { width: '*', text: '' }
          ]
        }
      ],

      footer: (currentPage: number, pageCount: number) => {
        return{   
              text: [
                { text: 'Calle Girardoth, entre Av. Constitucion y diaz Moreno y Av. Constitucion - Diagonal al Banco del Caribe, Local.: 100-51\n', style: 'datosEmpresa' },
                { text: 'Telf. 0241 - 858.02.81 Fax.: 0241 - 858-70-50. Valencia Edo. Carabobo\n', style: 'datosEmpresa' },
                { text: 'www.escolaresonline.com - E-mail: gerencia@escolaresonline.com', style: 'webSite' }
              ],
              alignment: 'center',
              margin: [40, 0, 40, 20]
            
        }

      },
      styles: {
        datosEmpresa: { fontSize: 8, bold: true, color: '#000000' },
        webSite: { fontSize: 9, bold: true, color: '#000000' },
        textoNormal: { fontSize: 11, lineHeight: 1.6 },
        saludo: { fontSize: 11, bold: true },
        destino: { fontSize: 11, bold: true, margin: [0, 0, 0, 20] },
        firmaNombre: { fontSize: 12, bold: true, margin: [0, 5, 0, 2] },
        firmaCargo: { fontSize: 11, color: '#666' }
      },
      pageSize: 'A4',
      pageMargins: [40, 50, 40, 50]
    };

    return docDefinition;
  }

   convertirNumeroATexto(valor: string): string {
    if (!valor) return '';
    const numero = parseInt(valor, 10);
    if (isNaN(numero)) return valor;
    return this.numeroATexto(numero);
  }

   calcularTiempoTranscurrido(fechaInicio: string): string {
    if (!fechaInicio) return '';

    const inicio = new Date(fechaInicio + 'T00:00:00');
    const hoy = new Date();

    let años = hoy.getFullYear() - inicio.getFullYear();
    let meses = hoy.getMonth() - inicio.getMonth();
    let dias = hoy.getDate() - inicio.getDate();

    if (dias < 0) {
      meses--;
      const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
      dias += diasEnMes;
    }

    if (meses < 0) {
      años--;
      meses += 12;
    }

    const partes: string[] = [];

    if (años > 0) {
      partes.push(`${this.numeroATexto(años)} años (${años})`);
    }

    if (meses > 0) {
      partes.push(`${this.numeroATexto(meses)} meses (${meses})`);
    }

    if (dias > 0 || partes.length === 0) {
      partes.push(`${this.numeroATexto(dias)} días (${dias})`);
    }

    if (partes.length === 1) {
      return partes[0];
    } else if (partes.length === 2) {
      return `${partes[0]} y ${partes[1]}`;
    } else {
      const ultimo = partes.pop();
      return `${partes.join(', ')} y ${ultimo}`;
    }
  }

   formatearFechaComercial(fecha: string): string {
    if (!fecha) return '';

    const parts = fecha.split('-');
    if (parts.length !== 3) return fecha;

    const dia = parseInt(parts[2], 10);
    const mes = parseInt(parts[1], 10) - 1;
    const año = parseInt(parts[0], 10);

    const nombresMeses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    const diaTexto = this.numeroATexto(dia);
    const mesTexto = nombresMeses[mes];
    const añoTexto = this.numeroATexto(año);

    return `a los ${diaTexto} días del mes de ${mesTexto} del año ${añoTexto}`;
  }

   numeroATexto(numero: number): string {
    if (numero === 0) return 'cero';
    if (numero === 1) return 'un';
    if (numero === 2) return 'dos';
    if (numero === 3) return 'tres';
    if (numero === 4) return 'cuatro';
    if (numero === 5) return 'cinco';
    if (numero === 6) return 'seis';
    if (numero === 7) return 'siete';
    if (numero === 8) return 'ocho';
    if (numero === 9) return 'nueve';
    if (numero === 10) return 'diez';
    if (numero === 11) return 'once';
    if (numero === 12) return 'doce';
    if (numero === 13) return 'trece';
    if (numero === 14) return 'catorce';
    if (numero === 15) return 'quince';
    if (numero === 16) return 'dieciséis';
    if (numero === 17) return 'diecisiete';
    if (numero === 18) return 'dieciocho';
    if (numero === 19) return 'diecinueve';
    if (numero === 20) return 'veinte';

    if (numero < 30) {
      const unidades = numero % 10;
      return `veinti${this.numeroATexto(unidades)}`;
    }

    if (numero < 100) {
      const decenas = Math.floor(numero / 10);
      const unidades = numero % 10;
      const nombresDecenas: Record<number, string> = {
        2: 'veinte', 3: 'treinta', 4: 'cuarenta', 5: 'cincuenta',
        6: 'sesenta', 7: 'setenta', 8: 'ochenta', 9: 'noventa'
      };
      if (unidades === 0) return nombresDecenas[decenas];
      return `${nombresDecenas[decenas]} y ${this.numeroATexto(unidades)}`;
    }

    if (numero < 1000) {
      if (numero === 0) return 'cero';
      if (numero < 100) {
        const decenas = Math.floor(numero / 10);
        const unidades = numero % 10;
        const nombresDecenas: Record<number, string> = {
          2: 'veinte', 3: 'treinta', 4: 'cuarenta', 5: 'cincuenta',
          6: 'sesenta', 7: 'setenta', 8: 'ochenta', 9: 'noventa'
        };
        if (unidades === 0) return nombresDecenas[decenas];
        return `${nombresDecenas[decenas]} y ${this.numeroATexto(unidades)}`;
      }

      const centenas = Math.floor(numero / 100);
      const resto = numero % 100;
      if (resto === 0) {
        const nombresCentenas: Record<number, string> = { 1: 'cien', 2: 'doscientos', 3: 'trescientos', 4: 'cuatrocientos', 5: 'quinientos', 6: 'seiscientos', 7: 'setecientos', 8: 'ochocientos', 9: 'novecientos' };
        return nombresCentenas[centenas];
      }
      return `${this.numeroATexto(centenas * 100)} ${this.numeroATexto(resto)}`;
    }

    const miles = Math.floor(numero / 1000);
    const resto = numero % 1000;
    const milTexto = miles === 1 ? 'mil' : this.numeroATexto(miles) + ' mil';
    if (resto === 0) return milTexto;
    return `${milTexto} ${this.numeroATexto(resto)}`;
  }

   async generarConstanciaPersonalPdf(data: ConstanciaPersonal) {
    let logoBase64 = '';
    try {
      logoBase64 = await this.cargarImagenLocal('/ESCOLARES AZUL RIF GRANDE.png');
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e);
    }

    const docDefinition: any = {
      content: [
        {
          columns: [
            {
              width: '28%',
              stack: [
                ...(logoBase64 ? [{ image: logoBase64, width: 200, margin: [0, 0, 0, 2] }] : [{ text: 'ESCOLARES', fontSize: 16, bold: true, margin: [0, 0, 0, 2] }]),
              ]
            },
            {
              text: [
                { text: 'Calle Girardoth, entre Av. Constitucion y diaz Moreno\n', style: 'datosEmpresa' },
                { text: 'Telf. 0241-8580281 WhatsApp. 04144329235\n', style: 'datosEmpresa' },
                { text: 'Valencia Edo. Carabobo\n', style: 'datosEmpresa' },
                { text: 'R.I.F.: J-30488367-6\n', style: 'datosEmpresa' },
                { text: 'www.escolaresonline.com', style: 'webSite' }
              ],
              width: '48%',
              alignment: 'center',
              margin: [0, -10, 0, 0]
            },
            {
              stack: [
                { text: 'CONSTANCIA', style: 'tituloDoc' },
                { text: 'PERSONAL', style: 'subtituloDoc', alignment: 'center' }
              ],
              alignment: 'right',
              width: '24%',
              margin: [0, 10, 0, 0]
            }
          ]
        },
        { text: '', margin: [0, 20] },
        {
          text: 'Por medio de la presente, se hace constar que el(la) señor(a):',
          style: 'textoNormal',
          margin: [0, 0, 0, 10]
        },
        {
          text: data.nombreCompleto,
          style: 'nombreDestacado',
          alignment: 'center',
          margin: [0, 0, 0, 10]
        },
        {
          text: `titular de la Cédula de Identidad Nro. V-___________`,
          style: 'textoNormal',
          alignment: 'center',
          margin: [0, 0, 0, 20]
        },
        {
          table: {
            widths: ['40%', '60%'],
            body: [
              [
                { text: 'Dirección:', style: 'labelCampo' },
                { text: data.direccion || 'N/A', style: 'valorCampo' }
              ],
              [
                { text: 'Fecha de Emisión:', style: 'labelCampo' },
                { text: this.formatFecha(data.fechaEmision), style: 'valorCampo' }
              ]
            ]
          },
          layout: 'tablaConstancia',
          margin: [0, 0, 0, 20]
        },
        {
          text: 'Motivo:',
          style: 'labelCampo',
          margin: [0, 0, 0, 5]
        },
        {
          text: data.motivo,
          style: 'textoNormal',
          margin: [0, 0, 0, 50]
        },
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: '_________________________', alignment: 'center' },
                { text: 'Firma del Solicitante', alignment: 'center', style: 'labelFirma' }
              ]
            },
            {
              width: '50%',
              stack: [
                { text: '_________________________', alignment: 'center' },
                { text: 'Firma y Sello', alignment: 'center', style: 'labelFirma' }
              ]
            }
          ]
        }
      ],
      styles: {
        datosEmpresa: { fontSize: 10, bold: true, color: '#000000' },
        webSite: { fontSize: 9, bold: true, color: '#D32F2F' },
        tituloDoc: { fontSize: 18, bold: true, color: '#1d63c1' },
        subtituloDoc: { fontSize: 14, bold: true, color: '#1d63c1', margin: [0, 5, 0, 0] },
        textoNormal: { fontSize: 11, lineHeight: 1.5 },
        nombreDestacado: { fontSize: 14, bold: true, color: '#333' },
        labelCampo: { fontSize: 10, bold: true, color: '#555', margin: [0, 3, 0, 3] },
        valorCampo: { fontSize: 10, color: '#333', margin: [0, 3, 0, 3] },
        labelFirma: { fontSize: 9, color: '#666', margin: [0, 5, 0, 0] }
      },
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40]
    };

    docDefinition.tableLayouts = {
      tablaConstancia: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#ddd',
        vLineColor: () => '#ddd',
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6
      }
    };

    return docDefinition;
  }

   async generarReciboPagoPdf(data: ReciboPago) {
    let logoBase64 = '';
    try {
      logoBase64 = await this.cargarImagenLocal('/ESCOLARES AZUL RIF GRANDE.png');
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e);
    }

    const montoFormateado = data.monto.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const docDefinition: any = {
      content: [
        {
          columns: [
            {
              width: '28%',
              stack: [
                ...(logoBase64 ? [{ image: logoBase64, width: 200, margin: [0, 0, 0, 2] }] : [{ text: 'ESCOLARES', fontSize: 16, bold: true, margin: [0, 0, 0, 2] }]),
              ]
            },
            {
              text: [
                { text: 'Calle Girardoth, entre Av. Constitucion y diaz Moreno\n', style: 'datosEmpresa' },
                { text: 'Telf. 0241-8580281 WhatsApp. 04144329235\n', style: 'datosEmpresa' },
                { text: 'Valencia Edo. Carabobo\n', style: 'datosEmpresa' },
                { text: 'R.I.F.: J-30488367-6\n', style: 'datosEmpresa' },
                { text: 'www.escolaresonline.com', style: 'webSite' }
              ],
              width: '48%',
              alignment: 'center',
              margin: [0, -10, 0, 0]
            },
            {
              stack: [
                { text: 'RECIBO', style: 'tituloDoc' },
                { text: 'DE PAGO', style: 'subtituloDoc', alignment: 'center' }
              ],
              alignment: 'right',
              width: '24%',
              margin: [0, 10, 0, 0]
            }
          ]
        },
        { text: '', margin: [0, 20] },
        {
          table: {
            widths: ['35%', '65%'],
            body: [
              [
                { text: 'Nro. Recibo:', style: 'labelCampo' },
                { text: data.numeroRecibo, style: 'valorCampo', bold: true }
              ],
              [
                { text: 'Fecha de Pago:', style: 'labelCampo' },
                { text: this.formatFecha(data.fechaPago), style: 'valorCampo' }
              ],
              [
                { text: 'Pagado Por:', style: 'labelCampo' },
                { text: data.nombrePagador, style: 'valorCampo' }
              ],
              [
                { text: 'Cédula:', style: 'labelCampo' },
                { text: data.cedula, style: 'valorCampo' }
              ],
              [
                { text: 'Concepto:', style: 'labelCampo' },
                { text: data.concepto, style: 'valorCampo' }
              ],
              [
                { text: 'Monto:', style: 'labelCampo' },
                {
                  text: `${data.moneda} ${montoFormateado}`,
                  style: 'valorCampo',
                  bold: true,
                  fontSize: 12
                }
              ]
            ]
          },
          layout: 'tablaConstancia',
          margin: [0, 0, 0, 40]
        },
        {
          text: 'Este recibo certifica que el pago ha sido recibido satisfactoriamente.',
          style: 'textoNormal',
          alignment: 'center',
          margin: [0, 0, 0, 50]
        },
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: '_________________________', alignment: 'center' },
                { text: 'Firma del Pagador', alignment: 'center', style: 'labelFirma' }
              ]
            },
            {
              width: '50%',
              stack: [
                { text: '_________________________', alignment: 'center' },
                { text: 'Firma y Sello', alignment: 'center', style: 'labelFirma' }
              ]
            }
          ]
        }
      ],
      styles: {
        datosEmpresa: { fontSize: 10, bold: true, color: '#000000' },
        webSite: { fontSize: 9, bold: true, color: '#D32F2F' },
        tituloDoc: { fontSize: 18, bold: true, color: '#1d63c1' },
        subtituloDoc: { fontSize: 14, bold: true, color: '#1d63c1', margin: [0, 5, 0, 0] },
        textoNormal: { fontSize: 11, lineHeight: 1.5 },
        nombreDestacado: { fontSize: 14, bold: true, color: '#333' },
        labelCampo: { fontSize: 10, bold: true, color: '#555', margin: [0, 3, 0, 3] },
        valorCampo: { fontSize: 10, color: '#333', margin: [0, 3, 0, 3] },
        labelFirma: { fontSize: 9, color: '#666', margin: [0, 5, 0, 0] }
      },
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40]
    };

    docDefinition.tableLayouts = {
      tablaConstancia: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#ddd',
        vLineColor: () => '#ddd',
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6
      }
    };

    return docDefinition;
  }
}