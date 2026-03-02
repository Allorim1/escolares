import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../data-access/auth.service';
import { ProductsService } from '../../../products/data-access/products.service';
import { Product } from '../../../shared/interfaces/product.interface';

@Component({
  selector: 'app-header',
  imports: [RouterLink, FormsModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css'],
})
export class Header {
  authService = inject(AuthService);
  private router = inject(Router);
  private productsService = inject(ProductsService);

  searchQuery = '';
  suggestions = signal<Product[]>([]);
  showDropdown = signal(false);
  allProducts: Product[] = [];

  constructor() {
    this.productsService.getProducts().subscribe((products) => {
      this.allProducts = products;
    });
  }

  onSearchInput() {
    const query = this.searchQuery.toLowerCase().trim();
    if (query.length > 0) {
      this.suggestions.set(
        this.allProducts.filter((p) => p.title.toLowerCase().includes(query)).slice(0, 5),
      );
      this.showDropdown.set(true);
    } else {
      this.showDropdown.set(false);
    }
  }

  selectProduct(product: Product) {
    this.router.navigate(['/products'], {
      queryParams: { search: product.title },
    });
    this.showDropdown.set(false);
    this.searchQuery = '';
  }

  search() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/products'], {
        queryParams: { search: this.searchQuery.trim() },
      });
      this.showDropdown.set(false);
    }
  }

  hideDropdown() {
    setTimeout(() => {
      this.showDropdown.set(false);
    }, 200);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
