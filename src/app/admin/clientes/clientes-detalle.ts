import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { EmpresasService } from '../../shared/data-access/empresas.service';

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
  selector: 'app-clientes-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clientes-detalle.html',
  styleUrl: './clientes-detalle.css',
})
export class ClientesDetalle implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private readonly API = '/api/empresas';
  private readonly API_ABONOS = '/api/abonos-polar';
  private empresasService = inject(EmpresasService);

  cliente = signal<Cliente | null>(null);
  clienteId = signal('');
  loading = signal(false);
  saving = signal(false);
  nuevaPlanta = signal('');
  detalleTab = signal(false);
  loadError = signal<string | null>(null);

  showModalAbono = signal(false);
  editingAbono: Abono | null = null;
  abonos = signal<Abono[]>([]);
  abonosLoading = signal(false);

  relFiltroPlanta = signal('');
  relFiltroDesde = signal('');
  relFiltroHasta = signal('');

  plantasCliente = computed(() => {
    return this.cliente()?.plantas ?? [];
  });

  relacionesFiltradas = computed(() => {
    if (!this.cliente()) return [];
    const nombre = this.cliente()!.nombre;
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
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.clienteId.set(id);
      this.loadCliente(id);
      this.cargarAbonos(id);
    }
  }

  loadCliente(id: string) {
    this.loading.set(true);
    this.loadError.set(null);
    this.http.get<Cliente>(`${this.API}/${id}`).subscribe({
      next: (data) => {
        this.cliente.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading cliente:', err);
        this.loadError.set('No se pudo cargar la información del cliente.');
        this.loading.set(false);
      },
    });
  }

  cargarAbonos(id: string) {
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

  volver() {
    this.router.navigate(['/admin/clientes']);
  }

  agregarPlanta() {
    if (!this.cliente()) return;
    const planta = this.nuevaPlanta().trim();
    if (!planta) return;
    if (this.cliente()!.plantas.includes(planta)) return;
    this.cliente.update(e => e ? { ...e, plantas: [...e.plantas, planta] } : e);
    this.nuevaPlanta.set('');
  }

  eliminarPlanta(planta: string) {
    if (!this.cliente()) return;
    this.cliente.update(e => e ? { ...e, plantas: e.plantas.filter(p => p !== planta) } : e);
  }

  actualizarNombre(valor: string) {
    if (!this.cliente()) return;
    this.cliente.update(e => e ? { ...e, nombre: valor } : e);
  }

  guardarCliente() {
    if (!this.cliente() || !this.cliente()!._id) return;
    if (!this.cliente()!.nombre.trim()) {
      alert('El nombre del cliente es requerido');
      return;
    }

    this.saving.set(true);
    this.http.put(`${this.API}/${this.cliente()!._id}`, this.cliente()).subscribe({
      next: () => {
        this.saving.set(false);
        this.loadCliente(this.cliente()!._id!);
        this.empresasService.load();
      },
      error: (err) => {
        console.error('Error updating cliente:', err);
        this.saving.set(false);
      },
    });
  }

  abrirModalAbono(abono?: Abono) {
    if (!this.cliente()) return;
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
        empresa: this.cliente()!.nombre,
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
          } else if (this.clienteId()) {
            this.cargarAbonos(this.clienteId());
          }
        },
        error: (err) => {
          console.error('Error updating abono:', err);
          this.saving.set(false);
          if (this.clienteId()) this.cargarAbonos(this.clienteId());
        },
      });
    } else {
      this.http.post<Abono>(this.API_ABONOS, this.editingAbono).subscribe({
        next: (abonoCreado) => {
          this.saving.set(false);
          this.cerrarModalAbono();
          if (abonoCreado && abonoCreado._id) {
            this.abonos.update((lista) => [abonoCreado, ...lista]);
          } else if (this.clienteId()) {
            this.cargarAbonos(this.clienteId());
          }
        },
        error: (err) => {
          console.error('Error creating abono:', err);
          this.saving.set(false);
          if (this.clienteId()) this.cargarAbonos(this.clienteId());
        },
      });
    }
  }

  eliminarAbono(id: string) {
    if (!confirm('¿Está seguro de eliminar esta relación?')) return;
    this.http.delete(`${this.API_ABONOS}/${id}`).subscribe({
      next: () => {
        if (this.clienteId()) this.cargarAbonos(this.clienteId());
      },
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
