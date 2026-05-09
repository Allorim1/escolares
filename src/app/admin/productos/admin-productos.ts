import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ProductsService } from '../../products/data-access/products.service';
import { Product } from '../../shared/interfaces/product.interface';
import { MarcasService, Marca } from '../../shared/data-access/marcas.service';
import { LineasService, Linea } from '../../shared/data-access/lineas.service';
import { OfertasBackend } from '../../backend/data-access/ofertas.backend';
import { AuthService } from '../../shared/data-access/auth.service';

interface CategoriaProducto {
  id: string;
  nombre: string;
}

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
  estado: 'disponible' | 'agotado';
  enOferta: boolean;
  ofertaPorcentaje: number;
  ofertaPrecio: number;
  ratingRate: number;
  ratingCount: number;
}

@Component({
  selector: 'app-admin-productos',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './admin-productos.html',
  styleUrl: './admin-productos.css',
})
export class AdminProductos implements OnInit {
  private productsService = inject(ProductsService);
  private marcasService = inject(MarcasService);
  private lineasService = inject(LineasService);
  private http = inject(HttpClient);
  private ofertasBackend = inject(OfertasBackend);
  private authService = inject(AuthService);

  isRoot(): boolean {
    return this.authService.user()?.rol === 'root';
  }

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

  // Pagination
  currentPage = signal(1);
  itemsPerPage = 20;
  totalProducts = signal(0);
  totalPages = signal(0);
  loading = signal(false);
   totalProducts = signal(0);
   totalPages = signal(0);

  formData = signal<ProductFormData>({
    title: '',
    price: 0,
    description: '',
    category: '',
    image: '',
    images: [],
    marca: '',
    lineaId: '',
    iva: false,
    ivaPercentage: 16,
    estado: 'disponible',
    enOferta: false,
    ofertaPorcentaje: 0,
    ofertaPrecio: 0,
    ratingRate: 0,
    ratingCount: 0,
  });

  ofertaFieldModifiedByUser = signal<string | null>(null);

  productCategories = signal<CategoriaProducto[]>([]);
  newCategoryName = '';
  showCategoryModal = signal(false);

  ngOnInit() {
    this.loadProducts(this.currentPage());
    this.loadProductCategories();
    this.loadPreciosOcultosSetting();
  }

  loadProductCategories() {
    this.http.get<any[]>('/api/productos-categorias').subscribe({
      next: (data) => {
        this.productCategories.set(data);
      },
      error: () => {
        this.productCategories.set([
          { id: 'cat-1', nombre: 'Lápices' },
          { id: 'cat-2', nombre: 'Mochilas' },
          { id: 'cat-3', nombre: 'Uniformes' },
        ]);
      }
    });
  }

  openCategoryModal() {
    this.newCategoryName = '';
    this.showCategoryModal.set(true);
  }

  closeCategoryModal() {
    this.showCategoryModal.set(false);
  }

  addCategory() {
    const nombre = this.newCategoryName.trim();
    if (!nombre) return;

    this.http.post<any>('/api/productos-categorias', { nombre }).subscribe({
      next: () => {
        this.loadProductCategories();
        this.closeCategoryModal();
      }
    });
  }

  deleteCategory(cat: CategoriaProducto) {
    if (!confirm(`¿Eliminar categoría "${cat.nombre}"?`)) return;

    this.http.delete<any>(`/api/productos-categorias/${cat.id}`).subscribe({
    });
  }

  private _lastFilterState = '';

  get filteredProducts(): Product[] {
    let filtered = this.products();
    
    const currentFilterState = `${this.filtroNombre}-${this.filtroCategoria}-${this.filtroMarca}`;
    if (currentFilterState !== this._lastFilterState) {
      this._lastFilterState = currentFilterState;
      this.currentPage.set(1); // Reset to first page when filters change
    }

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

  get paginatedProducts(): Product[] {
    const filtered = this.filteredProducts;
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredProducts.length / this.itemsPerPage);
  }

  get hasPreviousPage(): boolean {
    return this.currentPage() > 1;
  }

