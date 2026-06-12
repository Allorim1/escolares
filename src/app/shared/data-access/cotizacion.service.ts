import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RegistroService } from './registro.service';
import { Cotizacion } from '../interfaces/cotizacion.interface';

@Injectable({
  providedIn: 'root',
})
export class CotizacionService {
  private readonly API_URL = '/api/cotizaciones';

  cotizaciones = signal<Cotizacion[]>([]);

  constructor(private http: HttpClient, private registroService: RegistroService) {
    this.loadCotizaciones();
  }

  loadCotizaciones() {
    this.http.get<Cotizacion[]>(this.API_URL).subscribe({
      next: (data) => this.cotizaciones.set(data),
      error: (err) => console.error('Error cargando cotizaciones:', err),
    });
  }

  crearCotizacion(cotizacion: Omit<Cotizacion, '_id'>) {
    this.http.post(this.API_URL, cotizacion).subscribe({
      next: () => {
        this.loadCotizaciones();
        this.registroService.registrar('crear', 'Cotizaciones Alcadía', `Cotización creada: ${cotizacion.numeroCotizacion}`, { numeroCotizacion: cotizacion.numeroCotizacion });
      },
      error: (err) => console.error('Error creando cotización:', err),
    });
  }

  actualizarCotizacion(id: string, cotizacion: Partial<Cotizacion>) {
    this.http.put(`${this.API_URL}/${id}`, cotizacion).subscribe({
      next: () => {
        this.loadCotizaciones();
        this.registroService.registrar('editar', 'Cotizaciones Alcadía', `Cotización actualizada`, { id, ...cotizacion });
      },
      error: (err) => console.error('Error actualizando cotización:', err),
    });
  }

  eliminarCotizacion(id: string) {
    this.http.delete(`${this.API_URL}/${id}`).subscribe({
      next: () => {
        this.loadCotizaciones();
        this.registroService.registrar('eliminar', 'Cotizaciones Alcadía', `Cotización eliminada`, { id });
      },
      error: (err) => console.error('Error eliminando cotización:', err),
    });
  }

  getCotizacion(id: string) {
    return this.http.get<Cotizacion>(`${this.API_URL}/${id}`);
  }
}