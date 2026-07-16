export interface Marca {
  id: string;
  name: string;
  image?: string;
}

export interface Linea {
  id: string;
  name: string;
  image: string;
  productIds: (number | string)[];
}

export interface Oferta {
  productId: number | string;
  precioOferta: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  isAdmin: boolean;
  rol?: 'root' | 'admin' | 'usuario' | 'repartidor';
  rolId?: string;
  deliveryPersonId?: string;
  nombreCompleto?: string;
  direccion?: string;
  telefono?: string;
  cedula?: string;
  tipoPersona?: 'natural' | 'juridica';
  direcciones?: Direccion[];
  metodosPago?: MetodoPago[];
  supervisorKey?: string;
  comentarios?: string;
  favoritos?: (number | string)[];
}

export interface Direccion {
   id: string;
   nombre: string;
   direccion: string;
   alias?: string;
   calle?: string;
   ciudad?: string;
   estado?: string;
   codigoPostal?: string;
   principal?: boolean;
   direccionCompleta?: string;
   placeId?: string;
   latitud?: number;
   longitud?: number;
 }

export interface MetodoPago {
  id: string;
  alias: string;
  tipo: 'zelle' | 'efectivo' | 'transferencia' | 'pago_movil';
  titular?: string;
  referencia?: string;
  banco?: string;
  telefono?: string;
  principal?: boolean;
}

export interface UserSession {
  id: string;
  userId: string;
  username: string;
  email: string;
  rol: string;
  ip?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  active: boolean;
  createdAt: string;
  lastActive: string;
}