  get hasNextPage(): boolean {
    return this.currentPage() < this.totalPages;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage.set(page);
    }
  }

  previousPage() {
    if (this.hasPreviousPage) {
      this.currentPage.update(p => p - 1);
      this.loadProducts(this.currentPage());
    }
  }

  nextPage() {
    if (this.hasNextPage) {
      this.currentPage.update(p => p + 1);
      this.loadProducts(this.currentPage());
    }
  }

  get categories(): string[] {
    return ['Nueva...', ...this.productCategories().map(c => c.nombre)];
  }

  get categorias(): CategoriaProducto[] {
    return this.productCategories();
  }

  get marcas(): Marca[] {
    return this.marcasService.marcas();
  }

  get lineas(): Linea[] {
    return this.lineasService.lineas();
  }

  loadProducts(page: number = 1) {
    this.loading.set(true);
    this.productsService.getProducts(page, 20).subscribe({
      next: (response: any) => {
        this.products.set(response.products);
        this.totalProducts = response.total;
        this.totalPages = response.totalPages;
        this.currentPage = response.page;
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.products.set([]);
        this.totalProducts = 0;
        this.totalPages = 0;
        this.currentPage = 1;
      }
    });
  }

  loadPreciosOcultosSetting() {
    this.http.get<any>('/api/config/precios-ocultos').subscribe({
      next: (data) => {
        this.preciosOcultosParaNoRegistrados.set(data.hidden);
      },
      error: () => {
        this.preciosOcultosParaNoRegistrados.set(false);
      }
    });
  }

  togglePreciosOcultos() {
    const nuevoValor = !this.preciosOcultosParaNoRegistrados();
    this.http.post<any>('/api/config/precios-ocultos', { hidden: nuevoValor }).subscribe({
      next: () => {
        this.preciosOcultosParaNoRegistrados.set(nuevoValor);
      },
      error: () => {
        alert('Error al guardar la configuración');
      }
    });
  }

  updateFormField(field: keyof ProductFormData, value: string | number | boolean) {
    this.formData.update((data) => ({ ...data, [field]: value }));
  }

  showAddForm() {
    this.isAdding.set(true);
    this.editingProduct.set(null);
    this.ofertaFieldModifiedByUser.set(null);
    this.formData.set({
      title: '',
      price: 0,
      description: '',
      category: '',
      image: '',
      images: [],
      marca: '',
      lineaId: '',
      iva: false,
      ivaPercentage: 16,
      estado: 'disponible',
      enOferta: false,
      ofertaPorcentaje: 0,
      ofertaPrecio: 0,
      ratingRate: 0,
      ratingCount: 0,
    });
    this.showModal.set(true);
  }

  showEditForm(product: Product) {
    this.isAdding.set(false);
    this.editingProduct.set(product);
    this.ofertaFieldModifiedByUser.set(null);
    this.formData.set({
      title: product.title,
      price: product.price,
      description: product.description,
      category: product.category,
      image: product.image,
      images: product.images || [],
      marca: product.marca || '',
      lineaId: product.lineaId || '',
      iva: product.iva || false,
      ivaPercentage: product.ivaPercentage || 16,
      estado: product.estado || 'disponible',
      enOferta: product.enOferta || false,
      ofertaPorcentaje: (product as any).ofertaPorcentaje || 0,
      ofertaPrecio: (product as any).ofertaPrecio || 0,
      ratingRate: product.rating?.rate || 0,
      ratingCount: product.rating?.count || 0,
    });
    this.showModal.set(true);
  }

  cancelEdit() {
    if (confirm('¿Estás seguro de que quieres cancelar? Se perderán todos los cambios.')) {
      this.showModal.set(false);
      this.editingProduct.set(null);
    }
  }

  confirmCancel() {
    if (confirm('¿Estás seguro de que quieres cancelar? Se perderán todos los cambios.')) {
      this.showModal.set(false);
      this.editingProduct.set(null);
    }
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
        estado: data.estado,
        enOferta: data.enOferta,
        ofertaPorcentaje: data.ofertaPorcentaje,
        ofertaPrecio: data.ofertaPrecio,
        rating: { rate: data.ratingRate, count: data.ratingCount },
      }).subscribe({
        next: (newProduct) => {
          this.products.update((p) => [...p, newProduct]);
          // Reload current page to show the new product
          this.loadProducts(this.currentPage());
          if (data.lineaId) {
            this.lineasService.agregarProductoALinea(data.lineaId, newProduct.id);
          }
          if (data.enOferta && data.ofertaPrecio > 0) {
            console.log('Agregando oferta:', newProduct.id, data.ofertaPrecio);
            this.ofertasBackend.agregarOferta(newProduct.id, data.ofertaPrecio);
          }
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Error creating product:', err);
          alert('Error al crear producto');
        }
      });
    } else if (this.editingProduct()) {
      const productId = this.editingProduct()!.id;
      this.http.put<any>(`/api/products/${productId}`, {
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
        estado: data.estado,
        enOferta: data.enOferta,
        ofertaPorcentaje: data.ofertaPorcentaje,
        ofertaPrecio: data.ofertaPrecio,
        rating: { rate: data.ratingRate, count: data.ratingCount },
      }).subscribe({
        next: (updated) => {
            this.products.update((products) => 
                products.map((p) => (p.id === productId ? updated : p))
            );
            // Reload current page to show the updated product
            this.loadProducts(this.currentPage());
          if (data.lineaId) {
            this.lineasService.agregarProductoALinea(data.lineaId, updated.id);
          }
          if (data.enOferta && data.ofertaPrecio > 0) {
            console.log('Actualizando oferta:', updated.id, data.ofertaPrecio);
            this.ofertasBackend.agregarOferta(updated.id, data.ofertaPrecio);
          }
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Error updating product:', err);
          alert('Error al actualizar producto');
        }
      });
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    this.processFile(input.files[0]);
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
    this.processFile(files[0]);
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
    this.processAdditionalFile(input.files[0]);
  }

  getMaxAdditionalImages(): number {
    return 4;
  }

  processAdditionalFile(file: File) {
    const currentImages = this.formData().images.length;
    const maxImages = this.getMaxAdditionalImages();
    if (currentImages >= maxImages) {
      alert(`Máximo ${maxImages} imágenes adicionales permitidas`);
      return;
    }
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

  getLineaNameById(lineaId: string): string {
    const linea = this.lineasService.getLineaById(lineaId);
    return linea?.name || '-';
  }

  setMainImage(img: string) {
    const currentMain = this.formData().image;
    const currentImages = this.formData().images.filter(i => i !== img);
    this.formData.update(data => ({
      ...data,
      image: img,
      images: currentMain ? [currentMain, ...currentImages] : currentImages
    }));
  }

  calculateIvaIncluded(): { base: number; iva: number; total: number } {
    const price = this.formData().price || 0;
    const ivaPercent = this.formData().ivaPercentage || 0;
    const base = price / (1 + ivaPercent / 100);
    const iva = price - base;
    return { base, iva, total: price };
  }

  calculateOfferPrice(): number {
    if (this.formData().enOferta) {
      const ofertaPrice = this.formData().ofertaPrecio || 0;
      const ofertaPorcentaje = this.formData().ofertaPorcentaje || 0;
      if (ofertaPrice > 0 && ofertaPorcentaje === 0) {
        return ofertaPrice;
      }
      const price = this.formData().price || 0;
      if (ofertaPorcentaje > 0) {
        return price * (1 - ofertaPorcentaje / 100);
      }
    }
    return this.formData().price || 0;
  }

  onOfertaPorcentajeChange(value: any) {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      this.formData.update(data => ({ ...data, ofertaPorcentaje: numValue }));
      this.ofertaFieldModifiedByUser.set('porcentaje');
      this.formData.update(data => ({ ...data, ofertaPrecio: this.calculateOfferPrice() }));
      this.ofertaFieldModifiedByUser.set(null);
    }
  }

  onOfertaPrecioChange(value: any) {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      this.formData.update(data => ({ ...data, ofertaPrecio: numValue }));
      this.ofertaFieldModifiedByUser.set('precio');
      const price = this.formData().price || 0;
      if (price > 0) {
        const porcentaje = ((price - numValue) / price) * 100;
        this.formData.update(data => ({ ...data, ofertaPorcentaje: porcentaje }));
      }
      this.ofertaFieldModifiedByUser.set(null);
    }
  }
}