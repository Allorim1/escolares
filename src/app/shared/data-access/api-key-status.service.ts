import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ApiKeyStatusService {
  private _apiKeyExpired = signal(false);
  private _preciosOcultosParaNoRegistrados = signal(false);
  apiKeyExpired = this._apiKeyExpired.asReadonly();
  preciosOcultosParaNoRegistrados = this._preciosOcultosParaNoRegistrados.asReadonly();

  constructor(private http: HttpClient) {}

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
      error: () => {}
    });
  }
}
