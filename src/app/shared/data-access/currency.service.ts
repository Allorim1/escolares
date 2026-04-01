import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type CurrencyDisplay = 'USD' | 'BS' | 'BOTH';

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  private http = inject(HttpClient);
  
  private readonly STORAGE_KEY = 'currencyDisplay';
  private readonly API_TASAS = '/api/tasas';
  private readonly API_CURRENCY_DISPLAY = '/api/settings/currency-display';
  
  // Signal to control the currency display mode (global setting)
  private currencyDisplayInternal = signal<CurrencyDisplay>(this.loadFromStorage());
  
  // Current USD rate signal
  private tasaDolar = signal<number>(0);
  
  // Loading state for tasa and currency display
  loadingTasa = signal(false);
  loadingCurrencyDisplay = signal(false);
  
  // Public read-only signals
  currencyDisplay = this.currencyDisplayInternal.asReadonly();
  currentTasa = this.tasaDolar.asReadonly();
  
  // Computed signal to check display mode
  isDisplayBs = computed(() => this.currencyDisplayInternal() === 'BS');
  isDisplayUsd = computed(() => this.currencyDisplayInternal() === 'USD');
  isDisplayBoth = computed(() => this.currencyDisplayInternal() === 'BOTH');
  
  constructor() {
    this.loadTasa();
    this.loadCurrencyDisplayFromBackend();
  }
  
  private loadFromStorage(): CurrencyDisplay {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored === 'BS' || stored === 'USD' || stored === 'BOTH') {
        return stored;
      }
    }
    return 'USD';
  }
  
  private saveToStorage(value: CurrencyDisplay) {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.STORAGE_KEY, value);
    }
  }
  
  /**
   * Load the global currency display preference from the backend
   * This is a global setting that affects ALL users
   */
  loadCurrencyDisplayFromBackend() {
    this.loadingCurrencyDisplay.set(true);
    this.http.get<{ display: CurrencyDisplay }>(this.API_CURRENCY_DISPLAY).subscribe({
      next: (data) => {
        if (data && data.display) {
          this.currencyDisplayInternal.set(data.display);
          this.saveToStorage(data.display);
        }
        this.loadingCurrencyDisplay.set(false);
      },
      error: () => {
        this.loadingCurrencyDisplay.set(false);
      }
    });
  }
  
  /**
   * Load the current USD rate from the server
   */
  loadTasa() {
    this.loadingTasa.set(true);
    this.http.get<any>(this.API_TASAS).subscribe({
      next: (data) => {
        if (data && data.current) {
          const usdValue = data.current.usd || data.current.USDT || data.current.binance;
          if (usdValue) {
            this.tasaDolar.set(parseFloat(usdValue) || 0);
          }
        }
        this.loadingTasa.set(false);
      },
      error: () => {
        this.loadingTasa.set(false);
      }
    });
  }
  
  /**
   * Cycle through display modes: USD -> BS -> BOTH -> USD
   * Only root users can modify this (enforced by backend)
   */
  toggleCurrency() {
    let newValue: CurrencyDisplay;
    const current = this.currencyDisplayInternal();
    if (current === 'USD') {
      newValue = 'BS';
    } else if (current === 'BS') {
      newValue = 'BOTH';
    } else {
      newValue = 'USD';
    }
    this.setCurrencyDisplay(newValue);
  }
  
  /**
   * Set the currency display mode (saves to backend for global use)
   */
  setCurrencyDisplay(display: CurrencyDisplay) {
    // Optimistically update local state
    this.currencyDisplayInternal.set(display);
    this.saveToStorage(display);
    
    // Save to backend (only root users can actually change it)
    this.http.put<any>(this.API_CURRENCY_DISPLAY, { display }).subscribe({
      next: (data) => {
        if (data && data.display) {
          // Confirm with server response
          this.currencyDisplayInternal.set(data.display);
          this.saveToStorage(data.display);
        }
      },
      error: (err) => {
        // Revert to previous value on error if not authorized
        if (err.status === 403) {
          // User is not root, revert the change
          const previousValue: CurrencyDisplay = display === 'USD' ? 'BOTH' : 'USD';
          this.currencyDisplayInternal.set(previousValue);
          this.saveToStorage(previousValue);
          console.warn('Solo el usuario root puede cambiar la visualización de precios');
        }
      }
    });
  }
  
  /**
   * Convert USD price to Bs
   */
  convertToBs(priceInUsd: number): number {
    const tasa = this.tasaDolar();
    if (tasa <= 0) return priceInUsd;
    return priceInUsd * tasa;
  }
  
  /**
   * Format price based on current display mode
   * Returns HTML with CSS classes for BOTH mode styling
   */
  formatPrice(priceInUsd: number): string {
    const display = this.currencyDisplayInternal();
    
    if (display === 'BOTH') {
      const priceInBs = this.convertToBs(priceInUsd);
      // Bs price is on top (highlighted), USD price is below (muted)
      return `<span class="price-bs-highlight">${this.formatBs(priceInBs)}</span><br><span class="price-usd-muted">$${priceInUsd.toFixed(2)}</span>`;
    } else if (display === 'BS') {
      const priceInBs = this.convertToBs(priceInUsd);
      return this.formatBs(priceInBs);
    } else {
      return `$${priceInUsd.toFixed(2)}`;
    }
  }

  // Check if we're in BOTH mode (for applying special CSS)
  isBothMode(): boolean {
    return this.currencyDisplayInternal() === 'BOTH';
  }
  
  /**
   * Format price in Bs
   */
  formatBs(priceInBs: number): string {
    return `Bs. ${new Intl.NumberFormat('es-VE').format(Math.round(priceInBs))}`;
  }
  
  /**
   * Format price in USD
   */
  formatUsd(priceInUsd: number): string {
    return `$${priceInUsd.toFixed(2)}`;
  }
  
  /**
   * Get the display label for the toggle button
   */
  getDisplayLabel(): string {
    const display = this.currencyDisplayInternal();
    if (display === 'BOTH') return 'Ambos';
    if (display === 'BS') return 'Bs';
    return '$';
  }
}
