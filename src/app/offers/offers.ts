import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OfertasService } from '../shared/data-access/ofertas.service';
import { ProductsService } from '../products/data-access/products.service';
import { Product } from '../shared/interfaces/product.interface';
import { LoadingComponent } from '../shared/ui/loading/loading';

@Component({
  selector: 'app-offers',
  imports: [RouterLink, LoadingComponent],
  templateUrl: './offers.html',
  styleUrl: './offers.css',
})
export class Offers implements OnInit {
  private ofertasService = inject(OfertasService);
  private productsService = inject(ProductsService);

  productsEnOferta = signal<Product[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.productsService.getProducts().subscribe({
      next: (products) => {
        const ofertaIds = this.ofertasService.ofertas().map((o) => o.productId);
        this.productsEnOferta.set(products.filter((p) => ofertaIds.includes(p.id)));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading products:', err);
        this.loading.set(false);
      },
    });
  }

  getOfertaPrice(productId: number): number {
    return this.ofertasService.getOfertaPrice(productId) || 0;
  }
}
