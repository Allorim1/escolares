import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="ui-empty" role="status">
      @if (icon) { <div class="ui-empty-icon" aria-hidden="true">{{ icon }}</div> }
      <div class="ui-empty-title">{{ title }}</div>
      @if (description) { <p class="ui-empty-desc">{{ description }}</p> }
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .ui-empty-icon { font-size: 1.5rem; margin-bottom: .5rem; }
    .ui-empty-desc { margin: 0; font-size: var(--text-sm); color: var(--color-text-muted); }
    :host { display: block; }
  `]
})
export class EmptyStateComponent {
  @Input() title = 'No hay datos';
  @Input() description = '';
  @Input() icon = '';
}
