import { Injectable, inject } from '@angular/core';
import { NotaEntrega } from '../interfaces/nota-entrega.interface';
import { HttpClient } from '@angular/common/http';

declare const pdfMake: any;

type TableLayoutNode = any;
type TableLayoutContext = any;

@Injectable({
  providedIn: 'root',
})
export class ExportarPdfNotaEntregaService {
  private http = inject(HttpClient);

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

  async generarNotaEntregaPdf(data: NotaEntrega) {
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
                { text: 'www.escolaresonline.com', style: 'webSite' }
              ],
              width: '48%',
              alignment: 'center',
              margin: [0, -10, 0, 0]
            },
           {
  stack: [
    { 
      text: [
        { text: 'NOTA ', fontSize: 14, bold: true }, // Un poco más grande
        { text: 'DE ENTREGA', fontSize: 13, bold: true }   // Mantiene tu estilo base (fontSize: 18)
      ],
      alignment: 'right'
    },
    { text: `No. ${data.numeroNota}`, style: 'numeroDoc', alignment: 'center' },
  ],
  alignment: 'right',
  width: '24%',
  margin: [0, 10, 0, 0]
}
          ]
        },

        { text: '', margin: [0, 10]},

        {
          table: {
            widths: ['54%', '2%', '44%'],
            body: [
              [
                {
                  stack: [
                    { text: 'CLIENTE:', style: 'labelCliente', bold: true },
                    { text: data.cliente.nombre, style: 'valorCliente', margin: [0, 2, 0, 4] },
                    { text: data.cliente.direccion ? `Dirección: ${data.cliente.direccion}` : ' ', style: 'campoCliente' }
                  ],
                  padding: [6, 4, 6, 20], 
                  borderColor: ['#000000', '#000000', '#000000', '#000000']
                },
                { text: '', border: [false, false, false, false] },
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
                            { text: data.referencia.numeroReferencia || '', style: 'tdControl' },
                            { text: data.referencia.vendedor || '', style: 'tdControl' }
                          ]
                        ]
                      },
                      layout: 'cuadroNegro'
                    }
                  ],
                  border: [false, false, false, false]
                }
              ],
              [
                {
                  columns: [
                    { text: `RIF: ${data.cliente.rif}`, style: 'campoCliente', width: 'auto' },
                    { text: data.cliente.telefono ? `Teléfono: ${data.cliente.telefono}` : '', style: 'campoCliente', alignment: 'right', width: '*' }
                  ],
                  margin: [0, -12, 0, 0],
                  border: [false, false, false, false]
                },
                { text: '', border: [false, false, false, false] },
                { text: '', border: [false, false, false, false] }
              ]
            ]
          },
          layout: {
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
        {
          table: {
            widths: [45, 45, '*', 75, 75],
            body: [
              [
                { text: 'CODIGO', style: 'headerCen' },
                { text: 'CANTIDAD', style: 'headerCen', alignment: 'center' },
                { text: 'D E S C R I P C I O N', style: 'headerCen' },
                { text: 'P. UNITARIO Bs.', style: 'headers', alignment: 'right' },
                { text: 'MONTO TOTAL Bs.', style: 'headers', alignment: 'right' }
              ],
              ...data.items.map(item => [
                { text: item.codigo, alignment: 'left', style: 'tdMini', border: [true, false, true, false] },
                { text: item.cantidad.toString(), alignment: 'center', style: 'tdMini', border: [true, false, true, false] },
                { text: item.descripcion, style: 'tdMini', border: [true, false, true, false] },
                { text: item.precioUnitarioBs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), alignment: 'right', style: 'tdMini', border: [true, false, true, false] },
                { text: item.montoTotalBs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), alignment: 'right', style: 'tdMini', border: [true, false, true, false] }
              ]),
              [
                { text: '', style: 'tdRelleno', border: [true, false, true, true] },
                { text: '', style: 'tdRelleno', border: [true, false, true, true] },
                { text: stringRelleno, style: 'tdRelleno', border: [true, false, true, true] },
                { text: '', style: 'tdRelleno', border: [true, false, true, true] },
                { text: '', style: 'tdRelleno', border: [true, false, true, true] }
              ],
 
              [
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
                { text: `I.V.A. 16% Bs.`, style: 'labelTotalBold', border: [false, false, false, false] },
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

        {
          margin: [0, 60, 0, 0],
          columns: [
            { width: '50%', text: '________________________________\nELABORADO POR', alignment: 'center', style: 'firma', margin: [0, 0, 0, 2] },
            { width: '50%', text: '________________________________\nRECIBIDO POR\nFIRMA Y SELLO', alignment: 'center', style: 'firma', bold: true }
          ]
        },
        {
          margin: [0, 10, 0, 0],
          columns: [
            {
              width: '100%',  text: '"SIN DERECHO A CREDITO FISCAL", LA FACTURA SERÁ EMITIDA UNA VEZ CONFIRMADO EL PAGO', alignment: 'center', fontSize: 7, fillColor: '#DBDBDB'
            }
          ]
        }
      ],
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
        tdMini: { fontSize: 7.5 },
        headers: { fontSize: 7.5, bold: true, fillColor: '#DBDBDB' },
        headerCen: { fontSize: 8.5, bold: true, alignment: 'center', fillColor: '#DBDBDB'},
        td: { fontSize: 8 },
        labelCliente: { fontSize: 7.5, bold: true, color: '#444444' },
        valorCliente: { fontSize: 9.5, bold: true },
        campoCliente: { fontSize: 8.5 },
        tdRelleno: { margin: [0, 0, 0, 0] },
        labelTotalBold: { fontSize: 8.5, bold: true, alignment: 'right', margin: [0, 2, 0, 2] },
        valorTotalDerecha: { fontSize: 8.5, alignment: 'right', margin: [0, 2, 0, 2] },
        valorTotalBoldDerecha: { fontSize: 8.5, bold: true, alignment: 'right', margin: [0, 2, 0, 2] },
        thControl: { fontSize: 8, bold: true, fillColor: '#EAEAEA', alignment: 'center', margin: [0, 2, 0, 2] },
        tdControl: { fontSize: 8.5, alignment: 'center', margin: [0, 4, 0, 4] },
        firma: { fontSize: 7.5, bold: true }
      },
      pageSize: 'A4',
      pageMargins: [40, 30, 40, 30]
    };

    docDefinition.tableLayouts = {
      tablaComercial: {
        hLineWidth: (_i: number, _node: TableLayoutNode) => {
          return 0.8;
        },
        vLineWidth: (_i: number, node: TableLayoutNode) => {
          return (node.table.widths.length > 0) ? 1.2 : 0.8;
        },
        hLineColor: () => '#000000',
        vLineColor: () => '#000000',
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 4,
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

  async generarYAbrirPdf(data: NotaEntrega) {
    try {
      const docDefinition = await this.generarNotaEntregaPdf(data);
      pdfMake.createPdf(docDefinition).open();
    } catch (error) {
      console.error('Error generando PDF:', error);
    }
  }
}