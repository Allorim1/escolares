import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../shared/data-access/auth.service';
import { StoreSettingsService } from '../../shared/data-access/store-settings.service';
import { ApiKeyStatusService } from '../../shared/data-access/api-key-status.service';
import { NotificationService } from '../../shared/data-access/notification.service';

interface DashboardStats {
  productos: number;
  usuarios: number;
}

@Component({
  selector: 'app-admin-inicio',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class AdminInicio implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  authService = inject(AuthService);
  storeSettings = inject(StoreSettingsService);
  apiKeyStatusService = inject(ApiKeyStatusService);
  notificationService = inject(NotificationService);
  private router = inject(Router);

  get userName(): string {
    const user = this.authService.user();
    return user?.nombreCompleto || user?.username || 'Usuario';
  }

  get isRoot(): boolean {
    const user = this.authService.user();
    return user?.rol === 'root';
  }

  showApiKeyModal = false;
  dolarApiKey = '';
  savingApiKey = false;

  stats = signal<DashboardStats>({
    productos: 0,
    usuarios: 0,
  });

  loading = signal(true);
  recentActivities = signal<string[]>([]);
  mostrarSupervisorKey = signal(false);
  generandoClave = signal(false);

  countdown = signal<string>('');
  countdownInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.loadStats();
    if (this.isRoot) {
      this.apiKeyStatusService.loadApiKeyRenewalInfo();
      this.startCountdown();
    }
  }

  goTo(path: string) {
    try {
      this.router.navigate([path]);
    } catch (e) {
      console.error('Navigation error', e);
    }
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  startCountdown() {
    const updateCountdown = () => {
      const lastRenewal = this.apiKeyStatusService.lastRenewalDate();
      if (!lastRenewal) {
        this.countdown.set('');
        return;
      }

      const now = new Date();
      const nextRenewal = new Date(lastRenewal);
      nextRenewal.setDate(nextRenewal.getDate() + 3);

      const diff = nextRenewal.getTime() - now.getTime();

      if (diff <= 0) {
        this.countdown.set('�Puedes renovar la API key!');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      this.countdown.set(`${days}d ${hours}h ${minutes}m`);
    };

    updateCountdown();
    this.countdownInterval = setInterval(updateCountdown, 60000);
  }

  private generateRandomKey(length = 4) {
    const digits: string[] = [];
    const cryptoProvider = typeof window !== 'undefined'
      ? window.crypto || (window as Window & { msCrypto?: Crypto }).msCrypto
      : undefined;
    if (cryptoProvider) {
      const array = new Uint8Array(length);
      cryptoProvider.getRandomValues(array);
      for (let i = 0; i < length; i++) {
        digits.push(String(array[i] % 10));
      }
    } else {
      for (let i = 0; i < length; i++) {
        digits.push(String(Math.floor(Math.random() * 10)));
      }
    }
    return digits.join('');
  }

  toggleMostrarSupervisorKey() {
    this.mostrarSupervisorKey.update((v) => !v);
  }

  generarClaveSupervisor() {
    const nueva = this.generateRandomKey();
    this.generandoClave.set(true);
    const req = this.authService.updateProfile({ supervisorKey: nueva });
    if (!req) {
      this.generandoClave.set(false);
      return;
    }
    req.subscribe({
      next: () => {
        this.generandoClave.set(false);
        this.notificationService.success(
          'Clave generada',
          'La clave de supervisor ha sido actualizada.',
        );
      },
      error: (err) => {
        this.generandoClave.set(false);
        this.notificationService.error(
          'Error',
          'No se pudo generar la clave: ' + (err.error?.error || 'Error desconocido'),
        );
      },
    });
  }

  openApiKeyModal() {
    this.dolarApiKey = '';
    this.showApiKeyModal = true;
    window.open('https://www.dolarvzla.com/settings/api/', '_blank');
  }

  closeApiKeyModal() {
    this.showApiKeyModal = false;
  }

  guardarApiKey() {
    if (!this.dolarApiKey.trim()) {
      this.notificationService.warning('API Key vac�a', 'Ingresa una API key v�lida.');
      return;
    }

    this.savingApiKey = true;

    this.http.put('/api/settings/dolar-api-key', { apiKey: this.dolarApiKey.trim() }).subscribe({
      next: () => {
        this.apiKeyStatusService.loadApiKeyRenewalInfo();
        this.apiKeyStatusService.setApiKeyExpired(false);
        this.savingApiKey = false;
        this.closeApiKeyModal();
        this.notificationService.success(
          'API Key renovada',
          'La API key ha sido actualizada correctamente.',
        );
      },
      error: (err) => {
        this.savingApiKey = false;
        this.notificationService.error(
          'Error al guardar',
          'Error al guardar la API key: ' + (err.error?.error || 'Error desconocido'),
        );
      },
    });
  }

  loadStats() {
    this.recentActivities.set([]);
    this.loading.set(false);
  }

  formatMoneda(value: number): string {
    return value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  toggleCompras() {
    this.storeSettings.toggleCompras();
  }

  toggleMantenimiento() {
    const currentEnabled = this.storeSettings.mantenimiento();
    const currentTipo = this.storeSettings.mantenimientoTipo();
    const newEnabled = !currentEnabled;
    this.storeSettings.setMantenimiento(newEnabled, currentTipo);
  }

  setMantenimientoTipo(tipo: string) {
    this.storeSettings.setMantenimiento(this.storeSettings.mantenimiento(), tipo);
  }
}
