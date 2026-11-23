import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="ui-badge" [ngClass]="badgeClass">{{ label }}</span>`,
})
export class StatusBadgeComponent {
  @Input() label = '';
  @Input() tone: 'success'|'warning'|'danger'|'info'|'neutral' = 'neutral';
  get badgeClass() { return `ui-badge-${this.tone}`; }
}
