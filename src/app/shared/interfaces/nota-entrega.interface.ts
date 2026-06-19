import { Cliente, ItemCotizacion, Referencia, Totales } from './cotizacion.interface';

export type { Cliente, ItemCotizacion, Referencia, Totales };

export interface NotaEntrega {
  _id?: string;
  numeroNota: string;
  fecha: string;
  cliente: Cliente;
  items: ItemCotizacion[];
  referencia: Referencia;
  totales: Totales;
}