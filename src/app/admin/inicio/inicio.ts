import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { animate, stagger } from 'animejs';
import { AuthService } from '../../shared/data-access/auth.service';
import { StoreSettingsService } from '../../shared/data-access/store-settings.service';
import { ApiKeyStatusService } from '../../shared/data-access/api-key-status.service';
import { NotificationService } from '../../shared/data-access/notification.service';
import { AdminDashboardData, EstadisticasService } from '../../shared/data-access/estadisticas.service';

@Component({
  selector: 'app-admin-inicio',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class AdminInicio implements OnInit, OnDestroy, AfterViewInit {
  private http = inject(HttpClient);
  private statsService = inject(EstadisticasService);
  private el = inject(ElementRef<HTMLElement>);
  private platformId = inject(PLATFORM_ID);
  authService = inject(AuthService);
  storeSettings = inject(StoreSettingsService);
  apiKeyStatusService = inject(ApiKeyStatusService);
  notificationService = inject(NotificationService);
  private router = inject(Router);

  dashboard = signal<AdminDashboardData | null>(null);
  loading = signal(true);
  error = signal('');
  lastUpdated = signal<Date | null>(null);

  showApiKeyModal = false;
  newApiKey = '';
  isUpdating = false;
  countdown = signal('');
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private hasAnimated = false;

  get userName(): string {
    const user = this.authService.user();
    return user?.nombreCompleto || user?.username || 'Usuario';
  }

  get isRoot(): boolean {
    const user = this.authService.user();
    return user?.rol === 'root';
  }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  ngOnInit() {
    if (this.isRoot) {
      this.loadApiKeyStatus();
      this.startCountdown();
    }
    this.loadDashboard();
  }

  ngAfterViewInit() {
    this.tryAnimate();
  }

  loadDashboard() {
    this.loading.set(true);
    this.error.set('');
    this.statsService.getDashboard().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.loading.set(false);
        this.lastUpdated.set(new Date());
        if (!data) this.error.set('No se pudo cargar el dashboard.');
        setTimeout(() => this.tryAnimate(true), 30);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el dashboard.');
      },
    });
  }

  private tryAnimate(force = false) {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.loading() || !this.dashboard()) return;
    if (this.hasAnimated && !force) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.hasAnimated = true; return; }
    this.hasAnimated = true;
    requestAnimationFrame(() => {
      const cards = Array.from(this.el.nativeElement.querySelectorAll('.anim-in')) as HTMLElement[];
      if (!cards.length) return;
      try {
        cards.forEach((c) => (c.style.opacity = '0'));
        animate(cards, { opacity: [0, 1], translateY: [14, 0], delay: stagger(45), duration: 420, ease: 'out(2)' });
      } catch {
        cards.forEach((c) => { c.style.opacity = ''; c.style.transform = ''; });
      }
    });
  }

  loadApiKeyStatus() {
    this.apiKeyStatusService.loadApiKeyRenewalInfo();
  }

  startCountdown() {
    this.updateCountdown();
    this.countdownInterval = setInterval(() => this.updateCountdown(), 1000);
  }

  updateCountdown() {
    const last = this.apiKeyStatusService.lastRenewalDate();
    const hasKey = this.apiKeyStatusService.hasApiKey();
    if (!hasKey || !last) { this.countdown.set(''); return; }
    const hoursRemaining = 24 - (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60);
    if (hoursRemaining <= 0) { this.countdown.set('EXPIRADA'); return; }
    const hours = Math.floor(hoursRemaining);
    const minutes = Math.floor((hoursRemaining - hours) * 60);
    const seconds = Math.floor(((hoursRemaining - hours) * 60 - minutes) * 60);
    this.countdown.set(`${hours}h ${minutes}m ${seconds}s`);
  }

  ngOnDestroy() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  openApiKeyModal() { this.showApiKeyModal = true; this.newApiKey = ''; }
  closeApiKeyModal() { this.showApiKeyModal = false; this.newApiKey = ''; }

  updateApiKey() {
    if (!this.newApiKey.trim()) return;
    this.isUpdating = true;
    this.http.patch('/api/store-settings/api-key', { apiKey: this.newApiKey }).subscribe({
      next: () => {
        this.isUpdating = false;
        this.closeApiKeyModal();
        this.apiKeyStatusService.updateApiKeyRenewalDate();
        this.notificationService.success('API Key actualizada', 'La API Key se ha actualizado correctamente');
      },
      error: () => {
        this.isUpdating = false;
        this.notificationService.error('Error', 'No se pudo actualizar la API Key');
      },
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      confirmar: 'Por confirmar', pendiente: 'Pendiente', procesando: 'Procesando', procesado: 'Procesado',
      enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado', incidencia: 'Incidencia',
    };
    return map[status] || status;
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      confirmar: 'st-pending', pendiente: 'st-pending', procesando: 'st-processing', procesado: 'st-processing',
      enviado: 'st-sent', entregado: 'st-delivered', cancelado: 'st-cancelled', incidencia: 'st-incident',
    };
    return map[status] || 'st-pending';
  }

  severityClass(severity: string): string {
    return severity === 'high' ? 'sev-high' : severity === 'medium' ? 'sev-medium' : 'sev-low';
  }

  formatDate(value?: string | Date | null): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value || 0);
  }

  trackById(_: number, item: { id?: string | number; type?: string }) { return item.id ?? item.type ?? _; }
}
