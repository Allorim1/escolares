import { Injectable, inject } from '@angular/core';
import { Cotizacion } from '../interfaces/cotizacion.interface';
import { HttpClient } from '@angular/common/http';

// Declaración para window.pdfMake (cargado desde CDN en index.html)
declare const pdfMake: any;

@Injectable({
  providedIn: 'root',
})
export class ExportarPdfService {
  private http = inject(HttpClient);


   formatFecha(fechaRaw: string | Date): string {
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

async generarCotizacionPdf(data: Cotizacion) {
    let logoBase64 = '';
    try {
      logoBase64 = await this.cargarImagenLocal('/ESCOLARES AZUL RIF GRANDE.png');
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e);
    }

    const MAX_ARTICULOS = 12;
const articulosActuales = data.items ? data.items.length : 0;

// 2. Calcula cuántas líneas vacías hacen falta para llegar al tope
const lineasFaltantes = Math.max(0, MAX_ARTICULOS - articulosActuales);

// 3. Genera los saltos de línea (\n). 
// Multiplicamos por 2 para que el espacio vertical sea equivalente al tamaño de una fila real
const stringRelleno = '\n'.repeat(lineasFaltantes * 2);
    
    const docDefinition: any = {
      content: [
        {
          columns: [
            {
              width: '35%',
              stack: [
                ...(logoBase64 ? [{ image: logoBase64, width: 200, margin: [0, 0, 0, 2] }] : [{ text: 'ESCOLARES', fontSize: 16, bold: true, margin: [0, 0, 0, 2] }]),
                { text: 'R.I.F. J-30488367-6\n', style: 'datosEmpresa' }
              ]
            },
            {
              text: [
                { text: 'Calle Girardoth, entre Av. Constitucion y diaz Moreno\n', style: 'datosEmpresa' },
                { text: 'Telf. 0241-8580281 Fax. 0241-8587050\n', style: 'datosEmpresa' },
                { text: 'Valencia Edo. Carabobo\n', style: 'datosEmpresa' },
                { text: 'www.escolaresonline.com', style: 'webSite', margin: [0, 4, 0, 0] }
              ],
              width: '40%',
              alignment: 'center',
              margin: [0, 0, 0, 0]

            },
            {
              stack: [
                { text: 'COTIZACION', style: 'tituloDoc' },
                { text: data.numeroCotizacion, style: 'numeroDoc', alignment: 'center'  },
              ],
              alignment: 'right',
              width: '25%',
              margin: [0, 2, 0, 0]
            }
          ]
        },

        { text: '', margin: [0, 10]},
        {
          columns: [
            {
              width: '54%',
          table: {
            widths: ['*'],
            body: [
              [
                    [{ text: `CLIENTE:`, style: 'labelCliente', border: [false, false, false, false] }],
                    [{ text: data.cliente.nombre, style: 'valorCliente', margin: [0, -2, 0, 2], border: [false, false, false, false] }],
                    [{ text: `Dirección: ${data.cliente.direccion || ''}`, style: 'campoCliente', margin: [0, 0, 0, 6], border: [false, false, false, false] }],
                    [
                      { 
                      columns: [
                    { text: `RIF: ${data.cliente.rif}`, style: 'campoCliente' },
                    { text: `Teléfono: ${data.cliente.telefono || ''}`, style: 'campoCliente', alignment: 'right' }
                      ],
                    border: [false, false, false, false]
                      }
                    ],
                  ]
                ],
          },
          layout: 'cuadroNegro'
        },
        

        { width: '2%', text: '' },
      
        {
        width: '44%',
        stack: [
          {
        table: {
          widths: [65, 45, '*'],
          body: [
            [{ text: 'FECHA', style: 'thControl'}, { text: '', colSpan: 2, border: [false, false, false, false]}],
            [{ text: this.formatFecha(data.fecha), style: 'tdControl'}, { text: '', colSpan: 2, border: [false, false, false, false]} ],
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
              { text: data.referencia.numeroReferencia || '', style: 'tdControl' },
              { text: data.referencia.vendedor || '', style: 'tdControl' }
            ]
          ]
        },
        layout: 'cuadroNegro'
        }
        ]
      }
      ],
      margin: [0, 0, 0, 3]
    },
        {

          table: {
            widths: ['auto', 45, '*', 'auto', 'auto'],
            body: [
              [
                { text: 'CODIGO', style: 'headerCen' },
                { text: 'CANTIDAD', style: 'headerCen', alignment: 'center' },
                { text: 'D E S C R I P C I O N', style: 'headerCen' },
                { text: 'P. UNITARIO Bs.', style: 'headers', alignment: 'right' },
                { text: 'MONTO TOTAL Bs.', style: 'headers', alignment: 'right' }
              ],
              ...data.items.map(item => [
                { text: item.codigo, alignment: 'left', style: 'tdMini' },
                { text: item.cantidad.toString(), alignment: 'center', style: 'tdMini' },
                { text: item.descripcion, style: 'tdMini' },
                { text: item.precioUnitarioBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), alignment: 'right', style: 'tdMini' },
                { text: item.montoTotalBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), alignment: 'right', style: 'tdMini' }
              ]),

              [
                { text: '', style: 'tdRelleno'  },
                { text: '', style: 'tdRelleno'  },
                { text: stringRelleno, style: 'tdRelleno'  },
                { text: '', style: 'tdRelleno'  },
                { text: '', style: 'tdRelleno'  }
              ]
            ]
          },
          layout: 'tablaComercial'
        },

