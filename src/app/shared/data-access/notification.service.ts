import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  icon?: string;
  imageUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();
  private notificationId = 0;

  constructor() {}

  get notifications(): Notification[] {
    return this.notificationsSubject.value;
  }

  show(notification: Omit<Notification, 'id'>): string {
    const id = `notif_${++this.notificationId}_${Date.now()}`;
    const fullNotification: Notification = { ...notification, id };
    const current = this.notificationsSubject.value;
    this.notificationsSubject.next([...current, fullNotification]);
    setTimeout(() => this.remove(id), notification.duration || 5000);
    return id;
  }

  success(title: string, message: string, duration?: number): string {
    return this.show({ type: 'success', title, message, duration, icon: '✅' });
  }

  info(title: string, message: string, duration?: number): string {
    return this.show({ type: 'info', title, message, duration, icon: 'ℹ️' });
  }

  warning(title: string, message: string, duration?: number): string {
    return this.show({ type: 'warning', title, message, duration, icon: '⚠️' });
  }

  error(title: string, message: string, duration?: number): string {
    return this.show({ type: 'error', title, message, duration, icon: '❌' });
  }

  remove(id: string): void {
    const current = this.notificationsSubject.value;
    this.notificationsSubject.next(current.filter((n) => n.id !== id));
  }

  clear(): void {
    this.notificationsSubject.next([]);
  }

  // Método para mostrar notificación con imagen
  showWithImage(notification: Omit<Notification, 'id'>): string {
    return this.show(notification);
  }
}
