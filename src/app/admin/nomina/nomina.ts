import { Component, signal, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface Empleado {
  _id?: any;
  nombre: string;
  cedula: string;
  cargo: string;
  salario: number;
  fechaIngreso: Date;
  notas?: string;
}

interface Pago {
  _id?: any;
  empleadoId: any;
  empleadoNombre: string;
  monto: number;
  fecha: Date;
  tipo: 'quincena' | 'mes' | 'bono' | 'prestamo' | 'otro';
  notas?: string;
}

@Component({
  selector: 'app-nomina',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './nomina.html',
  styleUrl: './nomina.css',
})
export class Nomina implements OnInit {
  private http = inject(HttpClient);

  private readonly API_EMPLEADOS = '/api/nomina/empleados';
  private readonly API_PAGOS = '/api/nomina/pagos';

  empleados = signal<Empleado[]>([]);
  pagos = signal<Pago[]>([]);
  loading = signal(false);
  saving = signal(false);

  showModalEmpleado = signal(false);
  showModalPago = signal(false);
  editingEmpleado: Empleado | null = null;
  editingPago: Pago | null = null;

  newEmpleado = signal<Empleado>({
    nombre: '',
    cedula: '',
    cargo: '',
    salario: 0,
    fechaIngreso: new Date(),
    notas: '',
  });

  newPago = signal<Pago>({
    empleadoId: '',
    empleadoNombre: '',
    monto: 0,
    fecha: new Date(),
    tipo: 'quincena',
    notas: '',
  });

  tiposPago = ['quincena', 'mes', 'bono', 'prestamo', 'otro'];

  filtros = signal({
    empleadoId: '',
    tipo: '',
    fechaDesde: '',
    fechaHasta: '',
  });

  totales = signal({
    total: 0,
    porTipo: {} as Record<string, number>,
  });

  ngOnInit() {
    this.loadEmpleados();
    this.loadPagos();
  }

  loadEmpleados() {
    this.http.get<Empleado[]>(this.API_EMPLEADOS).subscribe({
      next: (data) => this.empleados.set(data.sort((a, b) => a.nombre.localeCompare(b.nombre))),
      error: (err) => console.error('Error loading empleados:', err),
    });
  }

  loadPagos() {
    this.loading.set(true);
    this.http.get<Pago[]>(this.API_PAGOS).subscribe({
      next: (data) => {
        this.pagos.set(data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
        this.calcularTotales();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading pagos:', err);
        this.loading.set(false);
      },
    });
  }

  calcularTotales() {
    const filtered = this.getPagosFiltrados();
    let total = 0;
    const porTipo: Record<string, number> = {};

    filtered.forEach((p) => {
      total += p.monto;
      porTipo[p.tipo] = (porTipo[p.tipo] || 0) + p.monto;
    });

    this.totales.set({ total, porTipo });
  }

  getPagosFiltrados(): Pago[] {
    const f = this.filtros();
    return this.pagos().filter((p) => {
      let passes = true;
      if (f.empleadoId) {
        passes = passes && String(p.empleadoId) === f.empleadoId;
      }
      if (f.tipo) {
        passes = passes && p.tipo === f.tipo;
      }
      if (f.fechaDesde) {
        passes = passes && new Date(p.fecha) >= new Date(f.fechaDesde);
      }
      if (f.fechaHasta) {
        passes = passes && new Date(p.fecha) <= new Date(f.fechaHasta + 'T23:59:59');
      }
      return passes;
    });
  }

  filtrarPagos() {
    this.calcularTotales();
  }

  abrirModalEmpleado(empleado?: Empleado) {
    if (empleado) {
      this.editingEmpleado = { ...empleado };
    } else {
      this.editingEmpleado = {
        nombre: '',
        cedula: '',
        cargo: '',
        salario: 0,
        fechaIngreso: new Date(),
        notas: '',
      };
    }
    this.showModalEmpleado.set(true);
  }

  cerrarModalEmpleado() {
    this.showModalEmpleado.set(false);
    this.editingEmpleado = null;
  }

  guardarEmpleado() {
    if (!this.editingEmpleado) return;

    if (!this.editingEmpleado.nombre.trim() || !this.editingEmpleado.cedula.trim()) {
      alert('Por favor, complete nombre y cédula');
      return;
    }

    this.saving.set(true);

    if (this.editingEmpleado._id) {
      this.http
        .put(`${this.API_EMPLEADOS}/${this.editingEmpleado._id}`, this.editingEmpleado)
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.cerrarModalEmpleado();
            this.loadEmpleados();
          },
          error: (err) => {
            console.error('Error updating empleado:', err);
            this.saving.set(false);
          },
        });
    } else {
      this.http.post(this.API_EMPLEADOS, this.editingEmpleado).subscribe({
        next: () => {
          this.saving.set(false);
          this.cerrarModalEmpleado();
          this.loadEmpleados();
        },
        error: (err) => {
          console.error('Error creating empleado:', err);
          this.saving.set(false);
        },
      });
    }
  }

  eliminarEmpleado(id: any) {
    if (!confirm('¿Está seguro de eliminar este empleado?')) return;

    this.http.delete(`${this.API_EMPLEADOS}/${id}`).subscribe({
      next: () => this.loadEmpleados(),
      error: (err) => console.error('Error deleting empleado:', err),
    });
  }

  abrirModalPago(pago?: Pago) {
    if (pago) {
      this.editingPago = { ...pago };
    } else {
      this.editingPago = {
        empleadoId: '',
        empleadoNombre: '',
        monto: 0,
        fecha: new Date(),
        tipo: 'quincena',
        notas: '',
      };
    }
    this.showModalPago.set(true);
  }

  cerrarModalPago() {
    this.showModalPago.set(false);
    this.editingPago = null;
  }

  onEmpleadoChange(empleadoId: string) {
    const emp = this.empleados().find((e) => String(e._id) === empleadoId);
    if (this.editingPago && emp) {
      this.editingPago.empleadoNombre = emp.nombre;
    }
  }

  guardarPago() {
    if (!this.editingPago) return;

    if (!this.editingPago.empleadoId || !this.editingPago.monto) {
      alert('Por favor, seleccione empleado e ingrese monto');
      return;
    }

    const emp = this.empleados().find((e) => String(e._id) === String(this.editingPago!.empleadoId));
    if (emp) {
      this.editingPago.empleadoNombre = emp.nombre;
    }

    this.saving.set(true);

    if (this.editingPago._id) {
      this.http
        .put(`${this.API_PAGOS}/${this.editingPago._id}`, this.editingPago)
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.cerrarModalPago();
            this.loadPagos();
          },
          error: (err) => {
            console.error('Error updating pago:', err);
            this.saving.set(false);
          },
        });
    } else {
      this.http.post(this.API_PAGOS, this.editingPago).subscribe({
        next: () => {
          this.saving.set(false);
          this.cerrarModalPago();
          this.loadPagos();
        },
        error: (err) => {
          console.error('Error creating pago:', err);
          this.saving.set(false);
        },
      });
    }
  }

  eliminarPago(id: any) {
    if (!confirm('¿Está seguro de eliminar este pago?')) return;

    this.http.delete(`${this.API_PAGOS}/${id}`).subscribe({
      next: () => this.loadPagos(),
      error: (err) => console.error('Error deleting pago:', err),
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

  getNombreEmpleado(empleadoId: any): string {
    const emp = this.empleados().find((e) => String(e._id) === String(empleadoId));
    return emp?.nombre || '-';
  }
}