import {
  Component,
  inject,
  AfterViewInit,
  effect,
  ElementRef,
  ViewChildren,
  QueryList,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MarcasService } from '../shared/data-access/marcas.service';

@Component({
  selector: 'app-marcas',
  imports: [RouterLink, CommonModule],
  templateUrl: './marcas.html',
  styleUrl: './marcas.css',
})
export class Marcas implements AfterViewInit {
  marcasService = inject(MarcasService);
  marcas = this.marcasService.marcas;

  @ViewChildren('revealElement') revealElements!: QueryList<ElementRef>;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const marcasVal = this.marcas();
        if (marcasVal && marcasVal.length > 0) {
          setTimeout(() => this.revealAll(), 100);
        }
      });
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
