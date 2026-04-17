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
    this.loadMantenimientoFromBackend();
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

  // Signal for mantenimiento mode
  private mantenimientoInternal = signal<boolean>(this.loadMantenimientoFromStorage());
  
  // Public read-only signal
  mantenimiento = this.mantenimientoInternal.asReadonly();
  
  // Signal for mantenimiento tipo (parcial | absoluto)
  private mantenimientoTipoInternal = signal<string>(this.loadMantenimientoTipoFromStorage());
  
  // Public read-only signal
  mantenimientoTipo = this.mantenimientoTipoInternal.asReadonly();
  
  private loadMantenimientoFromStorage(): boolean {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('mantenimiento');
      return stored === 'true';
    }
    return false;
  }
  
  private loadMantenimientoTipoFromStorage(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('mantenimientoTipo');
      return stored === 'absoluto' ? 'absoluto' : 'parcial';
    }
    return 'parcial';
  }
  
  private saveMantenimientoToStorage(value: boolean) {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('mantenimiento', value.toString());
    }
  }

  loadMantenimientoFromBackend() {
    this.http.get<{ enabled: boolean; tipo: string }>(`${this.API_SETTINGS}/mantenimiento`).subscribe({
      next: (data) => {
        if (data && typeof data.enabled === 'boolean') {
          this.mantenimientoInternal.set(data.enabled);
          this.mantenimientoTipoInternal.set(data.tipo || 'parcial');
          this.saveMantenimientoToStorage(data.enabled);
          if (typeof window !== 'undefined') {
            localStorage.setItem('mantenimientoTipo', data.tipo || 'parcial');
          }
        }
      },
      error: () => {}
    });
  }

  toggleMantenimiento() {
    const newValue = !this.mantenimientoInternal();
    this.setMantenimiento(newValue, this.mantenimientoTipoInternal());
  }

  setMantenimiento(enabled: boolean, tipo: string = 'parcial') {
    this.mantenimientoInternal.set(enabled);
    this.mantenimientoTipoInternal.set(tipo);
    this.saveMantenimientoToStorage(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mantenimientoTipo', tipo);
    }
    
    this.http.put<any>(`${this.API_SETTINGS}/mantenimiento`, { enabled, tipo }).subscribe({
      next: (data) => {
        if (data && typeof data.enabled === 'boolean') {
          this.mantenimientoInternal.set(data.enabled);
          this.mantenimientoTipoInternal.set(data.tipo || 'parcial');
          this.saveMantenimientoToStorage(data.enabled);
          if (typeof window !== 'undefined') {
            localStorage.setItem('mantenimientoTipo', data.tipo || 'parcial');
          }
        }
      },
      error: (err) => {
        console.error('Error saving mantenimiento setting:', err);
      }
    });
  }

  esAdmin(): boolean {
    if (typeof window === 'undefined') return false;
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    try {
      const user = JSON.parse(userStr);
      return user?.rol && user.rol !== 'guest';
    } catch {
      return false;
    }
  }

  debeMostrarMantenimiento(): boolean {
    if (!this.mantenimientoInternal()) return false;
    if (this.esAdmin()) return false;
    return true;
  }

  debeBloquearSitio(): boolean {
    if (!this.mantenimientoInternal()) return false;
    if (this.mantenimientoTipo() === 'parcial') return false;
    if (this.esAdmin()) return false;
    return true;
  }
}
