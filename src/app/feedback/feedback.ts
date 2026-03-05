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
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feedback.html',
  styleUrl: './feedback.css',
})
export class Feedback implements AfterViewInit {
  @ViewChildren('revealElement') revealElements!: QueryList<ElementRef>;

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
