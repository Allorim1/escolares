import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../data-access/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class NotificationsComponent {
  constructor(public notificationService: NotificationService) {}

  get notifications(): Notification[] {
    return this.notificationService.notifications;
  }

  removeNotification(id: string): void {
    this.notificationService.remove(id);
  }
}
