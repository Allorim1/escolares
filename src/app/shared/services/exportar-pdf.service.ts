import { Injectable } from '@angular/core';
import { Cotizacion } from '../interfaces/cotizacion.interface';

@Injectable({
  providedIn: 'root',
})
export class ExportarPdfService {

  generarCotizacionPdf(data: Cotizacion) {
    const docDefinition: any = {
      content: [
        {
          columns: [
            {
              text: [
                { text: 'Libreria y Papeleria\n', style: 'headerSub' },
                { text: 'ESCOLARES.CO\n', style: 'headerTitle' },
                { text: 'Mayor y Detal\n', style: 'headerSub' },
                { text: 'R.I.F. J-30488367-6\n', style: 'datosEmpresa' },
                { text: 'Calle Girardoth, entre Av. Constitucion y diaz Moreno\n', style: 'datosEmpresa' },
                { text: 'Telf. 0241-8580281 Fax. 0241-8587050\n', style: 'datosEmpresa' },
                { text: 'Valencia Edo. Carabobo\n', style: 'datosEmpresa' }
              ],
              width: '60%'
            },
            {
              stack: [
                { text: 'COTIZACION', style: 'tituloDoc' },
                { text: data.numeroCotizacion, style: 'numeroDoc' },
                { text: `FECHA: ${data.fecha}`, style: 'fechaDoc', margin: [0, 10, 0, 0] }
              ],
              alignment: 'right',
              width: '40%'
            }
          ]
        },
        
        { text: 'www.escolaresonline.com', style: 'webSite', margin: [0, 2, 0, 15] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, strokeColor: '#A0A0A0' }] },

        {
          margin: [0, 10, 0, 15],
          table: {
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    { text: `CLIENTE: ${data.cliente.nombre}`, bold: true },
                    { text: `RIF: ${data.cliente.rif}` },
                    { text: `Dirección: ${data.cliente.direccion || ''}` },
                    { text: `Teléfono: ${data.cliente.telefono || ''}` }
                  ],
                  style: 'seccionCliente'
                }
              ]
            ]
          },
          layout: {
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 6,
            paddingBottom: () => 6,
            strokeColor: () => '#CCCCCC'
          }
        },

        {
          style: 'tablaArticulos',
          table: {
            headerRows: 1,
            widths: ['auto', 45, '*', 'auto', 'auto'],
            body: [
              [
                { text: 'CODIGO', style: 'th' },
                { text: 'CANTIDAD', style: 'th', alignment: 'center' },
                { text: 'DESCRIPCION', style: 'th' },
                { text: 'P. UNITARIO Bs.', style: 'th', alignment: 'right' },
                { text: 'MONTO TOTAL Bs.', style: 'th', alignment: 'right' }
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
            hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#AAAAAA',
            vLineColor: () => '#E0E0E0',
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
                { text: 'VENEZUELA: 0102-0391-16-0000000589', fontSize: 8, fontFeatures: ['tnum'] },
                { text: 'BANESCO: 0134-0187-08-1871037067', fontSize: 8, fontFeatures: ['tnum'] },
                { text: 'BANCARIBE: 0114-0220-85-2200183943', fontSize: 8, fontFeatures: ['tnum'] },
                { text: 'PAGO MOVIL BANESCO: RIF: 304883676 TELF. 04144000800, ESCOLARES CA.', fontSize: 8, fontFeatures: ['tnum'], bold: true, margin: [0, 2, 0, 4] },
                { text: 'AL REALIZAR SU TRANSFERENCIA REPORTAR EL PAGO A: cobranzascorp@escolaresonline.com', fontSize: 7.5, italic: true },
                { text: `OBSERVACIONES: EL TOTAL DE LA COTIZACIÓN SE REGIRA POR LA REFERENCIA ESTABLECIDA NRO: ${data.referencia.numeroReferencia}`, fontSize: 7.5, bold: true, margin: [0, 8, 0, 0] }
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
                      [{ text: 'NETO Bs.', style: 'labelTotal' }, { text: data.totales.netoBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'valorTotal' }],
                      [{ text: `DESCUENTO ${data.totales.porcentajeDescuento}% Bs.`, style: 'labelTotal' }, { text: data.totales.descuentoBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'valorTotal' }],
                      [{ text: 'SUB TOTAL Bs.', style: 'labelTotal' }, { text: data.totales.subTotalBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'valorTotal' }],
                      [{ text: `I.V.A. ${data.totales.ivaPorcentaje}% Bs.`, style: 'labelTotal' }, { text: data.totales.ivaBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'valorTotal' }],
                      [{ text: 'EXENTO Bs.', style: 'labelTotal' }, { text: data.totales.exentoBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'valorTotal' }],
                      [{ text: 'TOTAL Bs.', style: 'labelTotalBold' }, { text: data.totales.totalBs.toLocaleString('de-DE', { minimumFractionDigits: 2 }), style: 'valorTotalBold' }]
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
            { text: '_______________________\nELABORADO POR', alignment: 'center', style: 'firma' },
            { text: '_______________________\nRECIBIDO POR\nFIRMA Y SELLO', alignment: 'center', style: 'firma' }
          ]
        }
      ],

      styles: {
        headerTitle: { fontSize: 16, bold: true, color: '#0d3b66' },
        headerSub: { fontSize: 10, bold: true },
        datosEmpresa: { fontSize: 8, color: '#444444' },
        webSite: { fontSize: 9, bold: true, color: '#0d3b66' },
        tituloDoc: { fontSize: 14, bold: true, tracking: 2 },
        numeroDoc: { fontSize: 14, bold: true, color: 'red' },
        fechaDoc: { fontSize: 9, bold: true },
        seccionCliente: { fontSize: 9, lineHeight: 1.2 },
        th: { fontSize: 8, bold: true, fillColor: '#F5F5F5', margin: [0, 3, 0, 3] },
        td: { fontSize: 8, fontFeatures: ['tnum'] },
        thMini: { fontSize: 7, bold: true, fillColor: '#EEEEEB', alignment: 'center' },
        labelTotal: { fontSize: 8.5, alignment: 'right' },
        valorTotal: { fontSize: 8.5, alignment: 'right', fontFeatures: ['tnum'] },
        labelTotalBold: { fontSize: 10, bold: true, alignment: 'right' },
        valorTotalBold: { fontSize: 10, bold: true, alignment: 'right', fontFeatures: ['tnum'] },
        firma: { fontSize: 8, bold: true }
      },
      defaultStyle: {
        font: 'Helvetica'
      }
    };

    return docDefinition;
  }
}