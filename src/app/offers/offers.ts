import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OfertasService } from '../shared/data-access/ofertas.service';
import { ProductsService } from '../products/data-access/products.service';
import { Product } from '../shared/interfaces/product.interface';

@Component({
  selector: 'app-offers',
  imports: [RouterLink],
  templateUrl: './offers.html',
  styleUrl: './offers.css',
})
export class Offers implements OnInit {
  private ofertasService = inject(OfertasService);
  private productsService = inject(ProductsService);

  productsEnOferta = signal<Product[]>([]);

  ngOnInit() {
    this.productsService.getProducts().subscribe({
      next: (products) => {
        const ofertaIds = this.ofertasService.ofertas().map((o) => o.productId);
        this.productsEnOferta.set(products.filter((p) => ofertaIds.includes(p.id)));
      },
      error: (err) => console.error('Error loading products:', err),
    });
  }

  getOfertaPrice(productId: number): number {
    return this.ofertasService.getOfertaPrice(productId) || 0;
  }
}
