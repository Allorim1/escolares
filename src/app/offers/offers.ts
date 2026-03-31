import {
  Component,
  inject,
  signal,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChildren,
  QueryList,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { OfertasService } from '../shared/data-access/ofertas.service';
import { ProductsService } from '../products/data-access/products.service';
import { Product } from '../shared/interfaces/product.interface';
import { LoadingComponent } from '../shared/ui/loading/loading';
import { CurrencyService } from '../shared/data-access/currency.service';

@Component({
  selector: 'app-offers',
  imports: [RouterLink, LoadingComponent, CommonModule],
  templateUrl: './offers.html',
  styleUrl: './offers.css',
})
export class Offers implements OnInit, AfterViewInit {
  private ofertasService = inject(OfertasService);
  private productsService = inject(ProductsService);
  currencyService = inject(CurrencyService);

  // Format price based on current currency display
  formatPrice(priceInUsd: number): string {
    return this.currencyService.formatPrice(priceInUsd);
  }

  @ViewChildren('revealElement') revealElements!: QueryList<ElementRef>;

  productsEnOferta = signal<Product[]>([]);
  loading = signal(true);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    this.productsService.getProducts().subscribe({
      next: (products) => {
        const ofertaIds = this.ofertasService.ofertas().map((o) => o.productId);
        this.productsEnOferta.set(products.filter((p) => ofertaIds.includes(p.id as any)));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading products:', err);
        this.loading.set(false);
      },
    });
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.setupIntersectionObserver(), 100);
      setTimeout(() => this.setupIntersectionObserver(), 500);
      setTimeout(() => this.setupIntersectionObserver(), 1000);
    }
  }

  private setupIntersectionObserver() {
    if (!this.revealElements?.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-active');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -10px 0px' },
    );

    this.revealElements.forEach((el: ElementRef) => {
      if (el?.nativeElement) {
        observer.observe(el.nativeElement);
      }
    });
  }

  getOfertaPriceForProduct(product: Product): number {
    return this.ofertasService.getOfertaPrice(product.id as any) || 0;
  }

  getOfertaPrice(productId: number | string): number {
    return this.ofertasService.getOfertaPrice(productId) || 0;
  }
}
