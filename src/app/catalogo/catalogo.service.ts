import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Producto que sellhub (EscolaresPRO) publica con "Ver en web". */
export interface ProductoCatalogo {
  codigo: string;
  nombre: string;
  descripcion: string;
  categorias: string[];
  etiquetas: string[];
  /** Precio Detal en USD con IVA; null si no tiene precio cargado. */
  precioUsd: number | null;
  disponible: boolean;
  imagen: string | null;
}

export interface RespuestaCatalogo {
  /** Tasa BCV para mostrar el equivalente en Bs; null si no se pudo obtener. */
  tasa: number | null;
  productos: ProductoCatalogo[];
}

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private http = inject(HttpClient);

  obtener(): Observable<RespuestaCatalogo> {
    return this.http.get<RespuestaCatalogo>(`${environment.apiUrl}/catalogo-web/productos`);
  }
}
