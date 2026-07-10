import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChildren,
  QueryList,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LineasService } from './shared/data-access/lineas.service';

@Component({
  selector: 'app-lineas',
  imports: [CommonModule, RouterLink],
  templateUrl: './lineas.html',
  styleUrl: './lineas.css',
})
export class Lineas implements AfterViewInit {
  lineasService = inject(LineasService);
  lineas = this.lineasService.lineas;

  @ViewChildren('revealElement') revealElements!: QueryList<ElementRef>;

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      setTimeout(() => this.revealAll(), 100);
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
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
