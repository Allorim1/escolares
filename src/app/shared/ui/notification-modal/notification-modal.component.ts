import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationModalService } from './notification-modal.service';

@Component({
  selector: 'app-notification-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (notification.mostrar()) {
      <div class="notification-overlay">
        <div class="notification-modal" [class.success]="notification.tipo() === 'success'" 
             [class.error]="notification.tipo() === 'error'"
             [class.warning]="notification.tipo() === 'warning'"
             [class.info]="notification.tipo() === 'info'">
          <div class="notification-content">
            <span class="notification-icon">
              @if (notification.tipo() === 'success') {
                &#10003;
              } @else if (notification.tipo() === 'error') {
                &#10007;
              } @else if (notification.tipo() === 'warning') {
                &#9888;
              } @else {
                &#8505;
              }
            </span>
            <div class="notification-text">
              <h4 class="notification-title">{{ notification.titulo() }}</h4>
              <p class="notification-message">{{ notification.mensaje() }}</p>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .notification-overlay {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2000;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .notification-modal {
      min-width: 280px;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .notification-modal.success {
      background: #10b981;
      color: white;
    }

    .notification-modal.error {
      background: #ef4444;
      color: white;
    }

    .notification-modal.warning {
      background: #f59e0b;
      color: white;
    }

    .notification-modal.info {
      background: #3b82f6;
      color: white;
    }

    .notification-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .notification-icon {
      font-size: 24px;
      line-height: 1;
    }

    .notification-text {
      flex: 1;
    }

    .notification-title {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
    }

    .notification-message {
      margin: 0;
      font-size: 14px;
      opacity: 0.95;
    }
  `]
})
export class NotificationModalComponent {
  notification = inject(NotificationModalService);
}