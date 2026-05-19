import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { ProductsStateService } from '../../products/data-access/products-state.service';
import { Product } from '../interfaces/product.interface';

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private authService = inject(AuthService);
  private productsState = inject(ProductsStateService);

  favoritos = signal<(number | string)[]>([]);

  constructor() {
    // Load favorites from localStorage
    const saved = localStorage.getItem('escolares-favoritos');
    if (saved) {
      this.favoritos.set(JSON.parse(saved));
    }

    // Listen to auth changes to sync with user.favoritos
    effect(() => {
      const user = this.authService.user();
      if (user?.favoritos && user.favoritos.length > 0) {
        this.favoritos.set(user.favoritos);
        this.saveToStorage();
      }
    });
  }

  private saveToStorage() {
    localStorage.setItem('escolares-favoritos', JSON.stringify(this.favoritos()));
  }

  toggleFavorito(productId: number | string): void {
    const current = this.favoritos();
    const exists = current.includes(productId);
    
    if (exists) {
      this.favoritos.set(current.filter(id => id !== productId));
    } else {
      this.favoritos.set([...current, productId]);
    }
    
    this.saveToStorage();
    
    // Update user if logged in
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