import { Inject, PLATFORM_ID, signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const THEME_KEY = 'escolares-theme';

export class ThemeService {
  private platformId: Object;
  darkMode = signal(false);

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.platformId = platformId;
    
    if (isPlatformBrowser(this.platformId)) {
      const savedTheme = localStorage.getItem(THEME_KEY);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
      
      this.darkMode.set(isDark);
      this.applyTheme(isDark);

      effect(() => {
        const isDark = this.darkMode();
        this.applyTheme(isDark);
        localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
      });
    }
  }

  toggle() {
    this.darkMode.update(v => !v);
  }

  private applyTheme(isDark: boolean) {
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
  }
}