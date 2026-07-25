import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

export interface Empresa {
  _id?: string;
  nombre: string;
  plantas: string[];
}

@Injectable({ providedIn: 'root' })
export class EmpresasService {
  private readonly API = '/api/empresas';
  private empresasSubject = new BehaviorSubject<Empresa[]>([]);
  empresas$ = this.empresasSubject.asObservable();

  private http = inject(HttpClient);

  load(): void {
    this.http.get<Empresa[]>(this.API).subscribe({
      next: (data) => this.empresasSubject.next(data),
      error: (err) => console.error('Error loading empresas:', err),
    });
  }

  setEmpresas(data: Empresa[]): void {
    this.empresasSubject.next(data);
  }

  get empresas(): Empresa[] {
    return this.empresasSubject.value;
  }
}
