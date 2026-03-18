import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Permiso {
  id: string;
  nombre: string;
  descripcion: string;
  modulo: string;
}

export interface Rol {
  _id?: string;
  id: string;
  nombre: string;
  descripcion: string;
  permisos: string[];
  esDefault: boolean;
  esVendedor: boolean;
  comision: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class RolesBackend {
  private readonly API_URL = '/api/roles';

  constructor(private http: HttpClient) {}

  getPermisos(): Observable<Permiso[]> {
    return this.http.get<Permiso[]>(`${this.API_URL}/permisos`);
  }

  getRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(this.API_URL);
  }

  getRol(id: string): Observable<Rol> {
    return this.http.get<Rol>(`${this.API_URL}/${id}`);
  }

  createRol(rol: Partial<Rol>): Observable<Rol> {
    return this.http.post<Rol>(this.API_URL, rol);
  }

  updateRol(id: string, rol: Partial<Rol>): Observable<Rol> {
    return this.http.put<Rol>(`${this.API_URL}/${id}`, rol);
  }

  deleteRol(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`);
  }
}
