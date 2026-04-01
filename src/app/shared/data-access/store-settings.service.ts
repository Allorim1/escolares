import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class StoreSettingsService {
  private http = inject(HttpClient);
  
  private readonly API_SETTINGS = '/api/settings';
  private readonly STORAGE_KEY = 'comprasDeshabilitadas';
  
  // Signal for compras deshabilitadas
  private comprasDeshabilitadasInternal = signal<boolean>(this.loadFromStorage());
  
  // Public read-only signal
  comprasDeshabilitadas = this.comprasDeshabilitadasInternal.asReadonly();
  
  // Loading state
  loading = signal(false);

  constructor() {
    this.loadFromBackend();
  }
  
  private loadFromStorage(): boolean {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored === 'true';
    }
    return false;
  }
  
  private saveToStorage(value: boolean) {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.STORAGE_KEY, value.toString());
    }
  }
  
  /**
   * Load the compras deshabilitadas setting from the backend
   */
  loadFromBackend() {
    this.loading.set(true);
    this.http.get<{ disabled: boolean }>(`${this.API_SETTINGS}/compras-deshabilitadas`).subscribe({
      next: (data) => {
        if (data && typeof data.disabled === 'boolean') {
          this.comprasDeshabilitadasInternal.set(data.disabled);
          this.saveToStorage(data.disabled);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
  
  /**
   * Toggle the compras deshabilitadas setting
   */
  toggleCompras() {
    const newValue = !this.comprasDeshabilitadasInternal();
    this.setComprasDeshabilitadas(newValue);
  }
  
  /**
   * Set the compras deshabilitadas setting
   */
  setComprasDeshabilitadas(disabled: boolean) {
    // Optimistically update local state
    this.comprasDeshabilitadasInternal.set(disabled);
    this.saveToStorage(disabled);
    
    // Save to backend
    this.http.put<any>(`${this.API_SETTINGS}/compras-deshabilitadas`, { disabled }).subscribe({
      next: (data) => {
        if (data && typeof data.disabled === 'boolean') {
          this.comprasDeshabilitadasInternal.set(data.disabled);
          this.saveToStorage(data.disabled);
        }
      },
      error: (err) => {
        console.error('Error saving compras setting:', err);
      }
    });
  }
  
  /**
   * Check if user is root (for admin access)
   */
  isRoot(): boolean {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.rol === 'root';
  }
}
