import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ProductsService } from '../../products/data-access/products.service';
import { Product } from '../../shared/interfaces/product.interface';
import { MarcasService, Marca } from '../../shared/data-access/marcas.service';
import { LineasService, Linea } from '../../shared/data-access/lineas.service';

interface ProductFormData {
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  images: string[];
  marca: string;
  lineaId: string;
  iva: boolean;
  ivaPercentage: number;
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
  private lineasService = inject(LineasService);
  private http = inject(HttpClient);

  products = signal<Product[]>([]);
  editingProduct = signal<Product | null>(null);
  isAdding = signal(false);
  showModal = signal(false);
  uploadingImage = signal(false);
  dragOver = signal(false);
  preciosOcultosParaNoRegistrados = signal(false);
  
  filtroCategoria = '';
  filtroMarca = '';
  filtroNombre = '';

  formData = signal<ProductFormData>({
    title: '',
    price: 0,
    description: '',
    category: '',
    image: '',
    marca: '',
    lineaId: '',
    iva: false,
    ivaPercentage: 16,
  });

  categories = ['Lapices', 'Mochilas', "", "women's clothing"];

  get marcas(): Marca[] {
    return this.marcasService.marcas();
  }

  get lineas(): Linea[] {
    return this.lineasService.lineas();
  }

  get filteredProducts(): Product[] {
    let filtered = this.products();
    
    if (this.filtroNombre) {
      const nombre = this.filtroNombre.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(nombre)
      );
    }
    
    if (this.filtroCategoria) {
      filtered = filtered.filter(p => p.category === this.filtroCategoria);
    }
    
    if (this.filtroMarca) {
      filtered = filtered.filter(p => 
        p.marca?.toLowerCase() === this.filtroMarca.toLowerCase()
      );
    }
    
    return filtered;
  }

  ngOnInit() {
    this.loadProducts();
    this.loadPreciosOcultosSetting();
  }

  loadProducts() {
    this.productsService.getProducts().subscribe({
      next: (products) => this.products.set(products),
      error: (err) => console.error('Error loading products:', err),
    });
  }

  loadPreciosOcultosSetting() {
    this.http.get<{ hidden: boolean }>('/api/settings/ocultar-precios').subscribe({
      next: (data) => {
        this.preciosOcultosParaNoRegistrados.set(data.hidden);
      },
      error: () => {}
    });
  }

  togglePreciosOcultos() {
    const nuevoValor = !this.preciosOcultosParaNoRegistrados();
    this.http.put<{ success: boolean }>('/api/settings/ocultar-precios', { hidden: nuevoValor }).subscribe({
      next: () => {
        this.preciosOcultosParaNoRegistrados.set(nuevoValor);
      },
      error: (err) => {
        console.error('Error guardando setting:', err);
        alert('Error al guardar la configuración');
      }
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
      images: [],
      marca: '',
      lineaId: '',
      iva: false,
      ivaPercentage: 16,
    });
    this.showModal.set(true);
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
      images: product.images || [],
      marca: product.marca || '',
      lineaId: (product as any).lineaId || '',
      iva: product.iva || false,
      ivaPercentage: product.ivaPercentage || 16,
    });
    this.showModal.set(true);
  }

  cancelEdit() {
    this.showModal.set(false);
    this.isAdding.set(false);
    this.editingProduct.set(null);
  }

  saveProduct() {
    const data = this.formData();

    if (this.isAdding()) {
      this.http.post<any>('/api/products', {
        title: data.title,
        price: data.price,
        description: data.description,
        category: data.category,
        image: data.image,
        images: data.images,
        marca: data.marca || null,
        lineaId: data.lineaId || null,
        iva: data.iva,
        ivaPercentage: data.ivaPercentage,
      }).subscribe({
        next: (newProduct) => {
          this.products.update((p) => [...p, newProduct]);
          if (data.lineaId) {
            this.lineasService.agregarProductoALinea(data.lineaId, newProduct.id);
          }
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Error creating product:', err);
          alert('Error al crear producto');
        }
      });
    } else if (this.editingProduct()) {
      this.http.put<any>(`/api/products/${this.editingProduct()!.id}`, {
        title: data.title,
        price: data.price,
        description: data.description,
        category: data.category,
        image: data.image,
        images: data.images,
        marca: data.marca || null,
        lineaId: data.lineaId || null,
        iva: data.iva,
        ivaPercentage: data.ivaPercentage,
      }).subscribe({
        next: (updated) => {
          this.products.update((products) => 
            products.map((p) => (p.id === updated.id ? updated : p))
          );
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Error updating product:', err);
          alert('Error al actualizar producto');
        }
      });
    } else {
      this.cancelEdit();
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    this.processFile(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
    
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    this.processFile(file);
  }

  processFile(file: File) {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede exceder 5MB');
      return;
    }

    this.uploadingImage.set(true);
    
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.formData.update(data => ({ ...data, image: base64 }));
      this.uploadingImage.set(false);
    };
    reader.onerror = () => {
      this.uploadingImage.set(false);
      alert('Error al leer el archivo');
    };
    reader.readAsDataURL(file);
  }

  onAdditionalImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    this.processAdditionalFile(file);
  }

  processAdditionalFile(file: File) {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede exceder 5MB');
      return;
    }
    this.uploadingImage.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.formData.update(data => ({ ...data, images: [...data.images, base64] }));
      this.uploadingImage.set(false);
    };
    reader.onerror = () => {
      this.uploadingImage.set(false);
      alert('Error al leer el archivo');
    };
    reader.readAsDataURL(file);
  }

  removeAdditionalImage(index: number) {
    this.formData.update(data => ({ 
      ...data, 
      images: data.images.filter((_, i) => i !== index) 
    }));
  }

  onAdditionalDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onAdditionalDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      this.processAdditionalFile(files[i]);
    }
  }

  deleteProduct(id: number | string) {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      this.http.delete<any>(`/api/products/${id}`).subscribe({
        next: () => {
          this.products.update((products) => products.filter((p) => p.id !== id));
        },
        error: (err) => {
          console.error('Error deleting product:', err);
          alert('Error al eliminar producto');
        }
      });
    }
  }

  getLineaName(product: Product): string {
    const lineaId = (product as any).lineaId;
    if (!lineaId) return '-';
    const linea = this.lineasService.getLineaById(lineaId);
    return linea?.name || '-';
  }
}
