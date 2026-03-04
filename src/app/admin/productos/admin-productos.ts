import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductsService } from '../../products/data-access/products.service';
import { Product } from '../../shared/interfaces/product.interface';
import { MarcasService, Marca } from '../../shared/data-access/marcas.service';

interface ProductFormData {
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  marca: string;
}

@Component({
  selector: 'app-admin-productos',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-productos.html',
  styleUrl: './admin-productos.css',
})
export class AdminProductos implements OnInit {
  private productsService = inject(ProductsService);
  private marcasService = inject(MarcasService);

  products = signal<Product[]>([]);
  editingProduct = signal<Product | null>(null);
  isAdding = signal(false);

  formData = signal<ProductFormData>({
    title: '',
    price: 0,
    description: '',
    category: '',
    image: '',
    marca: '',
  });

  categories = ['electronics', 'jewelery', "men's clothing", "women's clothing"];

  get marcas(): Marca[] {
    return this.marcasService.marcas();
  }

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.productsService.getProducts().subscribe({
      next: (products) => this.products.set(products),
      error: (err) => console.error('Error loading products:', err),
    });
  }

  updateFormField(field: keyof ProductFormData, value: string | number) {
    this.formData.update((data) => ({ ...data, [field]: value }));
  }

  showAddForm() {
    this.isAdding.set(true);
    this.editingProduct.set(null);
    this.formData.set({
      title: '',
      price: 0,
      description: '',
      category: 'electronics',
      image: 'https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_.jpg',
      marca: '',
    });
  }

  showEditForm(product: Product) {
    this.editingProduct.set(product);
    this.isAdding.set(false);
    this.formData.set({
      title: product.title,
      price: product.price,
      description: product.description,
      category: product.category,
      image: product.image,
      marca: product.marca || '',
    });
  }

  cancelEdit() {
    this.editingProduct.set(null);
    this.isAdding.set(false);
  }

  saveProduct() {
    const data = this.formData();

    if (this.isAdding()) {
      const newProduct: Product = {
        id: Math.floor(Math.random() * 10000),
        title: data.title,
        price: data.price,
        description: data.description,
        category: data.category,
        image: data.image,
        rating: { rate: 0, count: 0 },
        marca: data.marca || undefined,
      };
      this.products.update((p) => [...p, newProduct]);
    } else if (this.editingProduct()) {
      const updated: Product = {
        ...this.editingProduct()!,
        title: data.title,
        price: data.price,
        description: data.description,
        category: data.category,
        image: data.image,
        marca: data.marca || undefined,
      };
      this.products.update((products) => products.map((p) => (p.id === updated.id ? updated : p)));
    }

    this.cancelEdit();
  }

  deleteProduct(id: number) {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      this.products.update((products) => products.filter((p) => p.id !== id));
    }
  }
}
