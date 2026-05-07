import { Component, signal, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface Gasto {
  _id?: any;
  descripcion: string;
  monto: number;
  categoria: string;
  fecha: Date;
  notas?: string;
}

@Component({
  selector: 'app-gastos',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './gastos.html',
  styleUrl: './gastos.css',
})
export class Gastos implements OnInit {
  private http = inject(HttpClient);

  private readonly API_GASTOS = '/api/gastos';

  gastos = signal<Gasto[]>([]);
  loading = signal(false);
  saving = signal(false);

  showModal = signal(false);
  editingGasto: Gasto | null = null;

  newGasto = signal<Gasto>({
    descripcion: '',
    monto: 0,
    categoria: '',
    fecha: new Date(),
    notas: '',
  });

  categorias = ['Operativo', 'Administrativo', 'Inventario', 'Transporte', 'Servicios', 'Otros'];

  filtros = signal({
    categoria: '',
    fechaDesde: '',
    fechaHasta: '',
  });

  totales = signal({
    total: 0,
    porCategoria: {} as Record<string, number>,
  });

  ngOnInit() {
    this.loadGastos();
  }

  loadGastos() {
    this.loading.set(true);
    this.http.get<Gasto[]>(this.API_GASTOS).subscribe({
      next: (data) => {
        this.gastos.set(data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
        this.calcularTotales();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading gastos:', err);
        this.loading.set(false);
      },
    });
  }

  calcularTotales() {
    const filtered = this.getGastosFiltrados();
    let total = 0;
    const porCategoria: Record<string, number> = {};

    filtered.forEach((g) => {
      total += g.monto;
      porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto;
    });

    this.totales.set({ total, porCategoria });
  }

  getGastosFiltrados(): Gasto[] {
    const f = this.filtros();
    return this.gastos().filter((g) => {
      let passes = true;
      if (f.categoria) {
        passes = passes && g.categoria === f.categoria;
      }
      if (f.fechaDesde) {
        passes = passes && new Date(g.fecha) >= new Date(f.fechaDesde);
      }
      if (f.fechaHasta) {
        passes = passes && new Date(g.fecha) <= new Date(f.fechaHasta + 'T23:59:59');
      }
      return passes;
    });
  }

  filtrarGastos() {
    this.calcularTotales();
  }

  abrirModal(gasto?: Gasto) {
    if (gasto) {
      this.editingGasto = { ...gasto };
    } else {
      this.editingGasto = {
        descripcion: '',
        monto: 0,
        categoria: '',
        fecha: new Date(),
        notas: '',
      };
    }
    this.showModal.set(true);
  }

  cerrarModal() {
    this.showModal.set(false);
    this.editingGasto = null;
  }

  guardarGasto() {
    if (!this.editingGasto) return;

    if (!this.editingGasto.descripcion.trim() || !this.editingGasto.categoria || this.editingGasto.monto <= 0) {
      alert('Por favor, complete todos los campos requeridos');
      return;
    }

    this.saving.set(true);

    if (this.editingGasto._id) {
      this.http
        .put(`${this.API_GASTOS}/${this.editingGasto._id}`, this.editingGasto)
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.cerrarModal();
            this.loadGastos();
          },
          error: (err) => {
            console.error('Error updating gasto:', err);
            this.saving.set(false);
          },
        });
    } else {
      this.http.post(this.API_GASTOS, this.editingGasto).subscribe({
        next: () => {
          this.saving.set(false);
          this.cerrarModal();
          this.loadGastos();
        },
        error: (err) => {
          console.error('Error creating gasto:', err);
          this.saving.set(false);
        },
      });
    }
  }

  eliminarGasto(id: any) {
    if (!confirm('¿Está seguro de eliminar este gasto?')) return;

    this.http.delete(`${this.API_GASTOS}/${id}`).subscribe({
      next: () => this.loadGastos(),
      error: (err) => console.error('Error deleting gasto:', err),
    });
  }

  formatMonto(monto: number): string {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
    }).format(monto);
  }

  formatFecha(fecha: Date | string): string {
    return new Date(fecha).toLocaleDateString('es-VE');
  }
}