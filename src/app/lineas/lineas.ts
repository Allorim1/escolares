import {
  Component,
  AfterViewInit,
  effect,
  ElementRef,
  ViewChildren,
  QueryList,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

interface Linea {
  image: string;
  name: string;
}

@Component({
  selector: 'app-lineas',
  imports: [CommonModule],
  templateUrl: './lineas.html',
  styleUrl: './lineas.css',
})
export class Lineas implements AfterViewInit {
  @ViewChildren('revealElement') revealElements!: QueryList<ElementRef>;

  lineas: Linea[] = [
    { image: '/lineas/BOLSOS-Y-CARTUCHERA.png', name: 'Bolsos y Cartuchera' },
    { image: '/lineas/manchas-LINEA-DE-PAPELERIA.png', name: 'Línea de Papelería' },
    { image: '/lineas/manchas-LIBEA-DE-GEOMETRIA.png', name: 'Línea de Geometría' },
    { image: '/lineas/MANCHAS-PARA-LINEA-DE-MANUALIDADES.png', name: 'Línea de Manualidades' },
    { image: '/lineas/MANCHA-PARA-LINEA-ESCOLAR.png', name: 'Línea Escolar' },
    { image: '/lineas/MANCHA-DE-HIGIENE-PERSONAL.png', name: 'Higiene Personal' },
    { image: '/lineas/MANCHA-LINEA-DE-PFICINA.png', name: 'Línea de Oficina' },
    { image: '/lineas/MANCHA-LINEA-DE-ESCRITURA-V1.png', name: 'Línea de Escritura' },
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.revealAll(), 100);
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.revealAll(), 100);
    }
  }

  private revealAll() {
    if (!this.revealElements?.length) return;
    this.revealElements.forEach((el) => {
      if (el?.nativeElement) {
        el.nativeElement.classList.add('reveal-active');
      }
    });
  }
}
