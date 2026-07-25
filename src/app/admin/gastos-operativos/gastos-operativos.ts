import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface GastoOperativo {
  _id?: string;
  nombre: string;
  descripcion?: string;
  monto: number;
  frecuencia: 'semanal' | 'quincenal' | 'mensual' | 'unico';
  fechaInicio: string;
  fechaProximoPago?: string;
  pagado: boolean;
  categoria?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-gastos-operativos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gastos-operativos.html',
  styleUrl: './gastos-operativos.css',
})
export class GastosOperativos implements OnInit {
  private http = inject(HttpClient);
  private readonly API = '/api/gastos-operativos';

  gastos = signal<GastoOperativo[]>([]);
  loading = signal(false);
  saving = signal(false);

  showModal = signal(false);
  editingGasto: GastoOperativo | null = null;

  filtros = signal({
    estado: 'todos',
    categoria: '',
  });

  categoriasFiltradas = signal<string[]>([]);

  ngOnInit() {
    this.loadGastos();
  }

  loadGastos() {
    this.loading.set(true);
    this.http.get<GastoOperativo[]>(this.API).subscribe({
      next: (data) => {
        this.gastos.set(data);
        this.loading.set(false);
        this.actualizarCategorias();
      },
      error: (err) => {
        console.error('Error cargando gastos operativos:', err);
        this.loading.set(false);
      },
    });
  }

  private actualizarCategorias() {
    const cats = new Set(this.gastos().map(g => g.categoria).filter((c): c is string => Boolean(c)));
    this.categoriasFiltradas.set(Array.from(cats));
  }

  onEstadoChange(estado: string) {
    this.filtros.update(f => ({ ...f, estado }));
  }

  onCategoriaChange(categoria: string) {
    this.filtros.update(f => ({ ...f, categoria }));
  }

  togglePagado(gasto: GastoOperativo) {
    const nuevoEstado = !gasto.pagado;
    this.http.put(`${this.API}/${gasto._id}`, { ...gasto, pagado: nuevoEstado }).subscribe({
      next: () => {
        this.loadGastos();
      },
      error: (err) => {
        console.error('Error actualizando estado:', err);
      },
    });
  }

  gastosFiltrados = computed(() => {
    const f = this.filtros();
    const lista = this.gastos();
    return lista.filter(g => {
      if (f.estado === 'pendientes') return !g.pagado;
      if (f.estado === 'pagados') return g.pagado;
      return true;
    });
  });

  totalFiltrado = computed(() => {
    return this.gastosFiltrados().reduce((sum, g) => sum + (g.monto || 0), 0);
  });

  abrirModal(gasto?: GastoOperativo) {
    if (gasto) {
      this.editingGasto = {
        ...gasto,
        fechaInicio: gasto.fechaInicio ? new Date(gasto.fechaInicio).toISOString().split('T')[0] : '',
        fechaProximoPago: gasto.fechaProximoPago ? new Date(gasto.fechaProximoPago).toISOString().split('T')[0] : '',
      };
    } else {
      this.editingGasto = {
        nombre: '',
        descripcion: '',
        monto: 0,
        frecuencia: 'mensual',
        fechaInicio: new Date().toISOString().split('T')[0],
        fechaProximoPago: new Date().toISOString().split('T')[0],
        pagado: false,
        categoria: '',
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
    if (!this.editingGasto.nombre || !this.editingGasto.monto || !this.editingGasto.frecuencia || !this.editingGasto.fechaInicio) {
      alert('Complete los campos requeridos: Nombre, Monto, Frecuencia y Fecha de Inicio');
      return;
    }
    this.saving.set(true);
    if (this.editingGasto._id) {
      this.http.put(`${this.API}/${this.editingGasto._id}`, this.editingGasto).subscribe({
        next: () => {
          this.saving.set(false);
          this.cerrarModal();
          this.loadGastos();
        },
        error: (err) => {
          console.error('Error actualizando gasto:', err);
          this.saving.set(false);
        },
      });
    } else {
      this.http.post(this.API, this.editingGasto).subscribe({
        next: () => {
          this.saving.set(false);
          this.cerrarModal();
          this.loadGastos();
        },
        error: (err) => {
          console.error('Error creando gasto:', err);
          this.saving.set(false);
        },
      });
    }
  }

  pagarGasto(gasto: GastoOperativo) {
    if (!confirm(`¿Marcar pago para "${gasto.nombre}"?`)) return;
    this.http.put(`${this.API}/${gasto._id}/pagar`, {}).subscribe({
      next: () => {
        this.loadGastos();
      },
      error: (err) => {
        console.error('Error pagando gasto:', err);
        alert('Error al procesar pago');
      },
    });
  }

  eliminarGasto(id: string) {
    if (!confirm('¿Está seguro de eliminar este gasto operativo?')) return;
    this.http.delete(`${this.API}/${id}`).subscribe({
      next: () => this.loadGastos(),
      error: (err) => console.error('Error eliminando gasto:', err),
    });
  }

  formatFecha(fecha: string): string {
    const date = new Date(fecha);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const anio = date.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  formatMonto(monto: number): string {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
    }).format(monto);
  }

  getFrecuenciaLabel(frecuencia: string): string {
    const labels: Record<string, string> = {
      semanal: 'Semanal',
      quincenal: 'Quincenal',
      mensual: 'Mensual',
      unico: 'Único',
    };
    return labels[frecuencia] || frecuencia;
  }

  trackByGastoId(index: number, gasto: GastoOperativo) {
    return gasto._id || index;
  }
}
