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

  showLoginModal = signal(false);
  showRegisterModal = signal(false);
  loginUsername = '';
  loginPassword = '';
  registerUsername = '';
  registerEmail = '';
  registerPassword = '';
  registerConfirmPassword = '';
  registerError = signal('');

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

  openLogin() {
    this.showLoginModal.set(true);
    this.showRegisterModal.set(false);
  }

  openRegister() {
    this.showRegisterModal.set(true);
    this.showLoginModal.set(false);
  }

  closeModals() {
    this.showLoginModal.set(false);
    this.showRegisterModal.set(false);
    this.loginUsername = '';
    this.loginPassword = '';
    this.registerUsername = '';
    this.registerEmail = '';
    this.registerPassword = '';
    this.registerConfirmPassword = '';
    this.registerError.set('');
  }

  doLogin() {
    if (this.loginUsername && this.loginPassword) {
      this.authService.login(this.loginUsername, this.loginPassword);
      const checkLogin = setInterval(() => {
        if (this.authService.isLoggedIn()) {
          this.closeModals();
          clearInterval(checkLogin);
        }
        if (!this.authService.loginLoading() && !this.authService.isLoggedIn()) {
          clearInterval(checkLogin);
        }
      }, 100);
    }
  }

  doRegister() {
    if (!this.registerUsername || !this.registerEmail || !this.registerPassword) {
      this.registerError.set('Todos los campos son requeridos');
      return;
    }
    if (this.registerPassword !== this.registerConfirmPassword) {
      this.registerError.set('Las contraseñas no coinciden');
      return;
    }
    this.authService.register(this.registerUsername, this.registerEmail, this.registerPassword);
    const checkRegister = setInterval(() => {
      if (this.authService.registerSuccess()) {
        this.closeModals();
        this.openLogin();
        clearInterval(checkRegister);
      }
    }, 100);
  }
}
