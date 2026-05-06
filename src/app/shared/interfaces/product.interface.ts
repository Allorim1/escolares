export interface Color {
  id: string;
  nombre: string;
  codigoHex: string;
}

export interface Product {
  category: string;
  description: string;
  id: number | string;
  image: string;
  images?: string[];
  price: number;
  rating: {
    rate: number;
    count: number;
  };
  title: string;
  marca?: string;
  linea?: string;
  lineaId?: string;
  enOferta?: boolean;
  precioOferta?: number;
  createdAt?: Date;
  iva?: boolean;
  ivaPercentage?: number;
  fichaTecnica?: { [key: string]: string };
  unidades?: number;
  estado?: 'disponible' | 'agotado';
  colorido?: boolean;
  colores?: Color[];
  stock?: number;
}

export interface ProductItemCart {
  product: Product;
  quantity: number;
  colorId?: string;
  colorNombre?: string;
}
