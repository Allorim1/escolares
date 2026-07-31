import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { EmpresasService } from '../../shared/data-access/empresas.service';

interface Cliente {
  _id?: string;
  nombre: string;
  plantas: string[];
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
  private empresasService = inject(EmpresasService);

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

  verDetalle(cliente: Cliente) {
    this.router.navigate(['/admin/clientes', cliente._id]);
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
          this.empresasService.load();
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
          this.empresasService.load();
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
        this.loadClientes();
        this.empresasService.load();
      },
      error: (err) => console.error('Error deleting cliente:', err),
    });
  }

  verHistorialCompras() {
    this.router.navigate(['/admin/historico-costos']);
  }
}
