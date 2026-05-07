import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { ProductsService } from '../../products/data-access/products.service';
import { Product, Color } from '../../shared/interfaces/product.interface';
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
  colorido: boolean;
  colores: Color[];
}

// Default colors for easier selection
const defaultColors: Color[] = [
  { id: '1', nombre: 'Rojo', codigoHex: '#FF0000', imagen: 'https://via.placeholder.com/150/FF0000/FFFFFF?text=Rojo' },
  { id: '2', nombre: 'Rojo Oscuro', codigoHex: '#8B0000', imagen: 'https://via.placeholder.com/150/8B0000/FFFFFF?text=Rojo+Oscuro' },
  { id: '3', nombre: 'Verde', codigoHex: '#00FF00', imagen: 'https://via.placeholder.com/150/00FF00/000000?text=Verde' },
  { id: '4', nombre: 'Verde Oscuro', codigoHex: '#006400', imagen: 'https://via.placeholder.com/150/006400/FFFFFF?text=Verde+Oscuro' },
  { id: '5', nombre: 'Azul', codigoHex: '#0000FF', imagen: 'https://via.placeholder.com/150/0000FF/FFFFFF?text=Azul' },
  { id: '6', nombre: 'Azul Marino', codigoHex: '#000080', imagen: 'https://via.placeholder.com/150/000080/FFFFFF?text=Azul+Marino' },
  { id: '7', nombre: 'Azul Claro', codigoHex: '#ADD8E6', imagen: 'https://via.placeholder.com/150/ADD8E6/000000?text=Azul+Claro' },
  { id: '8', nombre: 'Amarillo', codigoHex: '#FFFF00', imagen: 'https://via.placeholder.com/150/FFFF00/000000?text=Amarillo' },
  { id: '9', nombre: 'Amarillo Dorado', codigoHex: '#FFD700', imagen: 'https://via.placeholder.com/150/FFD700/000000?text=Dorado' },
  { id: '10', nombre: 'Naranja', codigoHex: '#FFA500', imagen: 'https://via.placeholder.com/150/FFA500/000000?text=Naranja' },
  { id: '11', nombre: 'Rosa', codigoHex: '#FFC0CB', imagen: 'https://via.placeholder.com/150/FFC0CB/000000?text=Rosa' },
  { id: '12', nombre: 'Rosa Fuerte', codigoHex: '#FF1493', imagen: 'https://via.placeholder.com/150/FF1493/FFFFFF?text=Rosa+Fuerte' },
  { id: '13', nombre: 'Morado', codigoHex: '#800080', imagen: 'https://via.placeholder.com/150/800080/FFFFFF?text=Morado' },
  { id: '14', nombre: 'Morado Claro', codigoHex: '#DDA0DD', imagen: 'https://via.placeholder.com/150/DDA0DD/000000?text=Morado+Claro' },
  { id: '15', nombre: 'Negro', codigoHex: '#000000', imagen: 'https://via.placeholder.com/150/000000/FFFFFF?text=Negro' },
  { id: '16', nombre: 'Gris', codigoHex: '#808080', imagen: 'https://via.placeholder.com/150/808080/FFFFFF?text=Gris' },
  { id: '17', nombre: 'Gris Claro', codigoHex: '#D3D3D3', imagen: 'https://via.placeholder.com/150/D3D3D3/000000?text=Gris+Claro' },
  { id: '18', nombre: 'Blanco', codigoHex: '#FFFFFF', imagen: 'https://via.placeholder.com/150/FFFFFF/000000?text=Blanco' },
  { id: '19', nombre: 'Beige', codigoHex: '#F5F5DC', imagen: 'https://via.placeholder.com/150/F5F5DC/000000?text=Beige' },
  { id: '20', nombre: 'Marrón', codigoHex: '#8B4513', imagen: 'https://via.placeholder.com/150/8B4513/FFFFFF?text=Marrón' },
  { id: '21', nombre: 'Turquesa', codigoHex: '#40E0D0', imagen: 'https://via.placeholder.com/150/40E0D0/000000?text=Turquesa' },
  { id: '22', nombre: 'Verde Lima', codigoHex: '#32CD32', imagen: 'https://via.placeholder.com/150/32CD32/000000?text=Lima' },
  { id: '23', nombre: 'Índigo', codigoHex: '#4B0082', imagen: 'https://via.placeholder.com/150/4B0082/FFFFFF?text=Índigo' },
  { id: '24', nombre: 'Coral', codigoHex: '#FF7F50', imagen: 'https://via.placeholder.com/150/FF7F50/000000?text=Coral' }
];

