import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class TokenRenewalService {
  private refreshInterval: any = null;
  private readonly CHECK_INTERVAL_MS = 3 * 60 * 1000; // Check every 3 minutes
  private readonly RENEW_BEFORE_MS = 10 * 60 * 1000; // Renew 10 minutes before expiration
  private readonly STORAGE_KEY = 'token_renewal_data';
  
  private ngZone = inject(NgZone);
  private router = inject(Router);

  /**
   * Start the token renewal service when user logs in
   */
  start(): void {
    this.stop(); // Clear any existing interval
    this.loadTokenData();
    
    // Run the check immediately
    this.checkAndRenew();
    
    // Then run periodically
    this.ngZone.runOutsideAngular(() => {
      this.refreshInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.checkAndRenew();
        });
      }, this.CHECK_INTERVAL_MS);
    });
  }

  /**
   * Stop the token renewal service when user logs out
   */
  stop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Check if tokens need renewal and renew them
   */
  private checkAndRenew(): void {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!accessToken || !refreshToken) {
      this.stop();
      return;
    }

    const tokenData = this.decodeToken(accessToken);
    if (!tokenData || !tokenData.exp) {
      this.handleExpiredSession();
      return;
    }

    const expiresAt = tokenData.exp * 1000;
    const now = Date.now();
    const timeUntilExpiration = expiresAt - now;

    // If token is expired or will expire soon, try to renew
    if (timeUntilExpiration <= this.RENEW_BEFORE_MS) {
      this.renewTokens().then((success) => {
        if (!success) {
          // If renewal failed and token is actually expired, handle session
          if (timeUntilExpiration <= 0) {
            this.handleExpiredSession();
          }
        }
      });
    }
  }

  /**
   * Decode JWT token to get expiration
   */
  private decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(atob(parts[1]));
    } catch {
      return null;
    }
  }

  /**
   * Save token data for persistence across page reloads
   */
  private saveTokenData(accessToken: string, refreshToken: string): void {
    const tokenData: TokenData = {
      accessToken,
      refreshToken,
      expiresAt: this.decodeToken(accessToken)?.exp * 1000 || 0
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tokenData));
  }

  /**
   * Load saved token data
   */
  private loadTokenData(): void {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const tokenData: TokenData = JSON.parse(saved);
        // Verify tokens match what's in localStorage
        const currentAccess = localStorage.getItem('accessToken');
        const currentRefresh = localStorage.getItem('refreshToken');
        
        if (currentAccess !== tokenData.accessToken || currentRefresh !== tokenData.refreshToken) {
          localStorage.removeItem(this.STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    }
  }

  /**
   * Call the backend to renew tokens
   */
  private async renewTokens(): Promise<boolean> {
    const refreshTokenValue = localStorage.getItem('refreshToken');
    if (!refreshTokenValue) return false;

    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies if needed
        body: JSON.stringify({ refreshToken: refreshTokenValue })
      });

      if (!res.ok) {
        const data = await res.json();
        console.warn('Token renewal failed:', data.error);
        return false;
      }

      const data = await res.json();
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        this.saveTokenData(
          data.accessToken,
          data.refreshToken || refreshTokenValue
        );
        console.log('Tokens renewed successfully');
        return true;
      }
      return false;
    } catch (e) {
      console.error('Token renewal error:', e);
      return false;
    }
  }

  /**
   * Handle when session has expired
   */
  private handleExpiredSession(): void {
    this.stop();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Only redirect if we're not already on the login page
    if (!this.router.url.includes('/login')) {
      console.warn('Session expired, redirecting to login');
      this.router.navigate(['/login']);
    }
  }
}
