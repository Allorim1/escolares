import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { Header } from './shared/ui/header/header';
import { Footer } from './shared/ui/footer/footer';
import { NotificationsComponent } from './shared/ui/notifications/notifications';
import { NotificationModalComponent } from './shared/ui/notification-modal/notification-modal.component';
import { ApiKeyStatusService } from './shared/data-access/api-key-status.service';
import { StoreSettingsService } from './shared/data-access/store-settings.service';
import { ModalEscService } from './shared/services/modal-esc.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, Footer, NotificationsComponent, NotificationModalComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit {
  private router = inject(Router);
  private apiKeyStatusService = inject(ApiKeyStatusService);
  private modalEscService = inject(ModalEscService);
  storeSettings = inject(StoreSettingsService);
  protected readonly title = signal('escolares');

  constructor() {
    this.apiKeyStatusService.cargarPreciosOcultosParaNoRegistrados();
    
    this.router.events.subscribe(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  ngOnInit() {
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.modalEscService.notify();
      }
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
