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
                ...(logoBase64 ? [{ image: logoBase64, width: 140, margin: [0, 0, 0, 2] }] : [{ text: 'ESCOLARES', fontSize: 16, bold: true, margin: [0, 0, 0, 2] }]),
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
              margin: [0, 5, 0, 0]

            },
            {
              stack: [
                { text: 'COTIZACION', style: 'tituloDoc' },
                { text: data.numeroCotizacion, style: 'numeroDoc', alignment: 'center'  },
              ],
              alignment: 'right',
              width: '25%',
              margin: [0, 15, 0, 0]
            }
          ]
        },

        { text: '', margin: [0, 10]},
        {
          columns: [
            {
          table: {
            width: '54%',
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    { text: `CLIENTE:`, style: 'labelCliente' },
                    { text: data.cliente.nombre, style: 'valorCliente', margin: [0, 2, 0, 4] },
                    { text: `Dirección: ${data.cliente.direccion || ''}`, style: 'campoCliente' },
                    { 
                      margin: [0, 12, 0, 0],
                      columns: [
                    { text: `RIF: ${data.cliente.rif}` },
                    { text: `Teléfono: ${data.cliente.telefono || ''}`, alignment: 'right' }
                      ]
                    },
                  ],
                  padding: [6, 4, 6, 4]
                }
              ]
            ]
          
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
      margin: [0, 0, 0, 10]
    },
        {

          table: {
            widths: ['auto', 45, '*', 'auto', 'auto'],
            body: [
              [
                { text: 'CODIGO', style: 'thMini' },
                { text: 'CANTIDAD', style: 'thMini', alignment: 'center' },
                { text: 'D E S C R I P C I O N', style: 'thMini' },
                { text: 'P. UNITARIO Bs.', style: 'thMini', alignment: 'right' },
                { text: 'MONTO TOTAL Bs.', style: 'thMini', alignment: 'right' }
              ],
              ...data.items.map(item => [
                { text: item.codigo, alignment: 'left' },
                { text: item.cantidad.toString(), alignment: 'center' },
                { text: item.descripcion },
                { text: item.precioUnitarioBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), alignment: 'right' },
                { text: item.montoTotalBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), alignment: 'right' }
              ]),

              [
                { text: ''},
                { text: ''},
                { text: stringRelleno },
                { text: ''},
                { text: ''}
              ]
            ]
          },
          layout: {
            hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1.5 : 1,
            vLineWidth: () => 1,
            hLineColor: () => '#000000',
            vLineColor: () => '#000000',
            paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 2,
      paddingBottom: () => 2
          }
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
        td: { fontSize: 8 },
        labelCliente: { fontSize: 7.5, bold: true, color: '#444444' },
    valorCliente: { fontSize: 9.5, bold: true },
    campoCliente: { fontSize: 8.5 },
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