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
}

export interface ProductItemCart {
  product: Product;
  quantity: number;
}
