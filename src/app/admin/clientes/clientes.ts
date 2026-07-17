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

  showModalAbono = signal(false);
  editingAbono: Abono | null = null;

  relFiltroPlanta = signal('');
  relFiltroDesde = signal('');
  relFiltroHasta = signal('');

  plantasCliente = computed(() => {
    return this.selectedCliente?.plantas ?? [];
  });

  relacionesFiltradas = computed(() => {
    if (!this.selectedCliente) return [];
    const nombre = this.selectedCliente.nombre;
    const planta = this.relFiltroPlanta();
    const desde = this.relFiltroDesde();
    const hasta = this.relFiltroHasta();

    return this.abonos().filter(a => {
      if (a.empresa !== nombre) return false;
      if (planta && a.planta !== planta) return false;
      if (desde && new Date(a.fecha) < new Date(desde)) return false;
      if (hasta && new Date(a.fecha) > new Date(hasta + 'T23:59:59')) return false;
      return true;
    });
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

  abrirModalDetalle(cliente: Cliente) {
    this.selectedCliente = { ...cliente, plantas: [...cliente.plantas] };
    this.showModalDetalle.set(true);
    this.detalleTab.set(false);
    this.relFiltroPlanta.set('');
    this.relFiltroDesde.set('');
    this.relFiltroHasta.set('');
    this.cargarAbonos(cliente);
  }

  cargarAbonos(cliente: Cliente) {
    this.abonosLoading.set(true);
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
  }

  cerrarModalDetalle() {
    this.showModalDetalle.set(false);
    this.selectedCliente = null;
    this.abonos.set([]);
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

  abrirModalAbono(abono?: Abono) {
    if (!this.selectedCliente) return;
    if (abono) {
      this.editingAbono = {
        ...abono,
        fecha: abono.fecha ? new Date(abono.fecha).toISOString().split('T')[0] : '',
        montoFactura: abono.montoFactura ?? 0,
        iva: abono.iva ?? 0,
        diferencia: abono.diferencia ?? 0,
        tasa: abono.tasa ?? 0,
        divisa: abono.divisa ?? 0,
      };
    } else {
      this.editingAbono = {
        fecha: new Date().toISOString().split('T')[0],
        nombre: '',
        empresa: this.selectedCliente.nombre,
        planta: '',
        cedula: '',
        telefono: '',
        nFact: '',
        montoFactura: 0,
        iva: 0,
        diferencia: 0,
        tasa: 0,
        divisa: 0,
        status: '',
      };
    }
    this.showModalAbono.set(true);
  }

  cerrarModalAbono() {
    this.showModalAbono.set(false);
    this.editingAbono = null;
  }

  guardarAbono() {
    if (!this.editingAbono) return;
    if (!this.editingAbono.nombre.trim() || !this.editingAbono.empresa || !this.editingAbono.planta || !this.editingAbono.nFact) {
      alert('Por favor, complete los campos requeridos: Nombre, Empresa, Planta y N. Fact');
      return;
    }

    this.saving.set(true);
    if (this.editingAbono._id) {
      this.http.put<Abono>(`${this.API_ABONOS}/${this.editingAbono._id}`, this.editingAbono).subscribe({
        next: (abonoActualizado) => {
          this.saving.set(false);
          this.cerrarModalAbono();
          if (abonoActualizado && abonoActualizado._id) {
            this.abonos.update((lista) => {
              const index = lista.findIndex((a) => a._id === abonoActualizado._id);
              if (index >= 0) {
                lista[index] = abonoActualizado;
              } else {
                lista.unshift(abonoActualizado);
              }
              return [...lista];
            });
          } else {
            this.cargarAbonos(this.selectedCliente!);
          }
        },
        error: (err) => {
          console.error('Error updating abono:', err);
          this.saving.set(false);
          this.cargarAbonos(this.selectedCliente!);
        },
      });
    } else {
      this.http.post<Abono>(this.API_ABONOS, this.editingAbono).subscribe({
        next: (abonoCreado) => {
          this.saving.set(false);
          this.cerrarModalAbono();
          if (abonoCreado && abonoCreado._id) {
            this.abonos.update((lista) => [abonoCreado, ...lista]);
          } else {
            this.cargarAbonos(this.selectedCliente!);
          }
        },
        error: (err) => {
          console.error('Error creating abono:', err);
          this.saving.set(false);
          this.cargarAbonos(this.selectedCliente!);
        },
      });
    }
  }

  eliminarAbono(id: string) {
    if (!confirm('¿Está seguro de eliminar esta relación?')) return;
    this.http.delete(`${this.API_ABONOS}/${id}`).subscribe({
      next: () => this.cargarAbonos(this.selectedCliente!),
      error: (err) => console.error('Error deleting abono:', err),
    });
  }

  formatearMontoInput(valor: number | undefined | null): string {
    const num = Number(valor) || 0;
    return num.toFixed(2).replace('.', ',');
  }

  parsearMontoInput(valor: string): number {
    const limpio = valor.replace(',', '.').replace(/\D/g, '');
    const numero = Number(limpio) || 0;
    return Number((numero / 100).toFixed(2));
  }

  onMontoFocus(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  actualizarMonto(event: Event, campo: 'montoFactura' | 'iva' | 'diferencia' | 'tasa' | 'divisa') {
    if (!this.editingAbono) return;
    const input = event.target as HTMLInputElement;
    const valor = this.parsearMontoInput(input.value);
    (this.editingAbono as any)[campo] = valor;
    input.value = this.formatearMontoInput(valor);

    if (campo === 'montoFactura' || campo === 'iva') {
      this.calcularDerivados();
    } else if (campo === 'tasa') {
      this.calcularDivisa();
    }
  }

  calcularDerivados() {
    if (!this.editingAbono) return;
    const monto = Number(this.editingAbono.montoFactura) || 0;
    const iva = Number(this.editingAbono.iva) || 0;
    this.editingAbono.diferencia = Number((monto - iva).toFixed(2));
    this.calcularDivisa();
  }

  calcularDivisa() {
    if (!this.editingAbono) return;
    const tasa = Number(this.editingAbono.tasa);
    if (tasa > 0) {
      this.editingAbono.divisa = Number(((this.editingAbono.diferencia ?? 0) / tasa).toFixed(2));
    } else {
      this.editingAbono.divisa = 0;
    }
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

  generarReportePdf() {
    alert('Función de reporte PDF en desarrollo');
  }

  generarReporteExcel() {
    alert('Función de reporte Excel en desarrollo');
  }
}
