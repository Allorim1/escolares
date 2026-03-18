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
  isOwner?: boolean;
  rol?: 'owner' | 'admin' | 'empleado' | 'usuario';
  nombreCompleto?: string;
  direccion?: string;
  telefono?: string;
  cedula?: string;
  direcciones?: Direccion[];
}

export interface Direccion {
  id: string;
  nombre: string;
  direccion: string;
}
