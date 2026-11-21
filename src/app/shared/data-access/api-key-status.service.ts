import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ApiKeyStatusService {
  private http = inject(HttpClient);

  private _apiKeyExpired = signal(false);
  private _preciosOcultosParaNoRegistrados = signal(false);
  private _lastRenewalDate = signal<Date | null>(null);
  private _hasApiKey = signal(false);
  apiKeyExpired = this._apiKeyExpired.asReadonly();
  preciosOcultosParaNoRegistrados = this._preciosOcultosParaNoRegistrados.asReadonly();
  lastRenewalDate = this._lastRenewalDate.asReadonly();
  hasApiKey = this._hasApiKey.asReadonly();

  setApiKeyExpired(expired: boolean) {
    this._apiKeyExpired.set(expired);
  }

  setPreciosOcultosParaNoRegistrados(hidden: boolean) {
    this._preciosOcultosParaNoRegistrados.set(hidden);
  }

  cargarPreciosOcultosParaNoRegistrados() {
    this.http.get<{ hidden: boolean }>('/api/settings/ocultar-precios').subscribe({
      next: (data) => {
        this._preciosOcultosParaNoRegistrados.set(data.hidden);
      },
      error: (error) => console.error('Error cargando la configuración de precios:', error),
    });
  }

  loadApiKeyRenewalInfo() {
    this.http
      .get<{
        hasApiKey: boolean;
        lastRenewalDate: string | null;
      }>('/api/settings/api-key-renewal-info')
      .subscribe({
        next: (data) => {
          this._hasApiKey.set(data.hasApiKey);
          this._lastRenewalDate.set(data.lastRenewalDate ? new Date(data.lastRenewalDate) : null);
        },
        error: (error) => console.error('Error cargando los datos de renovación de la API key:', error),
      });
  }

  updateApiKeyRenewalDate() {
    this._lastRenewalDate.set(new Date());
    this._hasApiKey.set(true);
  }
}
