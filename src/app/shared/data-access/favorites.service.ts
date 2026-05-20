import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { ProductsStateService } from '../../products/data-access/products-state.service';

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private authService = inject(AuthService);
  private productsState = inject(ProductsStateService);
  private lastToggleTime: Map<string | number, number> = new Map<string | number, number>();
  private readonly DEBOUNCE_MS = 300;

  favoritos = signal<(number | string)[]>([]);
  private loadedFromStorage = false;

  constructor() {
    const saved = localStorage.getItem('escolares-favoritos');
    if (saved) {
      this.favoritos.set(JSON.parse(saved));
      this.loadedFromStorage = true;
    }

    effect(() => {
      const user = this.authService.user();
      if (user?.favoritos && user.favoritos.length > 0 && !this.loadedFromStorage) {
        const current = this.favoritos();
        if (JSON.stringify(current) !== JSON.stringify(user.favoritos)) {
          this.favoritos.set(user.favoritos);
          this.saveToStorage();
        }
      }
    });
  }

  private saveToStorage() {
    localStorage.setItem('escolares-favoritos', JSON.stringify(this.favoritos()));
  }

  toggleFavorito(productId: number | string): void {
    const now = Date.now();
    const lastToggle = this.lastToggleTime.get(productId) || 0;
    
    if (now - lastToggle < this.DEBOUNCE_MS) {
      return;
    }
    
    this.lastToggleTime.set(productId, now);
    
    const current = this.favoritos();
    const exists = current.includes(productId);
    
    if (exists) {
      this.favoritos.set(current.filter(id => id !== productId));
    } else {
      this.favoritos.set([...current, productId]);
    }
    
    this.saveToStorage();
    
    const user = this.authService.user();
    if (user) {
      this.authService.updateProfile({ favoritos: this.favoritos() });
    }
  }

  isFavorito(productId: number | string): boolean {
    return this.favoritos().includes(productId);
  }

  getFavoritos(): (number | string)[] {
    return this.favoritos();
  }

  getFavoritosProducts = computed(() => {
    const allProducts = this.productsState.allProducts();
    return allProducts.filter(p => this.favoritos().includes(p.id));
  });
}