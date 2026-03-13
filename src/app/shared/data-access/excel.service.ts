import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { PDFDocument } from 'pdf-lib';

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import jsPDF from 'jspdf';

(pdfMake as any).vfs = (pdfFonts as any).vfs;

export interface DatosComprobante {
  numeroComprobante: string;
  fecha: Date;
  proveedor: {
    nombre: string;
    rif: string;
  };
  facturas: {
    operacion: number;
    fecha: Date;
    numeroFactura: string;
    numeroControl: string;
    notaDebito: string;
    notaCredito: string;
    factAfectada: string;
    totalCompras: number;
    exento: number;
    baseImponible: number;
    porcentajeIva: number;
    iva: number;
    retenido: number;
  }[];
}

export interface EstructuraExcel {
  celdas: {
    ref: string;
    valor: any;
    estilo: {
      font: any;
      alignment: any;
      fill: any;
      border: any;
      numFmt: any;
    };
  }[];
  fusiones: string[];
  columnas: { index: number; width: number }[];
  imagenes: { name: string; extension: string; tl: { col: number; row: number }; size: { width: number; height: number } }[];
}

@Injectable({
  providedIn: 'root'
})
export class ExcelService {

  constructor(private http: HttpClient) {}

  private async getLogoBuffer(): Promise<ArrayBuffer> {
    const response = await this.http.get('/ESCOLARES AZUL RIF GRANDE.png', { responseType: 'arraybuffer' }).toPromise();
    return response!;
  }

  async generarComprobanteIVA(datos: DatosComprobante) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Comprobante');

      worksheet.getRow(20).height = 7.5;

      worksheet.columns = [
        { width: 0.29 }, { width: 4.71 }, { width: 10.29 }, { width: 9.86 }, { width: 10.71 },
        { width: 7.14 }, { width: 7 }, { width: 8.43 }, { width: 14.14 }, { width: 14 },
        { width: 14.14 }, { width: 10.14 }, { width: 13.43 }, { width: 13.29 }, { width: 4.29 },
        { width: 11 }, ];

      function crearCajaComprobante(
  startCell: string, 
  endCell: string, 
  titulo: string, 
  valor: any
) {
  // 1. Extraer coordenadas para calcular la división
  const startMatch = startCell.match(/([A-Z]+)(\d+)/);
  const endMatch = endCell.match(/([A-Z]+)(\d+)/);
  
  if (!startMatch || !endMatch) return;

  const colInicio = startMatch[1];
  const filaInicio = parseInt(startMatch[2]);
  const colFin = endMatch[1];
  const filaFin = parseInt(endMatch[2]);

  // 2. Fusionar celdas (Fila superior y Fila inferior)
  // Nota: Esto asume que la caja tiene 2 filas de alto
  worksheet.mergeCells(`${colInicio}${filaInicio}:${colFin}${filaInicio}`);
  worksheet.mergeCells(`${colInicio}${filaFin}:${colFin}${filaFin}`);

  const celdaTop = worksheet.getCell(`${colInicio}${filaInicio}`);
  const celdaBottom = worksheet.getCell(`${colInicio}${filaFin}`);

  // 3. Insertar Contenido
  celdaTop.value = titulo;
  celdaBottom.value = valor;

  // 4. Estilos de Fuente y Alineación
  const estiloComun = { vertical: 'middle', horizontal: 'center' };
  
  celdaTop.font = { bold: true };
  celdaTop.alignment = estiloComun as any;

  celdaBottom.alignment = { horizontal: 'left' }

  celdaTop.border = {
    top: { style: 'thin', color: { argb: 'FF000000' }},
    left: { style: 'thin', color: { argb: 'FF000000' }},
    right: { style: 'thin', color: { argb: 'FF000000' }
    // Dejamos el bottom vacío para que no haya línea divisoria fuerte
  }}

  celdaBottom.border = {
    left: { style: 'thin', color: { argb: 'FF000000' }},
    right: { style: 'thin', color: { argb: 'FF000000' }},
    bottom: { style: 'thin', color: { argb: 'FF000000' }},
  };
}

