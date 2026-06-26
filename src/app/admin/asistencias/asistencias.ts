import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Empleado {
  _id?: any;
  nombre: string;
  cedula: string;
  cargo: string;
}

interface Asistencia {
  _id?: any;
  empleadoId: any;
  empleadoNombre?: string;
  fecha: Date;
  tipo: 'entrada' | 'salida';
  hora?: string;
  justificacion?: string;
}

@Component({
  selector: 'app-asistencias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asistencias.html',
  styleUrl: './asistencias.css',
})
export class Asistencias implements OnInit {
  private http = inject(HttpClient);

  private readonly API_EMPLEADOS = '/api/nomina/empleados';
  private readonly API_ASISTENCIAS = '/api/asistencias';

  empleados = signal<Empleado[]>([]);
  asistencias = signal<Asistencia[]>([]);
  loading = signal(false);
  saving = signal(false);

  showModal = signal(false);
  editingAsistencia: Asistencia | null = null;

  filtroEmpleadoId = '';
  filtroFecha = '';

  nuevaAsistencia = signal<Partial<Asistencia>>({
    empleadoId: '',
    tipo: 'entrada',
    fecha: new Date(),
    hora: '',
    justificacion: '',
  });

  tiposAsistencia: ('entrada' | 'salida')[] = ['entrada', 'salida'];

  ngOnInit() {
    this.loadEmpleados();
    this.loadAsistencias();
  }

interface Asistencia {
  _id?: any;
  empleadoId: any;
  empleadoNombre?: string;
  fecha: Date;
  tipo: 'entrada' | 'salida';
  hora?: string;
  justificacion?: string;
}

@Component({
  selector: 'app-asistencias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asistencias.html',
  styleUrl: './asistencias.css',
})
export class Asistencias implements OnInit {
  private http = inject(HttpClient);

  private readonly API_EMPLEADOS = '/api/nomina/empleados';
  private readonly API_ASISTENCIAS = '/api/asistencias';

  empleados = signal<Empleado[]>([]);
  asistencias = signal<Asistencia[]>([]);
  loading = signal(false);
  saving = signal(false);

  showModal = signal(false);
  editingAsistencia: Asistencia | null = null;

  filtroEmpleadoId = '';
  filtroFecha = '';

  nuevaAsistencia = signal<Partial<Asistencia>>({
    empleadoId: '',
    tipo: 'entrada',
    fecha: new Date(),
    hora: '',
    justificacion: '',
  });

  tiposAsistencia: ('entrada' | 'salida')[] = ['entrada', 'salida'];

  ngOnInit() {
    this.loadEmpleados();
    this.loadAsistencias();
  }

  loadEmpleados() {
    this.http.get<Empleado[]>(this.API_EMPLEADOS).subscribe({
      next: (data) => this.empleados.set(data.sort((a, b) => a.nombre.localeCompare(b.nombre))),
      error: (err) => console.error('Error loading empleados:', err),
    });
  }

  loadAsistencias() {
    this.loading.set(true);
    this.http.get<Asistencia[]>(this.API_ASISTENCIAS).subscribe({
      next: (data) => {
        this.asistencias.set(data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading asistencias:', err);
        this.loading.set(false);
      },
    });
  }

  get asistenciasFiltradas() {
    return this.asistencias().filter((a) => {
      if (this.filtroEmpleadoId && String(a.empleadoId) !== this.filtroEmpleadoId) {
        return false;
      }
      if (this.filtroFecha) {
        const fechaAsistencia = new Date(a.fecha).toISOString().split('T')[0];
        if (fechaAsistencia !== this.filtroFecha) {
          return false;
        }
      }
      return true;
    });
  }

  get empleadosConAsistenciaHoy() {
    const hoy = new Date().toISOString().split('T')[0];
    const idsConEntrada = new Set(
      this.asistencias()
        .filter((a) => a.tipo === 'entrada' && new Date(a.fecha).toISOString().split('T')[0] === hoy)
        .map((a) => String(a.empleadoId))
    );
    return this.empleados().filter((e) => idsConEntrada.has(String(e._id)));
  }

  abrirModal(asistencia?: Asistencia) {
    if (asistencia) {
      this.editingAsistencia = { ...asistencia };
      if (asistencia.fecha && !(asistencia.fecha instanceof Date)) {
        this.editingAsistencia.fecha = new Date(asistencia.fecha);
      }
    } else {
      this.editingAsistencia = {
        empleadoId: '',
        empleadoNombre: '',
        tipo: 'entrada',
        fecha: new Date(),
        hora: '',
        justificacion: '',
      };
    }
    this.showModal.set(true);
  }

  cerrarModal() {
    this.showModal.set(false);
    this.editingAsistencia = null;
  }

  guardarAsistencia() {
    if (!this.editingAsistencia) return;

    if (!this.editingAsistencia.empleadoId) {
      alert('Por favor, seleccione un empleado');
      return;
    }

    this.saving.set(true);

    const emp = this.empleados().find((e) => String(e._id) === String(this.editingAsistencia!.empleadoId));
    if (emp) {
      this.editingAsistencia.empleadoNombre = emp.nombre;
    }

    if (this.editingAsistencia._id) {
      this.http
        .put(`${this.API_ASISTENCIAS}/${this.editingAsistencia._id}`, this.editingAsistencia)
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.cerrarModal();
            this.loadAsistencias();
          },
          error: (err) => {
            console.error('Error updating asistencia:', err);
            this.saving.set(false);
          },
        });
    } else {
      this.http.post(this.API_ASISTENCIAS, this.editingAsistencia).subscribe({
        next: () => {
          this.saving.set(false);
          this.cerrarModal();
          this.loadAsistencias();
        },
        error: (err) => {
          console.error('Error creating asistencia:', err);
          this.saving.set(false);
        },
      });
    }
  }

registrarAsistenciaRapida(empleadoId: any, tipo: 'entrada' | 'salida') {
    const emp = this.empleados().find((e) => String(e._id) === String(empleadoId));
    if (!emp) return;

    const ahora = new Date();
    const hora = ahora.toTimeString().split(':').slice(0, 2).join(':');

    const asistencia: Partial<Asistencia> = {
      empleadoId: emp._id,
      empleadoNombre: emp.nombre,
      tipo,
      fecha: ahora,
      hora,
    };

    this.http.post(this.API_ASISTENCIAS, asistencia).subscribe({
      next: () => this.loadAsistencias(),
      error: (err) => console.error('Error registering asistencia:', err),
    });
  }

  eliminarAsistencia(id: any) {
    if (!confirm('¿Está seguro de eliminar este registro de asistencia?')) return;

    this.http.delete(`${this.API_ASISTENCIAS}/${id}`).subscribe({
      next: () => this.loadAsistencias(),
      error: (err) => console.error('Error deleting asistencia:', err),
    });
  }

  formatFecha(fecha: Date | string): string {
    return new Date(fecha).toLocaleDateString('es-VE');
  }

  formatHora(hora: string): string {
    return hora || '-';
  }

  getNombreEmpleado(empleadoId: any): string {
    const emp = this.empleados().find((e) => String(e._id) === String(empleadoId));
    return emp?.nombre || '-';
  }

  formatFechaInput(fecha: Date | string | undefined): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toISOString().split('T')[0];
  }

  getTotalAsistencias(): number {
    return this.asistenciasFiltradas.length;
  }

  getAsistenciasPorEmpleado(empleadoId: any): number {
    return this.asistencias().filter((a) => String(a.empleadoId) === String(empleadoId)).length;
  }
}