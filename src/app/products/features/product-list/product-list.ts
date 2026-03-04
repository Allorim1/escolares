import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductsStateService } from '../../data-access/products-state.service';
import { LoadingComponent } from '../../../shared/ui/loading/loading';

@Component({
  selector: 'app-product-list',
  imports: [RouterLink, FormsModule, LoadingComponent],
  templateUrl: './product-list.html',
  styles: `
    .filter-section {
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: 12px;
      margin-bottom: 2rem;
    }
    .filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: flex-end;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .filter-group label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #555;
    }
    .filter-group input,
    .filter-group select {
      padding: 0.5rem 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      min-width: 150px;
    }
    .filter-group input:focus,
    .filter-group select:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
    }
    .clear-filters-btn {
      padding: 0.5rem 1rem;
      background: #1d63c1;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background 0.2s;
    }
    .clear-filters-btn:hover {
      background: #1d63c1;
    }
    .page-indicator {
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      background-color: #1976d2;
      color: #fff;
    }
    .pagination {
      align-items: center;
    }
    .pagination .btn-secondary {
      background: #f0f0f0;
      border: 1px solid #ccc;
      transition: background 0.2s;
    }
    .pagination .btn-secondary:hover:not(:disabled) {
      background: #e0e0e0;
    }
    .results-count {
      color: #666;
      font-size: 0.875rem;
      margin-top: 1rem;
    }
  `,
  providers: [ProductsStateService],
})
export default class ProductList implements OnInit {
  productsState = inject(ProductsStateService);
  private route = inject(ActivatedRoute);

  // filter signals
  filterText = signal('');
  filterCategory = signal('');
  filterBrand = signal('');
  filterPriceMin = signal<number | null>(null);
  filterPriceMax = signal<number | null>(null);
  currentBrand = signal('');

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const brand = params.get('brand');
      if (brand) {
        this.filterBrand.set(brand);
        this.currentBrand.set(brand);
      } else {
        this.filterBrand.set('');
        this.currentBrand.set('');
      }
    });

    this.route.queryParamMap.subscribe((queryParams) => {
      const search = queryParams.get('search');
      if (search) {
        this.filterText.set(search);
      }
    });
  }

  // compute unique categories from products
  categories = computed(() => {
    const products = this.productsState.state.products();
    const allProducts = this.productsState.allProducts();
    const cats = new Set<string>();
    allProducts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  });

  // compute price range
  priceRange = computed(() => {
    const allProducts = this.productsState.allProducts();
    if (allProducts.length === 0) return { min: 0, max: 1000 };
    const prices = allProducts.map((p) => p.price);
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  });

  filteredProducts = computed(() => {
    const list = this.productsState.allProducts();
    const text = this.filterText().toLowerCase();
    const category = this.filterCategory();
    const brand = this.filterBrand();
    const minPrice = this.filterPriceMin();
    const maxPrice = this.filterPriceMax();

    return list.filter((p) => {
      // text filter
      if (
        text &&
        !p.title.toLowerCase().includes(text) &&
        !p.description.toLowerCase().includes(text)
      ) {
        return false;
      }
      // category filter
      if (category && p.category !== category) {
        return false;
      }
      // brand filter
      if (brand && p.marca !== brand) {
        return false;
      }
      // price range filter
      if (minPrice !== null && p.price < minPrice) {
        return false;
      }
      if (maxPrice !== null && p.price > maxPrice) {
        return false;
      }
      return true;
    });
  });

  // paginated filtered products
  paginatedProducts = computed(() => {
    const page = this.productsState.state.page();
    const pageSize = 8;
    const start = (page - 1) * pageSize;
    return this.filteredProducts().slice(start, start + pageSize);
  });

  clearFilters() {
    this.filterText.set('');
    this.filterCategory.set('');
    this.filterBrand.set('');
    this.filterPriceMin.set(null);
    this.filterPriceMax.set(null);
    this.productsState.changePage$.next(1);
  }

  changePage(delta: number) {
    const current = this.productsState.state.page();
    const next = Math.max(1, current + delta);
    this.productsState.changePage$.next(next);

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
