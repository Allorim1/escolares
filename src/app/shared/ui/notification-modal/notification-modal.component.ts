import { Component, HostListener, inject } from '@angular/core';

import { NotificationModalService } from './notification-modal.service';

@Component({
  selector: 'app-notification-modal',
  standalone: true,
  imports: [],
  template: `
    @if (notification.mostrar()) {
      @if (notification.modo() === 'confirm') {
        <div class="confirm-overlay" role="dialog" aria-modal="true">
          <div class="confirm-modal" [class.danger]="notification.tipo() === 'error'" [class.warning]="notification.tipo() === 'warning'" [class.info]="notification.tipo() === 'info'">
            <h4 class="confirm-title">{{ notification.titulo() }}</h4>
            <p class="confirm-message">{{ notification.mensaje() }}</p>
            @if (notification.detalles().length) {
              <ul class="confirm-details">@for (d of notification.detalles(); track d) { <li>{{ d }}</li> }</ul>
            }
            <div class="confirm-actions">
              <button type="button" class="ui-btn ui-btn-secondary" (click)="notification.cancelar()">{{ notification.cancelarTexto() }}</button>
              <button type="button" class="ui-btn" [class.ui-btn-danger]="notification.tipo() === 'error'" [class.ui-btn-primary]="notification.tipo() !== 'error'" (click)="notification.confirmar()">{{ notification.confirmarTexto() }}</button>
            </div>
          </div>
        </div>
      } @else {
        <div class="notification-overlay" role="status" aria-live="polite">
          <div class="notification-modal" [class.success]="notification.tipo() === 'success'" [class.error]="notification.tipo() === 'error'" [class.warning]="notification.tipo() === 'warning'" [class.info]="notification.tipo() === 'info'">
            <div class="notification-content">
              <span class="notification-icon" aria-hidden="true">@if (notification.tipo() === 'success') { &#10003; } @else if (notification.tipo() === 'error') { &#10007; } @else if (notification.tipo() === 'warning') { &#9888; } @else { &#8505; }</span>
              <div class="notification-text">
                <h4 class="notification-title">{{ notification.titulo() }}</h4>
                <p class="notification-message">{{ notification.mensaje() }}</p>
                @if (notification.detalles().length) { <ul class="notification-details">@for (d of notification.detalles(); track d) { <li>{{ d }}</li> }</ul> }
              </div>
              <button type="button" class="notification-close" (click)="notification.cerrar()" aria-label="Cerrar notificación">×</button>
            </div>
          </div>
        </div>
      }
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
      .notification-details, .confirm-details { margin: 8px 0 0; padding-left: 18px; font-size: 13px; }
      .notification-close { background: transparent; border: 0; color: inherit; font-size: 22px; line-height: 1; cursor: pointer; opacity: .85; padding: 0 0 0 4px; }
      .notification-close:hover { opacity: 1; }
      .confirm-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.45); display: flex; align-items: center; justify-content: center; z-index: 2100; padding: 1rem; }
      .confirm-modal { background: #fff; border-radius: 12px; box-shadow: var(--shadow-md); max-width: 520px; width: 100%; padding: 1.25rem; border-top: 4px solid #d97706; }
      .confirm-modal.danger { border-top-color: #dc2626; }
      .confirm-modal.info { border-top-color: #2563eb; }
      .confirm-title { margin: 0 0 .5rem; font-size: 1.1rem; color: var(--color-text); }
      .confirm-message { margin: 0; color: var(--color-text-muted); line-height: 1.5; }
      .confirm-actions { display: flex; justify-content: flex-end; gap: .5rem; margin-top: 1rem; }
    `,
  ],
})
export class NotificationModalComponent {
  notification = inject(NotificationModalService);

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.notification.mostrar()) this.notification.cerrar();
  }
}
