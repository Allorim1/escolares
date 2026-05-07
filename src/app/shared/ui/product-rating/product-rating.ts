import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-product-rating',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-rating.html',
  styleUrl: './product-rating.css',
})
export class ProductRating {
  @Input() currentRate = 0;
  @Input() userRate = 0;
  @Input() allowRate = false;
  @Input() count = 0;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  @Output() rateSubmit = new EventEmitter<number>();

  hoverIndex = signal(-1);
  isSubmitting = signal(false);

  get isInteractive(): boolean {
    return this.allowRate && this.userRate === 0;
  }

  get stars(): { value: number; filled: boolean; hovered: boolean }[] {
    const stars = [];
    const displayRate = this.hoverIndex() >= 0 ? this.hoverIndex() + 1 : this.currentRate;
    
    for (let i = 0; i < 5; i++) {
      stars.push({
        value: i + 1,
        filled: i < Math.floor(displayRate),
        hovered: this.hoverIndex() >= 0 && i <= this.hoverIndex()
      });
    }
    return stars;
  }

  onMouseEnter(index: number) {
    if (this.isInteractive) {
      this.hoverIndex.set(index);
    }
  }

  onMouseLeave() {
    if (this.isInteractive) {
      this.hoverIndex.set(-1);
    }
  }

  onClick(index: number) {
    if (this.isInteractive) {
      this.isSubmitting.set(true);
      this.rateSubmit.emit(index + 1);
      setTimeout(() => this.isSubmitting.set(false), 500);
    }
  }

  get sizeClass(): string {
    return `star-${this.size}`;
  }
}