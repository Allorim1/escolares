import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RegistroService } from './registro.service';
import { NotaEntrega } from '../interfaces/nota-entrega.interface';

@Injectable({
  providedIn: 'root',
})
export class NotaEntregaService {
  private readonly API_URL = '/api/notas-entrega';

  notasEntrega = signal<NotaEntrega[]>([]);

  private http = inject(HttpClient);
  private registroService = inject(RegistroService);

  loadNotasEntrega() {
    this.http.get<NotaEntrega[]>(this.API_URL).subscribe({
      next: (data) => this.notasEntrega.set(data),
      error: (err) => {
        console.error('Error cargando notas de entrega:', err);
        this.notasEntrega.set([]);
      },
    });
  }

  crearNotaEntrega(nota: Omit<NotaEntrega, '_id'>) {
    this.http.post(this.API_URL, nota).subscribe({
      next: () => {
        this.loadNotasEntrega();
        this.registroService.registrar('crear', 'Notas de Entrega', `Nota de entrega creada: ${nota.numeroNota}`, { numeroNota: nota.numeroNota });
      },
      error: (err) => console.error('Error creando nota de entrega:', err),
    });
  }

  actualizarNotaEntrega(id: string, nota: Partial<NotaEntrega>) {
    this.http.put(`${this.API_URL}/${id}`, nota).subscribe({
      next: () => {
        this.loadNotasEntrega();
        this.registroService.registrar('editar', 'Notas de Entrega', `Nota de entrega actualizada`, { id, ...nota });
      },
      error: (err) => console.error('Error actualizando nota de entrega:', err),
    });
  }

  eliminarNotaEntrega(id: string) {
    this.http.delete(`${this.API_URL}/${id}`).subscribe({
      next: () => {
        this.loadNotasEntrega();
        this.registroService.registrar('eliminar', 'Notas de Entrega', `Nota de entrega eliminada`, { id });
      },
      error: (err) => console.error('Error eliminando nota de entrega:', err),
    });
  }

  getNotaEntrega(id: string) {
    return this.http.get<NotaEntrega>(`${this.API_URL}/${id}`);
  }
}