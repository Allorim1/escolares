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
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      };
      img.onerror = (error) => {
        reject('Error cargando la imagen desde el directorio: ' + error);
      };
    });
  }

  async generarCotizacionPdf(data: Cotizacion) {

    const logoBase64 = await this.cargarImagenLocal('/ESCOLARES AZUL RIF GRANDE.png');

    
    const docDefinition: any = {
      content: [
        {
          columns: [
            {
              width: '35%',
              stack: [
                { image: logoBase64, width: 140, margin: [0, 0, 0, 2] },
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
                { text: data.numeroCotizacion, style: 'numeroDoc' },
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
            width: '55%',
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    { text: `CLIENTE:`, bold: true },
                    { text: data.cliente.nombre, style: 'valorCliente', margin: [0, 2, 0, 4] },
                    { text: `Dirección: ${data.cliente.direccion || ''}` },
                    { 
                      margin: [0, 10, 0, 0],
                      columns: [
                    { text: `RIF: ${data.cliente.rif}` },,
                    { text: `Teléfono: ${data.cliente.telefono || ''}`, alignment: 'right' }
                      ]
                    },
                  ],
                  padding: [8, 6, 8, 6]
                }
              ]
            ]
          
          },
          layout: 'cuadroNegro'
        }]
        },

        { witdh: '2%', text: '' },
      
        {
        width: '43%',
        table: {
          widths: ['*', '*', '*'],
          body: [
            [{ text: 'FECHA', style: 'thControl', colSpan: 3 }, {}, {}],
            [{ text: this.formatFecha(data.fecha), style: 'thControl', colSpan: 3, }, {}, {}],
            [{ text: 'VALIDEZ', style: 'thControl', colSpan: 3 }, {}, {}],
            [
              { text: `${data.referencia.validezDias} dias`, style: 'tdControl'},
              { text: data.referencia.numeroReferencia || '', style: 'tdControl' },
              { text: data.referencia.vendedor || '', style: 'tdControl' }
            ]
          ]
        },
        layout: 'cuadroNegro'
        },

        {

          table: {
            headerRows: 1,
            widths: ['auto', 45, '*', 'auto', 'auto'],
            body: [
              [
                { text: 'CODIGO', style: 'thMini' },
                { text: 'CANTIDAD', style: 'thMini', alignment: 'center' },
                { text: 'DESCRIPCION', style: 'thMini' },
                { text: 'P. UNITARIO Bs.', style: 'thMini', alignment: 'right' },
                { text: 'MONTO TOTAL Bs.', style: 'thMini', alignment: 'right' }
              ],
              ...data.items.map(item => [
                { text: item.codigo, style: 'td' },
                { text: item.cantidad.toString(), style: 'td', alignment: 'center' },
                { text: item.descripcion, style: 'td' },
                { text: item.precioUnitarioBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'td', alignment: 'right' },
                { text: item.montoTotalBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'td', alignment: 'right' }
              ])
            ]
          },
          layout: {
            hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1.5 : 1,
            vLineWidth: () => 1,
            hLineColor: () => '#000000',
            vLineColor: () => '#000000',
            paddingTop: () => 5,
            paddingBottom: () => 5
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
                    widths: ['*', '*'],
                    body: [
                      [{ text: 'VALIDEZ', style: 'thMini' }, { text: 'VENDEDOR', style: 'thMini' }],
                      [{ text: `${data.referencia.validezDias} dias`, fontSize: 8, alignment: 'center' }, { text: data.referencia.vendedor, fontSize: 8, alignment: 'center' }]
                    ]
                  },
                  margin: [0, 0, 0, 10]
                },
                {
                  table: {
                    widths: ['*', 'auto'],
                    body: [
                      [{ text: 'NETO Bs.', style: 'labelTotal' }, { text: data.totales.netoBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'thMini' }],
                      [{ text: `DESCUENTO ${data.totales.porcentajeDescuento}% Bs.`, style: 'labelTotal' }, { text: data.totales.descuentoBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'thMini' }],
                      [{ text: 'SUB TOTAL Bs.', style: 'labelTotal' }, { text: data.totales.subTotalBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'thMini' }],
                      [{ text: `I.V.A. ${data.totales.ivaPorcentaje}% Bs.`, style: 'labelTotal' }, { text: data.totales.ivaBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'thMinithMini' }],
                      [{ text: 'EXENTO Bs.', style: 'labelTotal' }, { text: data.totales.exentoBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'thMini' }],
                      [{ text: 'TOTAL Bs.', style: 'labelTotalBold' }, { text: data.totales.totalBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'thMini' }]
                    ]
                  },
                  layout: 'noBorders'
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
        numeroDoc: { fontSize: 14, bold: true, color: '#0d3b66' },
        fechaDoc: { fontSize: 9, bold: true },
        seccionCliente: { fontSize: 9, lineHeight: 1.2 },
        thMini: { fontSize: 7, bold: true, fillColor: '#EEEEEB', alignment: 'center' },
        tdMini: { fontSize: 8 },
        labelTotal: { fontSize: 8.5, alignment: 'right' },
        valorTotal: { fontSize: 8.5, alignment: 'right' },
        labelTotalBold: { fontSize: 10, bold: true, alignment: 'right' },
        valorTotalBold: { fontSize: 10, bold: true, alignment: 'right' },
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
  }
}

    return docDefinition;
  }

}