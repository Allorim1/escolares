import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FavoritesService } from '../../shared/data-access/favorites.service';
import { CartStateService } from '../../shared/data-access/cart-state.service';
import { CurrencyService } from '../../shared/data-access/currency.service';
import { ProductsStateService } from '../../products/data-access/products-state.service';
import { NotificationService } from '../../shared/data-access/notification.service';

@Component({
  selector: 'app-favoritos',
  standalone: true,
  imports: [RouterLink, CommonModule],
  template: `
    <div class="favoritos-container">
      <h1>Mis Favoritos</h1>
      
      @if (favoritosProducts().length === 0) {
        <div class="empty-favoritos">
          <p>No tienes productos favoritos aún.</p>
          <a routerLink="/products" class="btn-primary">Ver productos</a>
        </div>
      } @else {
        <div class="favoritos-grid">
          @for (product of favoritosProducts(); track product.id) {
            <div class="favorito-card">
              <img [src]="product.image" [alt]="product.title" class="favorito-image" />
              <div class="favorito-info">
                <h3 class="favorito-title">{{ product.title }}</h3>
                <p class="favorito-price" [innerHTML]="formatPrice(product.price)"></p>
                <div class="favorito-actions">
                  <button class="btn-add-cart" (click)="addToCart(product)">Agregar al carrito</button>
                  <button class="btn-remove" (click)="toggleFavorito(product.id)" title="Quitar de favoritos">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .favoritos-container {
      max-width: 1200px;
      margin: 2rem auto;
      padding: 0 1rem;
    }
    h1 {
      font-size: 2rem;
      color: #333;
      margin-bottom: 1.5rem;
    }
    .empty-favoritos {
      text-align: center;
      padding: 3rem;
      background: #f8f9fa;
      border-radius: 12px;
    }
    .empty-favoritos p {
      color: #666;
      margin-bottom: 1rem;
    }
    .btn-primary {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: #1d63c1;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
    }
    .favoritos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1.5rem;
    }
    .favorito-card {
      background: white;
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      gap: 1rem;
    }
    .favorito-image {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 8px;
    }
    .favorito-info {
      flex: 1;
    }
    .favorito-title {
      font-size: 1rem;
      margin: 0 0 0.5rem;
      color: #333;
    }
    .favorito-price {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1d63c1;
      margin: 0 0 0.75rem;
    }
    .favorito-actions {
      display: flex;
      gap: 0.5rem;
    }
    .btn-add-cart {
      flex: 1;
      padding: 0.5rem;
      background: #1d63c1;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .btn-remove {
      padding: 0.5rem;
      background: #ff6b6b;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class Favoritos {
  private favoritesService = inject(FavoritesService);
  private cartState = inject(CartStateService).state;
  private currencyService = inject(CurrencyService);
  private notificationService = inject(NotificationService);
  private productsState = inject(ProductsStateService);

  favoritosProducts = this.favoritesService.getFavoritosProducts;

  formatPrice(priceInUsd: number): string {
    return this.currencyService.formatPrice(priceInUsd);
  }

  addToCart(product: any) {
    this.cartState.add({ product, quantity: 1 });
    this.notificationService.success(
      'Producto agregado',
      `${product.title} se ha agregado a tu carrito`
    );
  }

  toggleFavorito(productId: number | string) {
    this.favoritesService.toggleFavorito(productId);
  }
}