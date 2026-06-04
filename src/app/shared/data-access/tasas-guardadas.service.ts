import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface TasaGuardada {
  _id?: string;
  nombre: string;
  tasas: { fecha: string; valor: number }[];
  tipo: 'actual' | 'anterior';
  fechaCreacion: Date;
}

@Injectable({
  providedIn: 'root'
})
export class TasasGuardadasService {
  private apiUrl = '/api/tasas-guardadas';

  constructor(private http: HttpClient) {}

  getAll(tipo?: string) {
    const url = tipo ? `${this.apiUrl}?tipo=${tipo}` : this.apiUrl;
    return this.http.get<TasaGuardada[]>(url);
  }

  getById(id: string) {
    return this.http.get<TasaGuardada>(`${this.apiUrl}/${id}`);
  }

  save(nombre: string, tasas: Map<string, number>, tipo: 'actual' | 'anterior' = 'actual') {
    const tasasArray = Array.from(tasas.entries()).map(([fecha, valor]) => ({ fecha, valor }));
    return this.http.post<{ success: boolean; id: string }>(this.apiUrl, { nombre, tasas: tasasArray, tipo });
  }

  delete(id: string) {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`);
  }
}