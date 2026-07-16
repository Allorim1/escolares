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
  tieneIva: boolean;
  ivaPorcentaje: number;
}

export interface Referencia {
  nroZona: string;
  validezDias: number;
  vendedor: string;
  numeroReferencia: string;
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