      const logoBuffer = await this.getLogoBuffer();
      const imageId = workbook.addImage({
        buffer: logoBuffer,
        extension: 'png'
      });

      worksheet.addImage(imageId, {
        tl: { col: 1, row: 0 },
        ext: { width: 316, height: 84 }
      });

      worksheet.getCell('B5').value = 'Agente de Retención: ESCOLARES, C.A';
      worksheet.getCell('B6').value = 'R.I.F.: J-30488367-6';
      worksheet.getCell('B7').value = 'Dirección fiscal: Calle Girardot entre Diaz Moreno y constitución, local 100-51';
      worksheet.getCell('B8').value = "Telefonos: 0241-858.0281        Fax: 0241-858-70.50";

      const subtitle = worksheet.getCell('B10');
      subtitle.font = { bold: true };
      subtitle.value = "COMPROBANTE DE RETENCION DEL IMPUESTO AL VALOR AGREGADO";


      worksheet.mergeCells('K10:L10')
      worksheet.mergeCells('K11:L11')


      const cellCompro = worksheet.getCell('K10')
      cellCompro.value = 'Nro. Comprobante';
      const cellNumCompro = worksheet.getCell('K11');
      cellNumCompro.value = '      '+datos.numeroComprobante;
      cellCompro.font = { bold: true }
      cellCompro.alignment = { vertical: 'middle', horizontal: 'center' };
      cellNumCompro.alignment = { vertical: 'middle' };

