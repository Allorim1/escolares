import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
  selector: '[enterFocusNext]',
  standalone: true
})
export class EnterFocusNextDirective {
  constructor(private el: ElementRef) {}

  @HostListener('keydown.enter', ['$event'])
  onEnterKey(event: any) {
    const container = this.getContainer();
    if (!container) return;
    event.preventDefault();

    const focusableElements = this.getFocusableElements(container);
    const currentIndex = focusableElements.indexOf(this.el.nativeElement);

    if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
      const nextElement = focusableElements[currentIndex + 1];
      nextElement.focus();
    }
  }

  private getContainer(): HTMLElement | null {
    const selectors = ['.modal-content', '.add-form', '.modal', '.modal-overlay'];
    for (const selector of selectors) {
      const container = this.el.nativeElement.closest(selector);
      if (container) return container;
    }
    return null;
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selectors = [
      'input:not([disabled]):not([readonly])',
      'select:not([disabled])',
      'textarea:not([disabled]):not([readonly])',
      'button:not([disabled])'
    ];

    const elements: HTMLElement[] = [];
    selectors.forEach(selector => {
      const found = container.querySelectorAll(selector);
      found.forEach(el => {
        const htmlEl = el as HTMLElement;
        const rect = htmlEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          elements.push(htmlEl);
        }
      });
    });

    return elements;
  }
}