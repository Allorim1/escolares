import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { withCredentialsInterceptor } from './shared/interceptors/with-credentials.interceptor';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

export function initTheme() {
  return () => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('escolares-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([withCredentialsInterceptor])),
    provideCharts(withDefaultRegisterables()),
    { provide: APP_INITIALIZER, useFactory: initTheme, multi: true },
  ],
};