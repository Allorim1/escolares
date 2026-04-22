import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthBackend } from '../../backend/data-access/auth.backend';

export interface ProductRating {
  productId: string;
  userId: string;
  rate: number;
  createdAt: Date;
}

export interface ProductRatingStats {
  productId: string;
  averageRate: number;
  count: number;
  userRate?: number;
}

@Injectable({
  providedIn: 'root',
})
export class RatingsService {
  private http = inject(HttpClient);
  private authBackend = inject(AuthBackend);

  private userRatingsCache = signal<Map<string, number>>(new Map());
  private productStatsCache = signal<Map<string, ProductRatingStats>>(new Map());

  getProductStats(productId: string) {
    return this.http.get<{ averageRate: number; count: number; userRate?: number }>(`/api/ratings/${productId}/stats`);
  }

  getUserRating(productId: string) {
    return this.http.get<{ rate?: number }>(`/api/ratings/${productId}/user`).pipe(
    );
  }

  submitRating(productId: string, rate: number) {
    return this.http.post<{ success: boolean; newAverage: number; count: number }>('/api/ratings', {
      productId,
      rate
    });
  }

  clearCache(productId?: string) {
    if (productId) {
      const cache = new Map(this.productStatsCache());
      cache.delete(productId);
      this.productStatsCache.set(cache);
    } else {
      this.productStatsCache.set(new Map());
      this.userRatingsCache.set(new Map());
    }
  }
}