import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ProductItemCart } from '../interfaces/product.interface';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private get isBrowser(): boolean {
    // in Node the global may be polyfilled but not fully functional;
    // ensure we actually have methods we intend to call
    return (
      typeof localStorage !== 'undefined' &&
      localStorage !== null &&
      typeof localStorage.getItem === 'function' &&
      typeof localStorage.setItem === 'function'
    );
  }

  loadProducts(): Observable<ProductItemCart[]> {
    if (!this.isBrowser) {
      // server rendering; nothing stored yet
      return of([]);
    }

    try {
      const rawProducts = localStorage.getItem('products');
      if (!rawProducts) {
        return of([]);
      }
      const parsed = JSON.parse(rawProducts);
      // Ensure we always return an array
      return of(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      console.error('Error parsing cart products from localStorage:', e);
      return of([]);
    }
  }

  saveProducts(products: ProductItemCart[]): void {
    if (!this.isBrowser) {
      // avoid errors during SSR
      return;
    }

    localStorage.setItem('products', JSON.stringify(products));
  }
}