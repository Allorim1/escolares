import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface Cliente {
  _id?: string;
  nombre: string;
  plantas: string[];
}

interface Abono {
  _id?: string;
  fecha: string;
  nombre: string;
  empresa?: string;
  planta: string;
  cedula: string;
  telefono: string;
  nFact: string;
  montoFactura?: number;
  iva?: number;
  diferencia?: number;
  tasa?: number;
  divisa?: number;
  status: string;
}

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css',
})
export class Clientes implements OnInit {
  private http = inject(HttpClient);
  private readonly API = '/api/empresas';
  private readonly API_ABONOS = '/api/abonos-polar';

  clientes = signal<Cliente[]>([]);
  busqueda = signal('');
  clientesFiltrados = computed(() => {
    const termino = this.busqueda().toLowerCase().trim();
    if (!termino) return this.clientes();
    return this.clientes().filter(c => c.nombre.toLowerCase().includes(termino));
  });
  loading = signal(false);
  showModal = signal(false);
  editingCliente: Cliente | null = null;
  nuevaPlanta = signal('');
  saving = signal(false);
  private router = inject(Router);

  showModalDetalle = signal(false);
  selectedCliente: Cliente | null = null;
  abonos = signal<Abono[]>([]);
  abonosLoading = signal(false);
  detalleTab = signal(false);
  nuevaPlantaDetalle = '';
  relacionesFiltradas = computed(() => {
    if (!this.selectedCliente) return [];
    const nombre = this.selectedCliente.nombre;
    return this.abonos().filter(a => a.empresa === nombre);
  });

  ngOnInit() {
    this.loadClientes();
  }

  loadClientes() {
    this.loading.set(true);
    this.http.get<Cliente[]>(this.API).subscribe({
      next: (data) => {
        this.clientes.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading clientes:', err);
        this.loading.set(false);
      },
    });
  }

  abrirModal(cliente?: Cliente) {
    if (cliente) {
      this.editingCliente = { ...cliente, plantas: [...cliente.plantas] };
    } else {
      this.editingCliente = { nombre: '', plantas: [] };
    }
    this.showModal.set(true);
  }

  abrirModalDetalle(cliente: Cliente) {
    this.selectedCliente = { ...cliente, plantas: [...cliente.plantas] };
    this.showModalDetalle.set(true);
    this.cargarAbonos(cliente);
  }

  cargarAbonos(cliente: Cliente) {
    this.abonosLoading.set(true);
    this.http.get<Abono[]>(`${this.API_ABONOS}?empresa=${encodeURIComponent(cliente.nombre)}`).subscribe({
      next: (data) => {
        this.abonos.set(data);
        this.abonosLoading.set(false);
      },
      error: () => {
        this.http.get<Abono[]>(this.API_ABONOS).subscribe({
          next: (data) => {
            this.abonos.set(data);
            this.abonosLoading.set(false);
          },
          error: (err) => {
            console.error('Error loading abonos:', err);
            this.abonos.set([]);
            this.abonosLoading.set(false);
          },
        });
      },
    });
  }

  cerrarModalDetalle() {
    this.showModalDetalle.set(false);
    this.selectedCliente = null;
    this.abonos.set([]);
  }

  cerrarModal() {
    this.showModal.set(false);
    this.editingCliente = null;
    this.nuevaPlanta.set('');
  }

  agregarPlanta() {
    if (!this.editingCliente) return;
    const planta = this.nuevaPlanta().trim();
    if (!planta) return;
    if (this.editingCliente.plantas.includes(planta)) return;
    this.editingCliente.plantas = [...this.editingCliente.plantas, planta];
    this.nuevaPlanta.set('');
  }

  eliminarPlanta(planta: string) {
    if (!this.editingCliente) return;
    this.editingCliente.plantas = this.editingCliente.plantas.filter((p) => p !== planta);
  }

  eliminarPlantaDetalle(planta: string) {
    if (!this.selectedCliente) return;
    this.selectedCliente.plantas = this.selectedCliente.plantas.filter((p) => p !== planta);
  }

  agregarPlantaDetalle() {
    if (!this.selectedCliente) return;
    const planta = this.nuevaPlantaDetalle.trim();
    if (!planta) return;
    if (this.selectedCliente.plantas.includes(planta)) return;
    this.selectedCliente.plantas = [...this.selectedCliente.plantas, planta];
    this.nuevaPlantaDetalle = '';
  }

  guardarDetalle() {
    if (!this.selectedCliente || !this.selectedCliente._id) return;
    if (!this.selectedCliente.nombre.trim()) {
      alert('El nombre del cliente es requerido');
      return;
    }

    this.saving.set(true);
    this.http.put(`${this.API}/${this.selectedCliente._id}`, this.selectedCliente).subscribe({
      next: () => {
        this.saving.set(false);
        this.loadClientes();
      },
      error: (err) => {
        console.error('Error updating cliente:', err);
        this.saving.set(false);
      },
    });
  }

  guardarCliente() {
    if (!this.editingCliente) return;
    if (!this.editingCliente.nombre.trim()) {
      alert('El nombre del cliente es requerido');
      return;
    }

    this.saving.set(true);
    if (this.editingCliente._id) {
      this.http.put(`${this.API}/${this.editingCliente._id}`, this.editingCliente).subscribe({
        next: () => {
          this.saving.set(false);
          this.cerrarModal();
          this.loadClientes();
        },
        error: (err) => {
          console.error('Error updating cliente:', err);
          this.saving.set(false);
        },
      });
    } else {
      this.http.post<Cliente>(this.API, this.editingCliente).subscribe({
        next: (res: Cliente) => {
          this.saving.set(false);
          this.cerrarModal();
          this.clientes.update(clientes => [...clientes, res]);
        },
        error: (err) => {
          console.error('Error creating cliente:', err);
          this.saving.set(false);
        },
      });
    }
  }

  eliminarCliente(id: string) {
    if (!confirm('¿Está seguro de eliminar este cliente?')) return;
    this.http.delete(`${this.API}/${id}`).subscribe({
      next: () => {
        if (this.selectedCliente && this.selectedCliente._id === id) {
          this.cerrarModalDetalle();
        }
        this.loadClientes();
      },
      error: (err) => console.error('Error deleting cliente:', err),
    });
  }

  verHistorialCompras() {
    this.router.navigate(['/admin/historico-costos']);
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
}
