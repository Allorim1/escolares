export interface Cliente {
  nombre: string;
  rif: string;
  direccion?: string;
  telefono?: string;
}

export interface ItemCotizacion {
  codigo: string;
  cantidad: number;
  descripcion: string;
  precioUnitarioBs: number;
  montoTotalBs: number;
}

export interface Referencia {
  numeroReferencia: string;
  validezDias: number;
  vendedor: string;
}

export interface Totales {
  netoBs: number;
  porcentajeDescuento: number;
  descuentoBs: number;
  subTotalBs: number;
  ivaPorcentaje: number;
  ivaBs: number;
  exentoBs: number;
  totalBs: number;
}

export interface Cotizacion {
  _id?: string;
  numeroCotizacion: string;
  fecha: string;
  cliente: Cliente;
  items: ItemCotizacion[];
  referencia: Referencia;
  totales: Totales;
}