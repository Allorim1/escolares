import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';

interface ListaNegraItem {
  _id?: string;
  cedula: string;
  nombre: string;
  telefono?: string;
  empresa?: string;
  planta?: string;
  motivo?: string;
  creadoPor?: string;
  creadoEn?: string;
}

interface ClienteRelacion {
  cedula: string;
  nombre: string;
  telefono: string;
  empresa: string;
  planta: string;
  cantidadRelaciones: number;
}

interface AbonoBasico {
  nombre?: string;
  cedula?: string;
  telefono?: string;
  empresa?: string;
  planta?: string;
}

export function normalizarCedula(cedula: unknown): string {
  return String(cedula ?? '').replace(/\D/g, '');
}

@Component({
  selector: 'app-lista-negra',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-negra.html',
  styleUrl: './lista-negra.css',
})
export class ListaNegra implements OnInit {
  private http = inject(HttpClient);
  private notificationModal = inject(NotificationModalService);
  private readonly API = '/api/lista-negra';
  private readonly API_ABONOS = '/api/abonos-polar';

  lista = signal<ListaNegraItem[]>([]);
  clientesRelaciones = signal<ClienteRelacion[]>([]);
  loading = signal(false);
  loadingClientes = signal(false);
  saving = signal(false);

  busqueda = signal('');
  listaFiltrada = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    if (!q) return this.lista();
    const qDigitos = normalizarCedula(q);
    return this.lista().filter(
      (c) =>
        (c.nombre || '').toLowerCase().includes(q) ||
        (qDigitos && c.cedula.includes(qDigitos)) ||
        (c.empresa || '').toLowerCase().includes(q) ||
        (c.planta || '').toLowerCase().includes(q) ||
        (c.motivo || '').toLowerCase().includes(q)
    );
  });

  // Modal agregar
  showModal = signal(false);
  busquedaCliente = signal('');
  clienteSeleccionado = signal<ClienteRelacion | null>(null);
  motivo = signal('');

  private cedulasEnLista = computed(() => new Set(this.lista().map((c) => c.cedula)));

  clientesDisponibles = computed(() => {
    const q = this.busquedaCliente().toLowerCase().trim();
    const qDigitos = normalizarCedula(q);
    const enLista = this.cedulasEnLista();
    return this.clientesRelaciones()
      .filter((c) => !enLista.has(c.cedula))
      .filter((c) => !q || c.nombre.toLowerCase().includes(q) || (!!qDigitos && c.cedula.includes(qDigitos)))
      .slice(0, 50);
  });

  // Modal editar motivo
  editando = signal<ListaNegraItem | null>(null);
  motivoEdit = signal('');

  ngOnInit() {
    this.loadLista();
    this.loadClientesRelaciones();
  }

  loadLista() {
    this.loading.set(true);
    this.http.get<ListaNegraItem[]>(this.API).subscribe({
      next: (data) => {
        this.lista.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando lista negra:', err);
        this.loading.set(false);
      },
    });
  }

  /** Clientes únicos (por cédula) tomados de las relaciones de Relación de Cuentas. */
  loadClientesRelaciones() {
    this.loadingClientes.set(true);
    this.http.get<AbonoBasico[]>(this.API_ABONOS).subscribe({
      next: (abonos) => {
        const porCedula = new Map<string, ClienteRelacion>();
        for (const a of abonos) {
          const cedula = normalizarCedula(a.cedula);
          if (!cedula) continue;
          const existente = porCedula.get(cedula);
          if (existente) {
            existente.cantidadRelaciones++;
            if (!existente.telefono && a.telefono) existente.telefono = a.telefono;
            continue;
          }
          porCedula.set(cedula, {
            cedula,
            nombre: (a.nombre || '').trim(),
            telefono: a.telefono || '',
            empresa: a.empresa || '',
            planta: a.planta || '',
            cantidadRelaciones: 1,
          });
        }
        this.clientesRelaciones.set([...porCedula.values()].sort((x, y) => x.nombre.localeCompare(y.nombre)));
        this.loadingClientes.set(false);
      },
      error: (err) => {
        console.error('Error cargando clientes de relaciones:', err);
        this.loadingClientes.set(false);
      },
    });
  }

  abrirModal() {
    this.busquedaCliente.set('');
    this.clienteSeleccionado.set(null);
    this.motivo.set('');
    this.showModal.set(true);
  }

  cerrarModal() {
    this.showModal.set(false);
  }

  seleccionarCliente(cliente: ClienteRelacion) {
    this.clienteSeleccionado.set(cliente);
  }

  agregar() {
    const cliente = this.clienteSeleccionado();
    if (!cliente) {
      this.notificationModal.warning('Seleccione un cliente');
      return;
    }
    this.saving.set(true);
    this.http
      .post<ListaNegraItem>(this.API, {
        cedula: cliente.cedula,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        empresa: cliente.empresa,
        planta: cliente.planta,
        motivo: this.motivo().trim(),
      })
      .subscribe({
        next: (item) => {
          this.lista.update((l) => [item, ...l]);
          this.saving.set(false);
          this.cerrarModal();
          this.notificationModal.success(`${cliente.nombre} fue agregado a la lista negra`);
        },
        error: (err) => {
          this.saving.set(false);
          this.notificationModal.error(err?.error?.error || 'Error al agregar a la lista negra');
        },
      });
  }

  abrirEditar(item: ListaNegraItem) {
    this.editando.set(item);
    this.motivoEdit.set(item.motivo || '');
  }

  cerrarEditar() {
    this.editando.set(null);
  }

  guardarMotivo() {
    const item = this.editando();
    if (!item?._id) return;
    this.saving.set(true);
    this.http.put<ListaNegraItem>(`${this.API}/${item._id}`, { motivo: this.motivoEdit().trim() }).subscribe({
      next: (actualizado) => {
        this.lista.update((l) => l.map((c) => (c._id === item._id ? { ...c, motivo: actualizado.motivo } : c)));
        this.saving.set(false);
        this.cerrarEditar();
      },
      error: (err) => {
        this.saving.set(false);
        this.notificationModal.error(err?.error?.error || 'Error al actualizar el motivo');
      },
    });
  }

  quitar(item: ListaNegraItem) {
    if (!item._id) return;
    if (!confirm(`¿Quitar a ${item.nombre} (${this.formatCedula(item.cedula)}) de la lista negra?`)) return;
    this.http.delete(`${this.API}/${item._id}`).subscribe({
      next: () => this.lista.update((l) => l.filter((c) => c._id !== item._id)),
      error: (err) => this.notificationModal.error(err?.error?.error || 'Error al quitar de la lista negra'),
    });
  }

  formatCedula(cedula: string): string {
    return normalizarCedula(cedula).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  formatFecha(fecha?: string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-VE');
  }
}
