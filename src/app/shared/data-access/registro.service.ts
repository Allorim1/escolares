import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Registro {
  _id?: string;
  accion: string;
  modulo: string;
  descripcion: string;
  usuario: string;
  datos: any;
  fecha: Date;
}

@Injectable({
  providedIn: 'root',
})
export class RegistroService {
  private readonly API_URL = '/api/registros';

  registros = signal<Registro[]>([]);

  constructor(private http: HttpClient) {
    this.loadRegistros();
  }

  loadRegistros(modulo?: string) {
    const url = modulo ? `${this.API_URL}?modulo=${modulo}` : this.API_URL;
    this.http.get<Registro[]>(url).subscribe({
      next: (data) => this.registros.set(data),
      error: (err) => console.error('Error cargando registros:', err),
    });
  }

  registrar(accion: string, modulo: string, descripcion: string, datos: any = {}) {
    const registro = {
      accion,
      modulo,
      descripcion,
      datos,
    };

    this.http.post(this.API_URL, registro).subscribe({
      next: () => this.loadRegistros(),
      error: (err) => console.error('Error guardando registro:', err),
    });
  }

  limpiarRegistros() {
    this.http.delete(this.API_URL).subscribe({
      next: () => this.registros.set([]),
      error: (err) => console.error('Error eliminando registros:', err),
    });
  }

  getModulos(): string[] {
    const modulos = new Set(this.registros().map((r) => r.modulo));
    return Array.from(modulos);
  }
}
