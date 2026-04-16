import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { Header } from './shared/ui/header/header';
import { Footer } from './shared/ui/footer/footer';
import { ApiKeyStatusService } from './shared/data-access/api-key-status.service';
import { StoreSettingsService } from './shared/data-access/store-settings.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, Footer],
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
    this.storeSettings.setMantenimiento(false);
  }

  get mantenimiento(): boolean {
    return this.storeSettings.mantenimiento();
  }
}