        {
          margin: [0, 15, 0, 0],
          columns: [
            {
              width: '60%',
              stack: [
                { text: 'LOS PRECIOS ESTAN SUJETOS A CAMBIOS SIN PREVIO AVISO', fontSize: 7, bold: true },
                { text: 'NO SE ACEPTAN DEVOLUCIONES DESPUES DE 48 HORAS DE RECIBIDA LA MERCANCIA', fontSize: 7, bold: true, margin: [0, 2, 0, 5] },
                { text: 'FAVOR TRANSFERENCIA BANCARIA A NOMBRE DE: ESCOLARES, C.A.', fontSize: 8, bold: true },
                { text: 'R.I.F.: J-30488367-6', fontSize: 8, bold: true, margin: [0, 0, 0, 4] },
                { text: 'A CUALQUIERA DE NUESTRAS CUENTAS CORRIENTES:', fontSize: 7.5, decoration: 'underline' },
                { text: 'VENEZUELA: 0102-0391-16-0000000589', fontSize: 8 },
                { text: 'BANESCO: 0134-0187-08-1871037067', fontSize: 8 },
                { text: 'BANCARIBE: 0114-0220-85-2200183943', fontSize: 8 },
                { text: 'PAGO MOVIL BANESCO: RIF: 304883676 TELF. 04144000800, ESCOLARES CA.', fontSize: 8, bold: true, margin: [0, 2, 0, 4] },
                { text: 'AL REALIZAR SU TRANSFERENCIA REPORTAR EL PAGO A: cobranzascorp@escolaresonline.com', fontSize: 7.5, italic: true },
              ]
            },
            {
              width: '40%',
              stack: [
                {
                  table: {
                    widths: ['*', 'auto'],
                    body: [
                      [{ text: 'NETO Bs.', style: 'labelTotalBold' }, { text: data.totales.netoBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'thMini' }],
                      [{ text: `DESCUENTO ${data.totales.porcentajeDescuento}% Bs.`, style: 'labelTotalBold' }, { text: data.totales.descuentoBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'thMini' }],
                      [{ text: 'SUB TOTAL Bs.', style: 'labelTotalBold' }, { text: data.totales.subTotalBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'thMini' }],
                      [{ text: `I.V.A. ${data.totales.ivaPorcentaje}% Bs.`, style: 'labelTotalBold' }, { text: data.totales.ivaBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'thMini' }],
                      [{ text: 'EXENTO Bs.', style: 'labelTotalBold' }, { text: data.totales.exentoBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'thMini' }],
                      [{ text: 'TOTAL Bs.', style: 'labelTotalBold' }, { text: data.totales.totalBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'thMini' }]
                    ]
                  },
                }
              ]
            }
          ]
        },

