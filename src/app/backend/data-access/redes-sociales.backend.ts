import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RedSocial {
  id: string;
  plataforma: string;
  usuario: string;
  token: string;
  habilitada: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MensajeRedSocial {
  id: string;
  plataforma: string;
  usuario: string;
  texto: string;
  fecha: Date;
  leido: boolean;
  respondido: boolean;
  respuesta?: string;
  mediaType?: string;
  mediaUrl?: string;
  mediaCaption?: string;
  mediaFilename?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RespuestaAutomatica {
  id: string;
  palabraClave: string;
  respuesta: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificacionRedSocial {
  id: string;
  tipo: string;
  canal: string;
  activa: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class RedesSocialesBackend {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api/redes-sociales';

  // Redes Sociales
  getRedesSociales(): Observable<RedSocial[]> {
    return this.http.get<RedSocial[]>(`${this.API_URL}/redes`);
  }

  createRedSocial(redSocial: Partial<RedSocial>): Observable<RedSocial> {
    return this.http.post<RedSocial>(`${this.API_URL}/redes`, redSocial);
  }

  updateRedSocial(id: string, redSocial: Partial<RedSocial>): Observable<RedSocial> {
    return this.http.put<RedSocial>(`${this.API_URL}/redes/${id}`, redSocial);
  }

  deleteRedSocial(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/redes/${id}`);
  }

  // Mensajes
  getMensajes(): Observable<MensajeRedSocial[]> {
    return this.http.get<MensajeRedSocial[]>(`${this.API_URL}/mensajes`);
  }

  createMensaje(mensaje: Partial<MensajeRedSocial>): Observable<MensajeRedSocial> {
    return this.http.post<MensajeRedSocial>(`${this.API_URL}/mensajes`, mensaje);
  }

  updateMensaje(id: string, mensaje: Partial<MensajeRedSocial>): Observable<MensajeRedSocial> {
    return this.http.put<MensajeRedSocial>(`${this.API_URL}/mensajes/${id}`, mensaje);
  }

  deleteMensaje(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/mensajes/${id}`);
  }

  // Respuestas Automáticas
  getRespuestasAutomaticas(): Observable<RespuestaAutomatica[]> {
    return this.http.get<RespuestaAutomatica[]>(`${this.API_URL}/respuestas-automaticas`);
  }

  createRespuestaAutomatica(respuesta: Partial<RespuestaAutomatica>): Observable<RespuestaAutomatica> {
    return this.http.post<RespuestaAutomatica>(`${this.API_URL}/respuestas-automaticas`, respuesta);
  }

  updateRespuestaAutomatica(id: string, respuesta: Partial<RespuestaAutomatica>): Observable<RespuestaAutomatica> {
    return this.http.put<RespuestaAutomatica>(`${this.API_URL}/respuestas-automaticas/${id}`, respuesta);
  }

  deleteRespuestaAutomatica(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/respuestas-automaticas/${id}`);
  }

  // Notificaciones
  getNotificaciones(): Observable<NotificacionRedSocial[]> {
    return this.http.get<NotificacionRedSocial[]>(`${this.API_URL}/notificaciones`);
  }

  createNotificacion(notificacion: Partial<NotificacionRedSocial>): Observable<NotificacionRedSocial> {
    return this.http.post<NotificacionRedSocial>(`${this.API_URL}/notificaciones`, notificacion);
  }

  updateNotificacion(id: string, notificacion: Partial<NotificacionRedSocial>): Observable<NotificacionRedSocial> {
    return this.http.put<NotificacionRedSocial>(`${this.API_URL}/notificaciones/${id}`, notificacion);
  }

  deleteNotificacion(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/notificaciones/${id}`);
  }
}