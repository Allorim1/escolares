import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ProductsService } from '../../products/data-access/products.service';
import { Product } from '../../shared/interfaces/product.interface';

interface HomeBanner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  order: number;
  active: boolean;
}

interface HomeFeature {
  id: string;
  icon: string;
  title: string;
  description: string;
  order: number;
  active: boolean;
}

interface HomeSettings {
  banners: HomeBanner[];
  features: HomeFeature[];
  featuredProducts: string[];
  showNewsletter: boolean;
  showMarcas: boolean;
  showLineas: boolean;
}

@Component({
  selector: 'app-admin-inicio-gestion',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './inicio-gestion.html',
  styleUrl: './inicio-gestion.css',
})
export class AdminInicioGestion implements OnInit {
  private http = inject(HttpClient);
  private productsService = inject(ProductsService);

  loading = signal(true);
  saving = signal(false);
  activeTab = signal<'banners' | 'features' | 'featured' | 'settings'>('banners');
  
  settings = signal<HomeSettings>({
    banners: [],
    features: [],
    featuredProducts: [],
    showNewsletter: true,
    showMarcas: true,
    showLineas: true,
  });

  allProducts = signal<Product[]>([]);
  
  editingBanner = signal<HomeBanner | null>(null);
  showBannerModal = signal(false);
  
  editingFeature = signal<HomeFeature | null>(null);
  showFeatureModal = signal(false);

  icons = ['🚚', '🏪', '💳', '📞', '📦', '🏠', '⭐', '🎁', '🔥', '💰', '🛒', '📱'];

  ngOnInit() {
    this.loadSettings();
    this.loadProducts();
  }

  loadSettings() {
    this.http.get<HomeSettings>('/api/home').subscribe({
      next: (data) => {
        this.settings.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadProducts() {
    this.productsService.getProducts().subscribe({
      next: (products) => this.allProducts.set(products),
      error: (err) => console.error('Error loading products:', err),
    });
  }

  saveSettings() {
    this.saving.set(true);
    this.http.put<HomeSettings>('/api/home', this.settings()).subscribe({
      next: (data) => {
        this.settings.set(data);
        this.saving.set(false);
        alert('Configuración guardada');
      },
      error: () => {
        this.saving.set(false);
        alert('Error al guardar');
      },
    });
  }

  setTab(tab: 'banners' | 'features' | 'featured' | 'settings') {
    this.activeTab.set(tab);
  }

  openBannerModal(banner?: HomeBanner) {
    if (banner) {
      this.editingBanner.set({ ...banner });
    } else {
      this.editingBanner.set({
        id: '',
        title: '',
        subtitle: '',
        image: '',
        link: '',
        order: this.settings().banners.length + 1,
        active: true,
      });
    }
    this.showBannerModal.set(true);
  }

  closeBannerModal() {
    this.showBannerModal.set(false);
    this.editingBanner.set(null);
  }

  saveBanner() {
    const banner = this.editingBanner();
    if (!banner) return;

    if (banner.id) {
      this.http.put<HomeBanner>(`/api/home/banners/${banner.id}`, banner).subscribe({
        next: () => {
          this.loadSettings();
          this.closeBannerModal();
        },
        error: () => alert('Error al guardar'),
      });
    } else {
      this.http.post<HomeBanner>('/api/home/banners', banner).subscribe({
        next: () => {
          this.loadSettings();
          this.closeBannerModal();
        },
        error: () => alert('Error al guardar'),
      });
    }
  }

  deleteBanner(id: string) {
    if (confirm('¿Eliminar este banner?')) {
      this.http.delete(`/api/home/banners/${id}`).subscribe({
        next: () => this.loadSettings(),
        error: () => alert('Error al eliminar'),
      });
    }
  }

  openFeatureModal(feature?: HomeFeature) {
    if (feature) {
      this.editingFeature.set({ ...feature });
    } else {
      this.editingFeature.set({
        id: '',
        icon: '📦',
        title: '',
        description: '',
        order: this.settings().features.length + 1,
        active: true,
      });
    }
    this.showFeatureModal.set(true);
  }

  closeFeatureModal() {
    this.showFeatureModal.set(false);
    this.editingFeature.set(null);
  }

  saveFeature() {
    const feature = this.editingFeature();
    if (!feature) return;

    if (feature.id) {
      this.http.put<HomeFeature>(`/api/home/features/${feature.id}`, feature).subscribe({
        next: () => {
          this.loadSettings();
          this.closeFeatureModal();
        },
        error: () => alert('Error al guardar'),
      });
    } else {
      this.http.post<HomeFeature>('/api/home/features', feature).subscribe({
        next: () => {
          this.loadSettings();
          this.closeFeatureModal();
        },
        error: () => alert('Error al guardar'),
      });
    }
  }

  deleteFeature(id: string) {
    if (confirm('¿Eliminar esta característica?')) {
      this.http.delete(`/api/home/features/${id}`).subscribe({
        next: () => this.loadSettings(),
        error: () => alert('Error al eliminar'),
      });
    }
  }

  toggleFeaturedProductById(productId: string | number) {
    const id = String(productId);
    const current = this.settings().featuredProducts;
    let updated: string[];
    
    if (current.includes(id)) {
      updated = current.filter(pid => pid !== id);
    } else {
      updated = [...current, id];
    }
    
    this.settings.update(s => ({ ...s, featuredProducts: updated }));
  }

  toggleFeaturedProduct(product: Product) {
    this.toggleFeaturedProductById(product.id);
  }

  isProductFeaturedById(productId: string | number): boolean {
    return this.settings().featuredProducts.includes(String(productId));
  }

  isProductFeatured(product: Product): boolean {
    return this.isProductFeaturedById(product.id);
  }

  onBannerFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      alert('Selecciona un archivo de imagen');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.editingBanner.update(b => b ? { ...b, image: base64 } : b);
    };
    reader.readAsDataURL(file);
  }
}
