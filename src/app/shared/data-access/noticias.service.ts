import { Injectable, signal, inject } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { Observable } from 'rxjs';
import { NotificationService } from './notification.service';

export interface Noticia {
  id: string;
  titulo: string;
  contenido: string;
  fecha: string | Date;
  activa: boolean;
  importante: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class NoticiasService extends BaseHttpService {
  private notificationService = inject(NotificationService);
  activeNoticias = signal<Noticia[]>([]);

  getNoticias(): Observable<Noticia[]> {
    return new Observable(observer => {
      this.http.get<Noticia[]>(`${this.apiUrl}/noticias`).subscribe({
        next: (noticias) => {
          const activas = noticias.filter(n => n.activa);
          this.activeNoticias.set(activas);
          observer.next(noticias);
          observer.complete();
        },
        error: (err) => {
          console.error('Error loading noticias:', err);
          this.activeNoticias.set([]);
          observer.error(err);
        }
      });
    });
  }

  getNoticiasAdmin(): Observable<Noticia[]> {
    return this.http.get<Noticia[]>(`${this.apiUrl}/noticias/admin`);
  }

  getNoticiaById(id: string): Observable<Noticia> {
    return this.http.get<Noticia>(`${this.apiUrl}/noticias/${id}`);
  }

  crearNoticia(noticia: Omit<Noticia, 'id' | 'fecha'>): Observable<Noticia> {
    return new Observable(observer => {
      this.http.post<Noticia>(`${this.apiUrl}/noticias`, noticia).subscribe({
        next: (noticiaCreada) => {
          const preview = noticiaCreada.contenido.replace(/[#*[\]]/g, '').substring(0, 100);
          this.notificationService.newsNotification(
            noticiaCreada.titulo,
            preview,
            noticiaCreada.id
          );
          observer.next(noticiaCreada);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  actualizarNoticia(id: string, noticia: Partial<Noticia>): Observable<Noticia> {
    return this.http.put<Noticia>(`${this.apiUrl}/noticias/${id}`, noticia);
  }

  eliminarNoticia(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/noticias/${id}`);
  }
}