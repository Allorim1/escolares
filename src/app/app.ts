import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { Header } from './shared/ui/header/header';
import { Footer } from './shared/ui/footer/footer';
import { ApiKeyStatusService } from './shared/data-access/api-key-status.service';

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
  protected readonly title = signal('escolares');
  showMaintenanceModal = signal(true);

  constructor() {
    this.apiKeyStatusService.cargarPreciosOcultosParaNoRegistrados();
    
    this.router.events.subscribe(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  dismissModal() {
    this.showMaintenanceModal.set(false);
  }
}
