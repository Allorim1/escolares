export interface Product {
  category: string;
  description: string;
  id: number | string;
  image: string;
  price: number;
  rating: {
    rate: number;
    count: number;
  };
  title: string;
  marca?: string;
  linea?: string;
  enOferta?: boolean;
  precioOferta?: number;
  createdAt?: Date;
  iva?: boolean;
  ivaPercentage?: number;
}

export interface ProductItemCart {
  product: Product;
  quantity: number;
}
