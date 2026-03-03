export interface Product {
  category: string;
  description: string;
  id: number;
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
}

export interface ProductItemCart {
  product: Product;
  quantity: number;
}
