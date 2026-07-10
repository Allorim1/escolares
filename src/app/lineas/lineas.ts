import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChildren,
  QueryList,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { LineasService } from '../shared/data-access/lineas.service';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-lineas',
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './lineas.html',
  styleUrl: './lineas.css',
})
export class Lineas implements AfterViewInit {
  lineasService = inject(LineasService);
  lineas = this.lineasService.lineas;
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  showGrid = signal(true);

  @ViewChildren('revealElement') revealElements!: QueryList<ElementRef>;

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.showGrid.set(this.route.firstChild === null);
      }
    });

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
