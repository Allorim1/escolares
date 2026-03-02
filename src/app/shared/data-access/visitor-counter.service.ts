import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class VisitorCounterService {
  private readonly STORAGE_KEY = 'visitor_count';
  private readonly MONTH_KEY = 'visitor_month';

  totalVisitors = signal(0);
  currentMonthVisitors = signal(0);

  constructor() {
    this.trackVisit();
  }

  private trackVisit() {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;

    const storedMonth = localStorage.getItem(this.MONTH_KEY);
    const totalCount = parseInt(localStorage.getItem(this.STORAGE_KEY) || '0', 10);

    if (storedMonth !== currentMonth) {
      localStorage.setItem(this.MONTH_KEY, currentMonth);
      localStorage.setItem(this.STORAGE_KEY, (totalCount + 1).toString());
      this.totalVisitors.set(totalCount + 1);
      this.currentMonthVisitors.set(1);
    } else {
      const monthCount = parseInt(localStorage.getItem(`visitor_count_${currentMonth}`) || '0', 10);
      localStorage.setItem(this.STORAGE_KEY, (totalCount + 1).toString());
      localStorage.setItem(`visitor_count_${currentMonth}`, (monthCount + 1).toString());
      this.totalVisitors.set(totalCount + 1);
      this.currentMonthVisitors.set(monthCount + 1);
    }
  }
}
