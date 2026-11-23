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
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { LineasService } from '../shared/data-access/lineas.service';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-lineas',
  imports: [RouterLink, RouterOutlet],
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
      this.revealElements.changes.subscribe(() => {
        setTimeout(() => this.revealAll(), 100);
      });
      setTimeout(() => this.revealAll(), 100);
    }
  }

  private revealAll() {
    setTimeout(() => {
      const els = this.revealElements?.toArray() ?? [];
      if (els.length === 0) {
        document.querySelectorAll('.reveal-init:not(.reveal-active)').forEach((el) => {
          el.classList.add('reveal-active');
        });
        return;
      }
      els.forEach((el) => {
        if (el?.nativeElement) {
          el.nativeElement.classList.add('reveal-active');
        }
      });
    }, 50);
  }
}
