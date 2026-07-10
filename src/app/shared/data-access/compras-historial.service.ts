import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

export interface ItemCompra {
  _id?: string;
  productoId: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
}

export interface Compra {
  _id?: string;
  numero: number;
  proveedor: string;
  proveedorId?: string;
  fecha: string;
  items: ItemCompra[];
  subtotal: number;
  iva: number;
  total: number;
  notas?: string;
  estado?: 'pendiente' | 'completada' | 'cancelada';
}

export interface VariacionPrecio {
  productoId: number;
  nombreProducto: string;
  historico: { proveedor: string; costo: number; fecha: string }[];
  mejorCosto: { proveedor: string; costo: number; fecha: string };
  precioLista: number;
  flete: number;
  seguro: number;
  aduana: number;
  costoTotal: number;
}

export interface CPP {
  productoId: number;
  nombreProducto: string;
  costo: number;
  proveedor: string;
  proveedorId: string;
  fecha: string;
}

export interface ComparativaProveedor {
  proveedorId: string;
  proveedor: string;
  totalComprado: number;
  precioPromedio: number;
  ultimaCompra: string;
  cantidadArticulos: number;
}

export interface InversionProveedor {
  proveedorId: string;
  proveedor: string;
  totalInvertido: number;
  cantidadCompras: number;
  porcentajeInversion: number;
}

export interface Alerta {
  _id?: string;
  productoId: number;
  nombreProducto: string;
  proveedorAnterior: string;
  costoAnterior: number;
  proveedorNuevo: string;
  costoNuevo: number;
  porcentajeAumento: number;
  fecha: string;
  revisada: boolean;
}

export interface AcuerdoComercial {
  _id?: string;
  proveedorId: string;
  proveedor: string;
  tipo: 'volumen' | 'temporada' | 'anticipo' | 'anual';
  descripcion: string;
  descuentoPorcentaje: number;
  montoMinimo?: number;
  montoMaximo?: number;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

export interface ReporteRotacion {
  productoId: number;
  nombreProducto: string;
  cantidadComprada: number;
  montoTotal: number;
  ultimaCompra: string;
  frecuencia: number;
}

@Injectable({
  providedIn: 'root',
})
export class ComprasHistorialService {
  private readonly API = '/api/compras';
  private http = inject(HttpClient);

  getCompras(filters?: { proveedor?: string; fecha?: string }) {
    const params: Record<string, string> = {};
    if (filters?.['proveedor']) params['proveedor'] = filters['proveedor'];
    if (filters?.['fecha']) params['fecha'] = filters['fecha'];
    return this.http.get<Compra[]>(this.API, { params }).pipe(
      catchError((err) => {
        console.error('Error cargando compras:', err);
        return of([]);
      }),
    );
  }

  getCompraById(id: string) {
    return this.http.get<Compra>(`${this.API}/${id}`).pipe(
      catchError((err) => {
        console.error('Error cargando compra:', err);
        return of(null as unknown as Compra);
      }),
    );
  }

  createCompra(data: Omit<Compra, '_id'>) {
    return this.http.post<Compra>(this.API, data).pipe(
      catchError((err) => {
        console.error('Error creando compra:', err);
        return of(null as unknown as Compra);
      }),
    );
  }

  updateCompra(id: string, data: Partial<Compra>) {
    return this.http.put<Compra>(`${this.API}/${id}`, data).pipe(
      catchError((err) => {
        console.error('Error actualizando compra:', err);
        return of(null as unknown as Compra);
      }),
    );
  }

  deleteCompra(id: string) {
    return this.http.delete(`${this.API}/${id}`).pipe(
      catchError((err) => {
        console.error('Error eliminando compra:', err);
        return of(null);
      }),
    );
  }

  getVariacionesPrecio(productoId: number) {
    return this.http.get<VariacionPrecio[]>(`${this.API}/producto/${productoId}/variaciones`).pipe(
      catchError((err) => {
        console.error('Error cargando variaciones:', err);
        return of([]);
      }),
    );
  }

  getCPP(productoId: number) {
    return this.http.get<CPP[]>(`${this.API}/producto/${productoId}/cpp`).pipe(
      catchError((err) => {
        console.error('Error cargando CPP:', err);
        return of([]);
      }),
    );
  }

  getComparativaProveedores() {
    return this.http.get<ComparativaProveedor[]>(`${this.API}/proveedores/comparativa`).pipe(
      catchError((err) => {
        console.error('Error cargando comparativa:', err);
        return of([]);
      }),
    );
  }

  getInversionProveedores() {
    return this.http.get<InversionProveedor[]>(`${this.API}/proveedores/inversion`).pipe(
      catchError((err) => {
        console.error('Error cargando inversión:', err);
        return of([]);
      }),
    );
  }

  getAlertas() {
    return this.http.get<Alerta[]>(`${this.API}/alertas`).pipe(
      catchError((err) => {
        console.error('Error cargando alertas:', err);
        return of([]);
      }),
    );
  }

  revisarAlerta(id: string) {
    return this.http.put(`${this.API}/alertas/${id}/revisar`, {}).pipe(
      catchError((err) => {
        console.error('Error revisando alerta:', err);
        return of(null);
      }),
    );
  }

  createAcuerdoComercial(data: Omit<AcuerdoComercial, '_id'>) {
    return this.http.post<AcuerdoComercial>(`${this.API}/acuerdos-comerciales`, data).pipe(
      catchError((err) => {
        console.error('Error creando acuerdo:', err);
        return of(null as unknown as AcuerdoComercial);
      }),
    );
  }

  getAcuerdosComerciales() {
    return this.http.get<AcuerdoComercial[]>(`${this.API}/acuerdos-comerciales`).pipe(
      catchError((err) => {
        console.error('Error cargando acuerdos:', err);
        return of([]);
      }),
    );
  }

  getAcuerdosByProveedor(proveedorId: string) {
    return this.http.get<AcuerdoComercial[]>(`${this.API}/acuerdos-comerciales/proveedor/${proveedorId}`).pipe(
      catchError((err) => {
        console.error('Error cargando acuerdos por proveedor:', err);
        return of([]);
      }),
    );
  }

  updateAcuerdoComercial(id: string, data: Partial<AcuerdoComercial>) {
    return this.http.put<AcuerdoComercial>(`${this.API}/acuerdos-comerciales/${id}`, data).pipe(
      catchError((err) => {
        console.error('Error actualizando acuerdo:', err);
        return of(null as unknown as AcuerdoComercial);
      }),
    );
  }

  deleteAcuerdoComercial(id: string) {
    return this.http.delete(`${this.API}/acuerdos-comerciales/${id}`).pipe(
      catchError((err) => {
        console.error('Error eliminando acuerdo:', err);
        return of(null);
      }),
    );
  }

  getReporteRotacion() {
    return this.http.get<ReporteRotacion[]>(`${this.API}/reportes/rotacion`).pipe(
      catchError((err) => {
        console.error('Error cargando reporte rotación:', err);
        return of([]);
      }),
    );
  }
}
