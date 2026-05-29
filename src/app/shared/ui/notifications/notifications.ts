import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, Notification } from '../../data-access/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class NotificationsComponent {
  constructor(
    public notificationService: NotificationService,
    private router: Router
  ) {}

  get notifications(): Notification[] {
    return this.notificationService.notifications;
  }

  removeNotification(id: string): void {
    this.notificationService.remove(id);
  }

  navigateToNews(url: string): void {
    this.router.navigateByUrl(url);
  }
}
