export interface Color {
  id: string;
  nombre: string;
  codigoHex: string;
  imagen: string; // Imagen requerida para cada color
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
  ofertaPrecio?: number;
  createdAt?: Date;
  iva?: boolean;
  ivaPercentage?: number;
  fichaTecnica?: Record<string, string>;
  unidades?: number;
  estado?: 'disponible' | 'agotado';
  colorido?: boolean;
  colores?: Color[];
  // stock removido según solicitud
}

export interface ProductItemCart {
  product: Product;
  quantity: number;
  colorId?: string;
  colorNombre?: string;
}
