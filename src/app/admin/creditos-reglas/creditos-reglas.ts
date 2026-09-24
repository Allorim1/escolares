import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Reglas {
  nivelBase: number;
  factorNivel: number;
  nivelMaximo: number;
  cuotas: number;
  diasEntreCuotas: number;
  tasaQuincenal: number;
  ivaTasa: number;
  montoMinimo: number;
  nombresNiveles?: string[];
  cuotasParaNivel?: number[];
}

@Component({
  selector: 'app-creditos-reglas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creditos-reglas.html',
  styleUrl: './creditos-reglas.css',
})
export class CreditosReglas implements OnInit {
  private http = inject(HttpClient);
  private readonly API = '/api/creditos/admin/reglas';

  reglas = signal<Reglas | null>(null);
  loading = signal(false);
  saving = signal(false);
  guardado = signal(false);

  // Porcentajes editados como número entero (ej. 16), se convierten a fracción al guardar
  ivaPorcentaje = 0;
  tasaPorcentaje = 0;

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.loading.set(true);
    this.http.get<Reglas>(this.API).subscribe({
      next: (data) => {
        this.reglas.set(data);
        this.ivaPorcentaje = Math.round(data.ivaTasa * 1000) / 10;
        this.tasaPorcentaje = Math.round(data.tasaQuincenal * 1000) / 10;
        this.loading.set(false);
      },
      error: (err) => { console.error('Error cargando reglas:', err); this.loading.set(false); },
    });
  }

  niveles(): { nivel: number; limite: number }[] {
    const r = this.reglas();
    if (!r) return [];
    return Array.from({ length: r.nivelMaximo }, (_, i) => ({
      nivel: i + 1,
      limite: Math.round(r.nivelBase * Math.pow(r.factorNivel, i) * 100) / 100,
    }));
  }

  nombreNivel(nivel: number): string {
    return this.reglas()?.nombresNiveles?.[nivel - 1] ?? '';
  }

  setNombreNivel(nivel: number, valor: string) {
    const r = this.reglas();
    if (!r) return;
    const nombres = [...(r.nombresNiveles ?? [])];
    while (nombres.length < nivel) nombres.push('');
    nombres[nivel - 1] = valor;
    this.reglas.set({ ...r, nombresNiveles: nombres });
  }

  /** Cuotas que hay que pagar, estando en el nivel anterior, para llegar a este nivel.
   *  El nivel 1 es el punto de partida: no tiene requisito. */
  cuotasParaNivel(nivel: number): number | null {
    if (nivel <= 1) return null;
    return this.reglas()?.cuotasParaNivel?.[nivel - 2] ?? 0;
  }

  setCuotasParaNivel(nivel: number, valor: number) {
    const r = this.reglas();
    if (!r || nivel <= 1) return;
    const cuotas = [...(r.cuotasParaNivel ?? [])];
    while (cuotas.length < nivel - 1) cuotas.push(0);
    cuotas[nivel - 2] = valor;
    this.reglas.set({ ...r, cuotasParaNivel: cuotas });
  }

  guardar() {
    const r = this.reglas();
    if (!r) return;
    this.saving.set(true);
    this.guardado.set(false);
    const payload = { ...r, ivaTasa: this.ivaPorcentaje / 100, tasaQuincenal: this.tasaPorcentaje / 100 };
    this.http.put<Reglas>(this.API, payload).subscribe({
      next: (data) => {
        this.reglas.set(data);
        this.saving.set(false);
        this.guardado.set(true);
      },
      error: (err) => { this.saving.set(false); alert(err.error?.error || 'Error al guardar'); },
    });
  }
}