@Component({
  selector: 'app-admin-productos',
  standalone: true,
  imports: [FormsModule, CommonModule, DecimalPipe],
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
    colorido: false,
    colores: [],
  });
  ofertaFieldModifiedByUser = signal<'porcentaje' | 'precio' | null>(null);

  productCategories = signal<CategoriaProducto[]>([]);

  newCategoryName = '';
  showCategoryModal = signal(false);

  // Color management
  showColorManager = signal(false);
  editingColor = signal<Color | null>(null);
  colorManagerForm = signal<Color>({
    id: '',
    nombre: '',
    codigoHex: '#000000',
    imagen: ''
  });

  ngOnInit() {
    this.loadProductCategories();
    this.loadProducts();
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

  get categorias(): CategoriaProducto[] {
    return this.productCategories();
  }

  get categories(): string[] {
    return ['Nueva...', ...this.productCategories().map(c => c.nombre)];
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
      next: () => {
        this.loadProductCategories();
      }
    });
  }

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

  updateFormField(field: keyof ProductFormData, value: string | number | boolean) {
    this.formData.update((data) => ({ ...data, [field]: value }));
    // Reset offer field tracking when offer is disabled
    if (field === 'enOferta' && value === false) {
      this.ofertaFieldModifiedByUser.set(null);
    }
  }

  addColor() {
    const newColor: Color = {
      id: `color-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      nombre: '',
      codigoHex: '#000000',
      imagen: 'https://via.placeholder.com/150/000000/FFFFFF?text=Color+Personalizado'
    };
    this.formData.update(data => ({
      ...data,
      colores: [...data.colores, newColor]
    }));
  }

  addDefaultColor(color: Color) {
    const colorToAdd: Color = {
      id: `color-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      nombre: color.nombre,
      codigoHex: color.codigoHex,
      imagen: color.imagen
    };
    this.formData.update(data => ({
      ...data,
      colores: [...data.colores, colorToAdd]
    }));
  }

  removeColor(index: number) {
    this.formData.update(data => ({
      ...data,
      colores: data.colores.filter((_, i) => i !== index)
    }));
  }

  updateColor(index: number, field: keyof Color, value: string) {
    this.formData.update(data => {
      const updatedColores = [...data.colores];
      updatedColores[index] = { ...updatedColores[index], [field]: value };
      return { ...data, colores: updatedColores };
    });
  }

  showAddForm() {
    this.isAdding.set(true);
    this.editingProduct.set(null);
    this.ofertaFieldModifiedByUser.set(null);
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
      estado: 'disponible',
      enOferta: false,
      ofertaPorcentaje: 0,
      ofertaPrecio: 0,
      ratingRate: 0,
      ratingCount: 0,
      colorido: false,
      colores: [],
    });
    this.showModal.set(true);
  }



  showEditForm(product: Product) {
    this.editingProduct.set(product);
    this.isAdding.set(false);
    this.ofertaFieldModifiedByUser.set(null);
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
      estado: product.estado || 'disponible',
      enOferta: (product as any).enOferta || false,
      ofertaPorcentaje: (product as any).ofertaPorcentaje || 0,
      ofertaPrecio: (product as any).ofertaPrecio || 0,
      ratingRate: product.rating?.rate || 0,
      ratingCount: product.rating?.count || 0,
      colorido: product.colorido || false,
      colores: product.colores || [],
    });
    this.showModal.set(true);
  }

  cancelEdit() {
    this.showModal.set(false);
    this.isAdding.set(false);
    this.editingProduct.set(null);
  }

  confirmCancel() {
    if (confirm('Perderás toda la información sin guardar')) {
      this.cancelEdit();
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
        colorido: data.colorido,
        colores: data.colores,
      }).subscribe({
        next: (newProduct) => {
          this.products.update((p) => [...p, newProduct]);
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
        colorido: data.colorido,
        colores: data.colores,
      }).subscribe({
        next: (updated) => {
          this.products.update((products) =>
            products.map((p) => (p.id === updated.id ? updated : p))
          );
          if (data.enOferta && data.ofertaPrecio > 0) {
            console.log('Editando - Agregando oferta:', productId, data.ofertaPrecio);
            this.ofertasBackend.agregarOferta(productId, data.ofertaPrecio);
          } else {
            console.log('Editando - Eliminando oferta:', productId);
            this.ofertasBackend.eliminarOferta(productId);
          }
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

  getMaxAdditionalImages(): number {
    return this.formData().colorido ? 10 : 4;
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

  get defaultColors(): Color[] {
    return defaultColors;
  }

  // Color management methods
  openColorManager() {
    this.showColorManager.set(true);
  }

  closeColorManager() {
    this.showColorManager.set(false);
    this.editingColor.set(null);
    this.resetColorForm();
  }

  resetColorForm() {
    this.colorManagerForm.set({
      id: '',
      nombre: '',
      codigoHex: '#000000',
      imagen: ''
    });
  }

  editColor(color: Color) {
    this.editingColor.set(color);
    this.colorManagerForm.set({ ...color });
    this.showColorManager.set(true);
  }

  addNewColor() {
    this.editingColor.set(null);
    this.resetColorForm();
    this.colorManagerForm.update(form => ({
      ...form,
      id: `color-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }));
    this.showColorManager.set(true);
  }

  saveColor() {
    const formData = this.colorManagerForm();
    if (!formData.nombre.trim() || !formData.imagen.trim()) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    // In a real app, this would save to a database
    // For now, we'll just update the local array
    const colorIndex = defaultColors.findIndex(c => c.id === formData.id);
    if (colorIndex >= 0) {
      defaultColors[colorIndex] = { ...formData };
    } else {
      defaultColors.push({ ...formData });
    }

    this.closeColorManager();
  }

  deleteColor(color: Color) {
    if (confirm(`¿Está seguro de eliminar el color "${color.nombre}"?`)) {
      const index = defaultColors.findIndex(c => c.id === color.id);
      if (index >= 0) {
        defaultColors.splice(index, 1);
      }
    }
  }

  onColorImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede exceder 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.colorManagerForm.update(form => ({ ...form, imagen: base64 }));
    };
    reader.readAsDataURL(file);
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
    const price = this.formData().price || 0;
    const ofertaPrice = this.formData().ofertaPrecio || 0;
    const ofertaPorcentaje = this.formData().ofertaPorcentaje || 0;
    
    if (this.formData().enOferta) {
      if (ofertaPrice > 0 && ofertaPorcentaje === 0) {
        return ofertaPrice;
      } else if (ofertaPorcentaje > 0 && ofertaPrice === 0) {
        return price - (price * ofertaPorcentaje / 100);
      }
    }
    return 0;
  }

  onOfertaPorcentajeChange(value: any) {
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue >= 0) {
      // Limit to 100% max and round to 1 decimal place
      const limitedValue = Math.min(numValue, 100);
      const roundedValue = Math.round(limitedValue * 10) / 10;
      const price = this.formData().price || 0;
      const calculatedPrice = Math.round((price * (1 - roundedValue / 100)) * 100) / 100;
      this.formData.update(data => ({
        ...data,
        ofertaPorcentaje: roundedValue,
        ofertaPrecio: calculatedPrice
      }));
      this.ofertaFieldModifiedByUser.set('porcentaje');
    } else {
      this.formData.update(data => ({ ...data, ofertaPorcentaje: 0, ofertaPrecio: 0 }));
      this.ofertaFieldModifiedByUser.set(null);
    }
  }

  onOfertaPrecioChange(value: any) {
    const numValue = Number(value);
    const price = this.formData().price || 0;
    if (!isNaN(numValue) && numValue >= 0) {
      // Limit to not exceed the original price
      const limitedValue = Math.min(numValue, price);
      const precioRedondeado = Math.round(limitedValue * 100) / 100;
      const calculatedPorcentaje = price > 0 ? Math.round(((price - precioRedondeado) / price) * 1000) / 10 : 0;
      this.formData.update(data => ({
        ...data,
        ofertaPrecio: precioRedondeado,
        ofertaPorcentaje: calculatedPorcentaje
      }));
      this.ofertaFieldModifiedByUser.set('precio');
    } else {
      this.formData.update(data => ({ ...data, ofertaPrecio: 0, ofertaPorcentaje: 0 }));
      this.ofertaFieldModifiedByUser.set(null);
    }
  }
}
