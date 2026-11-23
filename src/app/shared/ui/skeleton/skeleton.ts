import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `<div class="ui-skeleton" [style.width]="width" [style.height]="height" [style.borderRadius]="radius" aria-hidden="true"></div>`,
  styles: [`:host { display: block; }`]
})
export class SkeletonComponent {
  @Input() width = '100%';
  @Input() height = '1rem';
  @Input() radius = '6px';
}
