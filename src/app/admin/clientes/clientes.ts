import { Component, HostListener, signal, OnInit, inject, computed } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';
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
  imports: [FormsModule],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css',
})
export class Clientes implements OnInit {
  private http = inject(HttpClient);
  private notifications = inject(NotificationModalService);
  private readonly API = '/api/empresas';
  private empresasService = inject(EmpresasService);

  clientes = signal<Cliente[]>([]);
  busqueda = signal('');
  clientesFiltrados = computed(() => {
    const termino = this.busqueda().toLowerCase().trim();
    if (!termino) return this.clientes();
    return this.clientes().filter((c) => c.nombre.toLowerCase().includes(termino));
  });
  loading = signal(false);
  showModal = signal(false);
  editingCliente: Cliente | null = null;
  nuevaPlanta = signal('');
  saving = signal(false);
  private router = inject(Router);
  private lastFocused: HTMLElement | null = null;

  async ngOnInit() {
    this.loadClientes();
  }

  async loadClientes() {
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

  async abrirModal(cliente?: Cliente) {
    this.lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (cliente) {
      this.editingCliente = { ...cliente, plantas: [...cliente.plantas] };
    } else {
      this.editingCliente = { nombre: '', plantas: [] };
    }
    this.showModal.set(true);
  }

  async cerrarModal() {
    this.showModal.set(false);
    this.editingCliente = null;
    this.nuevaPlanta.set('');
    const el=this.lastFocused; this.lastFocused=null; setTimeout(()=>el?.focus(),0);
  }

  async verDetalle(cliente: Cliente) {
    this.router.navigate(['/admin/clientes', cliente._id]);
  }

  async agregarPlanta() {
    if (!this.editingCliente) return;
    const planta = this.nuevaPlanta().trim();
    if (!planta) return;
    if (this.editingCliente.plantas.includes(planta)) return;
    this.editingCliente.plantas = [...this.editingCliente.plantas, planta];
    this.nuevaPlanta.set('');
  }

  async eliminarPlanta(planta: string) {
    if (!this.editingCliente) return;
    this.editingCliente.plantas = this.editingCliente.plantas.filter((p) => p !== planta);
  }

  async guardarCliente() {
    if (!this.editingCliente) return;
    if (!this.editingCliente.nombre.trim()) {
      this.notifications.error('El nombre del cliente es requerido');
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
          this.clientes.update((clientes) => [...clientes, res]);
          this.empresasService.load();
        },
        error: (err) => {
          console.error('Error creating cliente:', err);
          this.saving.set(false);
        },
      });
    }
  }

  async eliminarCliente(id: string) {
    const ok = await this.notifications.confirm({ titulo: 'Confirmar eliminación', mensaje: '¿Está seguro de eliminar este cliente?', tipo: 'danger', confirmarTexto: 'Eliminar' });
    if (!ok) return;
    this.http.delete(`${this.API}/${id}`).subscribe({
      next: () => {
        this.loadClientes();
        this.empresasService.load();
      },
      error: (err) => console.error('Error deleting cliente:', err),
    });
  }


  @HostListener('document:keydown.escape')
  onEscape() { if (this.showModal()) this.cerrarModal(); }
}
