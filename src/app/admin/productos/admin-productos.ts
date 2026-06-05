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
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';

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
  private notificationModal = inject(NotificationModalService);

  isRoot(): boolean {
    return this.authService.user()?.rol === 'root';
  }

  products = signal<Product[]>([]);
  editingProduct = signal<Product | null>(null);
  isAdding = signal(false);
  showModal = signal(false);
  uploadingImage = signal(false);
  saving = signal(false);
  uploadError = signal<string | null>(null);
  dragOver = signal(false);
  preciosOcultosParaNoRegistrados = signal(false);

  filtroCategoria = '';
  filtroMarca = '';
  filtroNombre = '';

  // Pagination
  currentPage = signal(1);
  itemsPerPage = 20;
  totalProducts = signal(0);  // From backend API
  totalPages = signal(0);     // From backend API
  loading = signal(false);

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
    this.loadProducts();
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
    let filtered = this.products() || [];
    
    const currentFilterState = `${this.filtroNombre}-${this.filtroCategoria}-${this.filtroMarca}`;
    if (currentFilterState !== this._lastFilterState) {
      this._lastFilterState = currentFilterState;
      this.currentPage.set(1);
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
    const filtered = this.filteredProducts || [];
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return Array.isArray(filtered) ? filtered.slice(startIndex, endIndex) : [];
  }

  

  get hasPreviousPage(): boolean {
    return this.currentPage() > 1;
  }

  get hasNextPage(): boolean {
    return this.currentPage() < this.totalPages();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  previousPage() {
    if (this.hasPreviousPage) {
      this.currentPage.update(p => p - 1);
      this.loadProducts();
    }
  }

  nextPage() {
    if (this.hasNextPage) {
      this.currentPage.update(p => p + 1);
      this.loadProducts();
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

  loadProducts() {
    this.loading.set(true);
    this.productsService.getAllProducts().subscribe({
      next: (products: Product[]) => {
        const sortedProducts = [...products].sort((a, b) => {
          const left = Number(a.id);
          const right = Number(b.id);
          return Number.isNaN(left) || Number.isNaN(right) ? String(a.id).localeCompare(String(b.id)) : left - right;
        });
        this.products.set(sortedProducts);
        this.totalProducts.set(sortedProducts.length);
        const pages = Math.max(1, Math.ceil(sortedProducts.length / this.itemsPerPage));
        this.totalPages.set(pages);
        if (this.currentPage() > pages) {
          this.currentPage.set(pages);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.products.set([]);
        this.totalProducts.set(0);
        this.totalPages.set(0);
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
    this.uploadError.set(null);
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
    this.uploadError.set(null);
    this.isAdding.set(false);
    this.editingProduct.set({ ...product });
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

  closeModal() {
    this.uploadError.set(null);
    this.showModal.set(false);
    this.editingProduct.set(null);
  }

  cancelEdit() {
    if (confirm('¿Estás seguro de que quieres cancelar? Se perderán todos los cambios.')) {
      this.closeModal();
    }
  }

  confirmCancel() {
    this.cancelEdit();
  }

  saveProduct() {
    if (this.uploadingImage()) {
      this.notificationModal.error('Espera a que termine la subida de la imagen antes de guardar.');
      return;
    }

    const data = this.formData();
    const title = data.title.trim();
    const category = data.category.trim();

    if (!title) {
      this.notificationModal.error('El título del producto es obligatorio');
      return;
    }

    const payload = {
      title,
      price: data.price,
      description: data.description,
      category: category || ' ',
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
    };

    const isEditing = !!this.editingProduct();

    if (isEditing) {
      if (this.saving()) return;
      this.saving.set(true);
      const productId = String(this.editingProduct()!.id);
      this.http.put<any>(`/api/products/${productId}`, payload).subscribe({
        next: (updated) => {
          this.productsService.clearProductsCache();
          if (data.lineaId) {
            this.lineasService.agregarProductoALinea(data.lineaId, updated.id);
          }
          if (data.enOferta && data.ofertaPrecio > 0) {
            console.log('Actualizando oferta:', updated.id, data.ofertaPrecio);
            this.ofertasBackend.agregarOferta(updated.id, data.ofertaPrecio);
          }
          this.closeModal();
          this.notificationModal.success('Producto actualizado correctamente');
          this.saving.set(false);
          this.loadProducts();
        },
        error: (err) => {
          console.error('Error updating product:', err);
          this.handleProductError(err, 'Error al actualizar producto');
          this.saving.set(false);
        }
      });
    } else {
      if (this.saving()) return;
      this.saving.set(true);
      this.http.post<any>('/api/products', payload).subscribe({
        next: (newProduct) => {
          this.productsService.clearProductsCache();
          if (data.lineaId) {
            this.lineasService.agregarProductoALinea(data.lineaId, newProduct.id);
          }
          if (data.enOferta && data.ofertaPrecio > 0) {
            console.log('Agregando oferta:', newProduct.id, data.ofertaPrecio);
            this.ofertasBackend.agregarOferta(newProduct.id, data.ofertaPrecio);
          }
          this.closeModal();
          this.notificationModal.success('Producto creado correctamente');
          this.saving.set(false);
          this.loadProducts();
        },
        error: (err) => {
          console.error('Error creating product:', err);
          this.handleProductError(err, 'Error al crear producto');
          this.saving.set(false);
        }
      });
    }
  }

  onFileSelected(event: Event) {
    if (this.uploadingImage()) {
      return;
    }
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    this.uploadMainImage(input.files[0]);
  }

  private uploadMainImage(file: File) {
    if (this.uploadingImage()) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.uploadError.set('Por favor selecciona un archivo de imagen válido.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.uploadError.set('La imagen no puede exceder 5MB.');
      return;
    }

    this.uploadError.set(null);
    const previousImage = this.formData().image;
    const previewUrl = URL.createObjectURL(file);
    this.formData.update(data => ({ ...data, image: previewUrl }));
    
    this.uploadingImage.set(true);
    const formData = new FormData();
    formData.append('image', file);

    this.http.post<any>('/api/products/upload-image', formData).subscribe({
      next: (response) => {
        URL.revokeObjectURL(previewUrl);
        if (!response?.url) {
          this.formData.update(data => ({ ...data, image: previousImage || '' }));
          this.uploadError.set('No se recibió una URL válida de la imagen.');
        } else {
          const resolvedImageUrl = new URL(response.url, window.location.origin).toString();
          this.formData.update(data => ({ ...data, image: resolvedImageUrl }));
        }
        this.uploadingImage.set(false);
      },
      error: (err) => {
        URL.revokeObjectURL(previewUrl);
        this.formData.update(data => ({ ...data, image: previousImage || '' }));
        this.uploadingImage.set(false);
        this.uploadError.set('Error al subir la imagen: ' + (err.error?.error || err.message || 'Error desconocido'));
      }
    });
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
    if (this.uploadingImage()) {
      return;
    }
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    this.uploadMainImage(files[0]);
  }

  onAdditionalImageSelected(event: Event) {
    if (this.uploadingImage()) {
      return;
    }
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    this.uploadAdditionalImage(input.files[0]);
  }

  getMaxAdditionalImages(): number {
    return 4;
  }

  private uploadAdditionalImage(file: File) {
    if (this.uploadingImage()) {
      return;
    }

    const currentImages = this.formData().images.length;
    const maxImages = this.getMaxAdditionalImages();
    if (currentImages >= maxImages) {
      this.uploadError.set(`Máximo ${maxImages} imágenes adicionales permitidas`);
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.uploadError.set('Por favor selecciona un archivo de imagen válido.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.uploadError.set('La imagen no puede exceder 5MB.');
      return;
    }

    this.uploadError.set(null);
    const previousImages = this.formData().images;
    const previewUrl = URL.createObjectURL(file);
    this.formData.update(data => ({ ...data, images: [...data.images, previewUrl] }));
    this.uploadingImage.set(true);

    const formData = new FormData();
    formData.append('images', file);

    this.http.post<any>('/api/products/upload-images', formData).subscribe({
      next: (response) => {
        URL.revokeObjectURL(previewUrl);
        if (response.urls && response.urls.length > 0) {
          const resolvedImageUrl = new URL(response.urls[0], window.location.origin).toString();
          this.formData.update(data => ({
            ...data,
            images: data.images.map(img => img === previewUrl ? resolvedImageUrl : img)
          }));
        } else {
          this.formData.update(data => ({ ...data, images: previousImages }));
          this.uploadError.set('No se recibió una URL válida para la imagen adicional.');
        }
        this.uploadingImage.set(false);
      },
      error: (err) => {
        URL.revokeObjectURL(previewUrl);
        this.formData.update(data => ({ ...data, images: previousImages }));
        this.uploadingImage.set(false);
        this.uploadError.set('Error al subir la imagen: ' + (err.error?.error || err.message || 'Error desconocido'));
      }
    });
  }

  removeAdditionalImage(index: number) {
    this.formData.update(data => ({
      ...data,
      images: data.images.filter((_, i) => i !== index)
    }));
  }

  private handleProductError(err: any, defaultMessage: string) {
    const message = err?.error?.error || err?.error || err?.message || defaultMessage;
    this.notificationModal.error(message);
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
      this.uploadAdditionalImage(files[i]);
    }
  }

  deleteProduct(id: number | string) {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      if (this.saving()) return;
      this.saving.set(true);
      const productId = String(id);
      this.http.delete<any>(`/api/products/${productId}`).subscribe({
        next: () => {
          this.productsService.clearProductsCache();
          this.notificationModal.success('Producto eliminado correctamente');
          this.saving.set(false);
          this.loadProducts();
        },
        error: (err) => {
          console.error('Error deleting product:', err);
          this.notificationModal.error('Error al eliminar producto');
          this.saving.set(false);
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