      cellCompro.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      }

      cellNumCompro.border = {
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } }
      }

      const fechaFormateada = `${String(datos.fecha.getDate()).padStart(2, '0')}/${String(datos.fecha.getMonth() + 1).padStart(2, '0')}/${datos.fecha.getFullYear()}`;
      crearCajaComprobante('N10', 'N11', 'Fecha', fechaFormateada);


      worksheet.getCell('B11').value = '(Ley IVA- Art. 11 "Seran responsables del pago del impuesto en calidad de agente de retención,';

      worksheet.getCell('B12').value = 'los compradores o adquirientes de determinados bienes muebles y los receptores de ciertos';

      worksheet.getCell('B13').value = '                         servicios, a quienes la Administración tributaria designe como tal¨)    ';

      crearCajaComprobante('B15', 'G16', '      Nombre o Razón Social del Sujeto Retenido', datos.proveedor.nombre);
      crearCajaComprobante('I15', 'L16', 'Registro de Información Fiscal del Sujeto Retenido (RIF)', datos.proveedor.rif)
      crearCajaComprobante('B18', 'L19', "Dirección Fiscal del Sujeto Retenido", datos.proveedor.nombre)
      
      const fechaFactura = datos.facturas[0]?.fecha || datos.fecha;
      const periodoFiscal = `${fechaFactura.getFullYear()}-${String(fechaFactura.getMonth() + 1).padStart(2, '0')}`;
      crearCajaComprobante('N15', 'N16', 'Periodo Fiscal', periodoFiscal);

        worksheet.mergeCells('L21:M21')
      worksheet.mergeCells('L22:M22')


      const comprasInternas = worksheet.getCell('L21')
      comprasInternas.value = '   COMPRAS INTERNAS';
      const OIM = worksheet.getCell('L22');
      OIM.value = '     O IMPORTACIONES';
      comprasInternas.font = { bold: true }
      comprasInternas.alignment = { vertical: 'middle', horizontal: 'center' };
      OIM.font = { bold: true }

      comprasInternas.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      }

      OIM.border = {
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } }
      }

      const headerRow = ['', 'Oper. Nro', 'Fecha de la Factura', 'Nro. de Factura', 'Nro. Control de la Factura', 'Nota de Debito', 'Nota Crédito', 'Nro. de Factura Afectada', 'Total Compras Incluyendo Iva', 'Compras sin derecho a Crédito Iva', 'Base Imponible', '%\nAlicuota', 'Impuesto Iva', 'Impuesto Retenido'];
      const row17 = worksheet.addRow(headerRow);
      
      row17.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        cell.font = { size: 9, bold: true };
        cell.alignment = { wrapText: true, horizontal: 'center' };
      });

      datos.facturas.forEach((fact, index) => {
        const dataRow = [
          '',
          fact.operacion,
          fact.fecha,
          fact.numeroFactura,
          fact.numeroControl,
          fact.notaDebito,
          fact.notaCredito,
          fact.factAfectada,
          fact.totalCompras,
          fact.exento,
          fact.baseImponible,
          fact.porcentajeIva,
          fact.iva,
          fact.retenido
        ];
        const row = worksheet.addRow(dataRow);
        row.eachCell(cell => {
          cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
      });

      worksheet.getCell(`C29`).value = '      ____________________________';
      worksheet.getCell(`C30`).value = '            Agente de Retención';
      worksheet.getCell('C31').value = "                     Firma y Sello";

      worksheet.getCell(`I29`).value = '      ____________________________';
      worksheet.getCell(`I30`).value = '            Agente de Retención';
      worksheet.getCell('I31').value = "                     Firma y Sello";

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Comprobante_Retencion_IVA_${datos.numeroComprobante}.xlsx`);
    } catch (error) {
      console.error('Error generando Excel:', error);
      alert('Error al generar el Excel. Por favor revise la consola.');
    }
  }

  async obtenerPlanoDetallado(file: File): Promise<EstructuraExcel> {
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) throw new Error("No se encontró la hoja de trabajo.");

    const estructura: EstructuraExcel = {
      celdas: [],
      fusiones: [],
      columnas: [],
      imagenes: []
    };

    const model = (worksheet as any).model;
    if (model && model.merges) {
      estructura.fusiones = model.merges.map((range: any) => range.full);
    }

    console.log('=== DEBUG MODEL IMAGES ===');
    console.log('model:', model);
    console.log('==========================');

    if (model && model.images) {
      estructura.imagenes = model.images.map((img: any) => ({
        name: img.name || 'image',
        extension: img.extension || 'png',
        tl: { col: img.tl?.col || 0, row: img.tl?.row || 0 },
        size: { width: img.ext?.width || 100, height: img.ext?.height || 100 }
      }));
    }

    worksheet.columns?.forEach((col, index) => {
      estructura.columnas.push({
        index: index + 1,
        width: col.width || 10
      });
    });

    worksheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        estructura.celdas.push({
          ref: cell.address,
          valor: cell.value,
          estilo: {
            font: cell.font,
            alignment: cell.alignment,
            fill: cell.fill,
            border: cell.border,
            numFmt: cell.numFmt
          }
        });
      });
    });

    return estructura;
  }


  private async getLogoBase64(): Promise<string> {
    const buffer = await this.getLogoBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    return `data:image/png;base64,${base64}`;
  }

  async generarHtmlComprobante(datos: DatosComprobante): Promise<string> {
    const logoBase64 = await this.getLogoBase64();
    const fechaFormateada = `${String(datos.fecha.getDate()).padStart(2, '0')}/${String(datos.fecha.getMonth() + 1).padStart(2, '0')}/${datos.fecha.getFullYear()}`;
    const fechaFactura = datos.facturas[0]?.fecha || datos.fecha;
    const periodoFiscal = `${fechaFactura.getFullYear()}-${String(fechaFactura.getMonth() + 1).padStart(2, '0')}`;

    let filasFacturas = '';
    datos.facturas.forEach((fact, index) => {
      const rowNum = 23 + index;
      filasFacturas += `
        <tr>
          <td>${fact.operacion}</td>
          <td>${String(fechaFactura.getDate()).padStart(2, '0')}/${String(fechaFactura.getMonth() + 1).padStart(2, '0')}/${fechaFactura.getFullYear()}</td>
          <td>${fact.numeroFactura}</td>
          <td>${fact.numeroControl}</td>
          <td>${fact.notaDebito}</td>
          <td>${fact.notaCredito}</td>
          <td>${fact.factAfectada}</td>
          <td>${fact.totalCompras.toFixed(2)}</td>
          <td>${fact.exento.toFixed(2)}</td>
          <td>${fact.baseImponible.toFixed(2)}</td>
          <td>${fact.porcentajeIva}%</td>
          <td>${fact.iva.toFixed(2)}</td>
          <td>${fact.retenido.toFixed(2)}</td>
        </tr>
      `;
    });

    const totalBaseImponible = datos.facturas.reduce((sum, f) => sum + f.baseImponible, 0);
    const totalIva = datos.facturas.reduce((sum, f) => sum + f.iva, 0);
    const totalRetenido = datos.facturas.reduce((sum, f) => sum + f.retenido, 0);
    const totalExento = datos.facturas.reduce((sum, f) => sum + f.exento, 0);
    const totalCompras = datos.facturas.reduce((sum, f) => sum + f.totalCompras, 0);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Comprobante de Retención IVA</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10px; padding: 10px; }
    .comprobante { max-width: 100%; border: 1px solid #000; padding: 10px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #000; padding-bottom: 10px; }
    .logo { width: 150px; }
    .info-empresa { flex: 1; margin-left: 10px; }
    .info-empresa h2 { font-size: 14px; margin-bottom: 5px; }
    .info-empresa p { font-size: 9px; margin-bottom: 2px; }
    .info-comprobante { text-align: right; border: 1px solid #000; padding: 5px; min-width: 150px; }
    .info-comprobante .titulo { font-weight: bold; }
    .datos-sujeto { display: flex; gap: 10px; margin: 10px 0; }
    .datos-sujeto .caja { border: 1px solid #000; padding: 5px; flex: 1; }
    .datos-sujeto .caja .titulo { font-weight: bold; font-size: 8px; }
    .datos-sujeto .caja .valor { font-size: 9px; }
    .periodo { border: 1px solid #000; padding: 5px; text-align: center; min-width: 100px; }
    .periodo .titulo { font-weight: bold; font-size: 8px; }
    .periodo .valor { font-size: 9px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 8px; }
    th, td { border: 1px solid #000; padding: 3px; text-align: center; }
    th { background-color: #f0f0f0; }
    .totales { display: flex; justify-content: flex-end; margin: 10px 0; }
    .totales-caja { border: 1px solid #000; padding: 10px; width: 300px; }
    .totales-caja .fila { display: flex; justify-content: space-between; padding: 2px 0; }
    .firmas { display: flex; justify-content: space-between; margin-top: 30px; }
    .firma { border-top: 1px solid #000; width: 200px; padding-top: 5px; text-align: center; font-size: 8px; }
    .legal { font-size: 8px; margin-top: 20px; text-align: center; }
    @media print {
      body { padding: 0; }
      .comprobante { border: none; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="comprobante">
    <div class="header">
      <div class="logo">
        <img src="${logoBase64}" alt="Logo" style="width: 120px;">
      </div>
      <div class="info-empresa">
        <h2>ESCOLARES, C.A</h2>
        <p>R.I.F.: J-30488367-6</p>
        <p>Dirección fiscal: Calle Girardot entre Diaz Moreno y constitución, local 100-51</p>
        <p>Teléfonos: 0241-858.0281 | Fax: 0241-858-70.50</p>
      </div>
      <div class="info-comprobante">
        <div class="titulo">Nro. Comprobante</div>
        <div>${datos.numeroComprobante}</div>
        <div class="titulo" style="margin-top:5px;">Fecha</div>
        <div>${fechaFormateada}</div>
      </div>
    </div>

    <div style="text-align: center; margin-bottom: 10px;">
      <strong>COMPROBANTE DE RETENCION DEL IMPUESTO AL VALOR AGREGADO</strong>
      <p style="font-size: 8px;">(Ley IVA- Art. 11 "Serán responsables del pago del impuesto en calidad de agente de retención, los compradores o adquirientes de determinados bienes muebles y los receptores de ciertos servicios, a quienes la Administración tributaria designe como tal")</p>
    </div>

    <div class="datos-sujeto">
      <div class="caja">
        <div class="titulo">Nombre o Razón Social del Sujeto Retenido</div>
        <div class="valor">${datos.proveedor.nombre}</div>
      </div>
      <div class="caja">
        <div class="titulo">Registro de Información Fiscal (RIF)</div>
        <div class="valor">${datos.proveedor.rif}</div>
      </div>
      <div class="periodo">
        <div class="titulo">Período Fiscal</div>
        <div class="valor">${periodoFiscal}</div>
      </div>
    </div>

    <div class="caja" style="border: 1px solid #000; padding: 5px; margin-bottom: 10px;">
      <div class="titulo">Dirección Fiscal del Sujeto Retenido</div>
      <div class="valor">${datos.proveedor.nombre}</div>
    </div>

    <div style="font-weight: bold; margin-bottom: 5px;">COMPRAS INTERNAS / IMPORTACIONES</div>

    <table>
      <thead>
        <tr>
          <th>Nro</th>
          <th>Fecha</th>
          <th>Nro. Factura</th>
          <th>Nro. Control</th>
          <th>Nota Débito</th>
          <th>Nota Crédito</th>
          <th>Fact. Afectada</th>
          <th>Total Compras</th>
          <th>Exento</th>
          <th>Base Imponible</th>
          <th>% IVA</th>
          <th>IVA</th>
          <th>Retenido</th>
        </tr>
      </thead>
      <tbody>
        ${filasFacturas}
      </tbody>
    </table>

    <div class="totales">
      <div class="totales-caja">
        <div class="fila"><span>Total Compras:</span><span>${totalCompras.toFixed(2)}</span></div>
        <div class="fila"><span>Exento:</span><span>${totalExento.toFixed(2)}</span></div>
        <div class="fila"><span>Base Imponible:</span><span>${totalBaseImponible.toFixed(2)}</span></div>
        <div class="fila"><span>Total IVA:</span><span>${totalIva.toFixed(2)}</span></div>
        <div class="fila" style="font-weight: bold;"><span>Total Retenido:</span><span>${totalRetenido.toFixed(2)}</span></div>
      </div>
    </div>

    <div class="firmas">
      <div class="firma">
        ____________________________<br>
        Agente de Retención<br>
        Firma y Sello
      </div>
      <div class="firma">
        ____________________________<br>
        Sujeto Retenido<br>
        Firma y Sello
      </div>
    </div>

    <div class="legal">
      Este comprobante es válido siempre que contenga la firma del agente de retención y este sea elaborado en originales y copias.
    </div>
  </div>

  <div class="no-print" style="margin-top: 20px; text-align: center;">
    <button onclick="window.print()" style="padding: 10px 20px; margin: 5px; cursor: pointer;">Imprimir</button>
    <button onclick="window.close()" style="padding: 10px 20px; margin: 5px; cursor: pointer;">Cerrar</button>
  </div>
</body>
</html>
    `;
  }

  async extraerDatosPDF(file: File): Promise<any> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    const resultado: any = {
      esFormulario: fields.length > 0,
      campos: [] as string[],
      texto: ''
    };

    if (fields.length > 0) {
      fields.forEach(f => {
        const name = f.getName();
        let value = '';
        try {
          if ('getText' in f) {
            value = (f as any).getText() || '';
          } else if ('getRadioGroup' in f) {
            value = (f as any).getSelected() || '';
          } else if ('getCheckBox' in f) {
            value = (f as any).isChecked() ? 'marcado' : 'no marcado';
          }
        } catch (e) {}
        resultado.campos.push(`${name}: ${value}`);
      });
    }

    const pages = pdfDoc.getPages();
    resultado.numeroPaginas = pages.length;

    return resultado;
  }
}
