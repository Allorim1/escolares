import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ApiKeyStatusService {
  private _apiKeyExpired = signal(false);
  apiKeyExpired = this._apiKeyExpired.asReadonly();

  setApiKeyExpired(expired: boolean) {
    this._apiKeyExpired.set(expired);
  }
}
