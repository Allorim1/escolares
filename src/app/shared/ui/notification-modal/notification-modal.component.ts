import { Component, inject } from '@angular/core';

import { NotificationModalService } from './notification-modal.service';

@Component({
  selector: 'app-notification-modal',
  standalone: true,
  imports: [],
  template: `
    @if (notification.mostrar()) {
      <div class="notification-overlay" role="status" aria-live="polite">
        <div
          class="notification-modal"
          [class.success]="notification.tipo() === 'success'"
          [class.error]="notification.tipo() === 'error'"
          [class.warning]="notification.tipo() === 'warning'"
          [class.info]="notification.tipo() === 'info'"
        >
          <div class="notification-content">
            <span class="notification-icon" aria-hidden="true">
              @if (notification.tipo() === 'success') { &#10003; }
              @else if (notification.tipo() === 'error') { &#10007; }
              @else if (notification.tipo() === 'warning') { &#9888; }
              @else { &#8505; }
            </span>
            <div class="notification-text">
              <h4 class="notification-title">{{ notification.titulo() }}</h4>
              <p class="notification-message">{{ notification.mensaje() }}</p>
              @if (notification.detalles().length) {
                <ul class="notification-details">
                  @for (d of notification.detalles(); track d) {
                    <li>{{ d }}</li>
                  }
                </ul>
              }
            </div>
            <button type="button" class="notification-close" (click)="notification.cerrar()" aria-label="Cerrar notificación">×</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .notification-overlay { position: fixed; top: 20px; right: 20px; z-index: 2000; animation: slideIn .25s ease-out; max-width: min(420px, calc(100vw - 2rem)); }
      @keyframes slideIn { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .notification-modal { padding: 14px 16px; border-radius: 10px; box-shadow: var(--shadow-md); color: #fff; }
      .notification-modal.success { background: #15803d; }
      .notification-modal.error { background: #dc2626; }
      .notification-modal.warning { background: #b45309; }
      .notification-modal.info { background: #1d4ed8; }
      .notification-content { display: flex; align-items: flex-start; gap: 12px; }
      .notification-icon { font-size: 20px; line-height: 1; margin-top: 2px; }
      .notification-text { flex: 1; min-width: 0; }
      .notification-title { margin: 0 0 4px; font-size: 15px; font-weight: 700; }
      .notification-message { margin: 0; font-size: 14px; line-height: 1.4; opacity: .96; }
      .notification-details { margin: 8px 0 0; padding-left: 18px; font-size: 13px; opacity: .95; }
      .notification-close { background: transparent; border: 0; color: inherit; font-size: 22px; line-height: 1; cursor: pointer; opacity: .85; padding: 0 0 0 4px; }
      .notification-close:hover { opacity: 1; }
    `,
  ],
})
export class NotificationModalComponent {
  notification = inject(NotificationModalService);
}