        {
          margin: [0, 40, 0, 0],
          columns: [
            { width: '50%', text: [{ text: 'OBSERVACIONES: ', bold: true, fontSize: 8}, { text: `EL TOTAL DE LA COTIZACIÓN SE REGIRA POR LA REFERENCIA ESTABLECIDA NRO: ${data.referencia.numeroReferencia}`, fontSize: 8}]},
            { width: '25%', text: '_______________________\nELABORADO POR', alignment: 'center', style: 'firma', margin: [0, 0, 0, 4] },
            { width: '25%', text: '_______________________\nRECIBIDO POR\nFIRMA Y SELLO', alignment: 'center', style: 'firma', bold: true }
          ]
        }
      ],

      styles: {
        headerTitle: { fontSize: 16, bold: true, color: '#0d3b66' },
        headerSub: { fontSize: 10, bold: true },
        datosEmpresa: { fontSize: 8, color: '#000000' },
        webSite: { fontSize: 9, bold: true, color: 'red' },
        tituloDoc: { fontSize: 18, bold: true, tracking: 1 },
        numeroDoc: { fontSize: 14, bold: true, color: '#000000' },
        fechaDoc: { fontSize: 9, bold: true },
        seccionCliente: { fontSize: 9, lineHeight: 1.2 },
        thMini: { fontSize: 7, bold: true, fillColor: '#EEEEEB', alignment: 'center' },
        tdMini: { fontSize: 8 },
        headers: { fontSize: 8, bold: true, fillColor: '#DBDBDB' },
        headerCen: { fontSize: 9, bold: true, alignment: 'center', fillColor: '#DBDBDB'},
        td: { fontSize: 8 },
        labelCliente: { fontSize: 7.5, bold: true, color: '#444444' },
    valorCliente: { fontSize: 9.5, bold: true },
    campoCliente: { fontSize: 8.5 },
    tdRelleno: { margin: [0, 0, 0, 0] },
        labelTotal: { fontSize: 8.5, alignment: 'right' },
        valorTotal: { fontSize: 8.5, alignment: 'right' },
        labelTotalBold: { fontSize: 9, bold: true, alignment: 'right' },
        valorTotalBold: { fontSize: 10, bold: true, alignment: 'right' },
        thControl: { fontSize: 8, bold: true, fillColor: '#EAEAEA', alignment: 'center', margin: [0, 2, 0, 2] },
    tdControl: { fontSize: 8.5, alignment: 'center', margin: [0, 4, 0, 4] },
        firma: { fontSize: 8, bold: true }
      },
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40]
    };

docDefinition.tableLayouts = {
  tablaComercial: {
    // CONTROL INGENIOSO DE LAS LÍNEAS HORIZONTALES
    hLineWidth: (i: number, node: any) => {
      // Si es la última línea de la tabla (el cierre inferior), retornamos 0 para dejarla abierta
      if (i === node.table.body.length) {
        return 0; 
      }
      // La línea del encabezado (0) es más gruesa, las normales internas miden 0.8
      return (i === 0) ? 1.2 : 0.8;
    },

    // CONTROL DE LAS LÍNEAS VERTICALES (Perfectas y continuas)
    vLineWidth: (i: number, node: any) => {
      // Los bordes exteriores (izquierdo y derecho) son más gruesos, las divisiones internas miden 0.8
      return (i === 0 || i === node.table.widths.length) ? 1.2 : 0.8;
    },

    hLineColor: () => '#000000',
    vLineColor: () => '#000000',
    paddingLeft: () => 4,
    paddingRight: () => 4,
    paddingTop: () => 2,
    paddingBottom: () => 2
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
}