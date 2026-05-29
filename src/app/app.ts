import { Component, signal, inject, APP_INITIALIZER, PLATFORM_ID } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Header } from './shared/ui/header/header';
import { Footer } from './shared/ui/footer/footer';
import { NotificationsComponent } from './shared/ui/notifications/notifications';
import { NotificationModalComponent } from './shared/ui/notification-modal/notification-modal.component';
import { ApiKeyStatusService } from './shared/data-access/api-key-status.service';
import { StoreSettingsService } from './shared/data-access/store-settings.service';

export function initTheme(platformId: object) {
  return () => {
    if (isPlatformBrowser(platformId)) {
      // Initialize theme on app load
      const savedTheme = localStorage.getItem('escolares-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
  };
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, Footer, NotificationsComponent, NotificationModalComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  private router = inject(Router);
  private apiKeyStatusService = inject(ApiKeyStatusService);
  storeSettings = inject(StoreSettingsService);
  protected readonly title = signal('escolares');

  constructor() {
    this.apiKeyStatusService.cargarPreciosOcultosParaNoRegistrados();
    
    this.router.events.subscribe(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  dismissModal() {
    this.storeSettings.setMantenimiento(false, this.storeSettings.mantenimientoTipo());
  }

  get mostrarModal(): boolean {
    return this.storeSettings.debeMostrarMantenimiento();
  }

  get esMantenimientoAbsoluto(): boolean {
    return this.storeSettings.mantenimientoTipo() === 'absoluto';
  }

  get esSitioBloqueado(): boolean {
    return this.storeSettings.debeBloquearSitio();
  }
}
