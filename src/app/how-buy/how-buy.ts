import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChildren,
  QueryList,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-how-buy',
  imports: [CommonModule],
  templateUrl: './how-buy.html',
  styleUrl: './how-buy.css',
})
export class HowBuy implements AfterViewInit {
  @ViewChildren('revealElement') revealElements!: QueryList<ElementRef>;

  steps = [
    {
      number: 1,
      title: 'Explora nuestros productos',
      description: 'Navega por nuestro catálogo y encuentra los productos que necesitas.',
    },
    {
      number: 2,
      title: 'Agrega al carrito',
      description: 'Selecciona los productos deseados y agrégalos a tu carrito de compras.',
    },
    {
      number: 3,
      title: 'Finaliza tu pedido',
      description: 'Revisa tu carrito y procede con el checkout de forma segura.',
    },
    {
      number: 4,
      title: 'Recibe tu pedido',
      description: 'Te entregamos en la comodidad de tu hogar o puedes retirar en tienda.',
    },
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

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
}
