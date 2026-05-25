import { Injectable } from '@angular/core';
import { BaseHttpService } from '../../shared/data-access/base-http.service';
import { Observable } from 'rxjs';

export interface Noticia {
  id: string;
  titulo: string;
  contenido: string;
  fecha: string | Date;
  activa: boolean;
  importante: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NoticiasService extends BaseHttpService {
  getNoticias(): Observable<Noticia[]> {
    return this.http.get<Noticia[]>(`${this.apiUrl}/noticias`);
  }

  getNoticiasAdmin(): Observable<Noticia[]> {
    return this.http.get<Noticia[]>(`${this.apiUrl}/noticias/admin`);
  }

  getNoticiaById(id: string): Observable<Noticia> {
    return this.http.get<Noticia>(`${this.apiUrl}/noticias/${id}`);
  }

  crearNoticia(noticia: Omit<Noticia, 'id' | 'fecha'>): Observable<Noticia> {
    return this.http.post<Noticia>(`${this.apiUrl}/noticias`, noticia);
  }

  actualizarNoticia(id: string, noticia: Partial<Noticia>): Observable<Noticia> {
    return this.http.put<Noticia>(`${this.apiUrl}/noticias/${id}`, noticia);
  }

  eliminarNoticia(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/noticias/${id}`);
  }
}