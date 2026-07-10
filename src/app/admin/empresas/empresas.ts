import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface Empresa {
  _id?: string;
  nombre: string;
  plantas: string[];
}

@Component({
  selector: 'app-empresas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './empresas.html',
  styleUrl: './empresas.css',
})
export class Empresas implements OnInit {
  private http = inject(HttpClient);
  private readonly API = '/api/empresas';

  empresas = signal<Empresa[]>([]);
  loading = signal(false);
  showModal = signal(false);
  editingEmpresa: Empresa | null = null;
  nuevaPlanta = signal('');
  saving = signal(false);
  private router = inject(Router);

  ngOnInit() {
    this.loadEmpresas();
  }

  loadEmpresas() {
    this.loading.set(true);
    this.http.get<Empresa[]>(this.API).subscribe({
      next: (data) => {
        this.empresas.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading empresas:', err);
        this.loading.set(false);
      },
    });
  }

  abrirModal(empresa?: Empresa) {
    if (empresa) {
      this.editingEmpresa = { ...empresa, plantas: [...empresa.plantas] };
    } else {
      this.editingEmpresa = { nombre: '', plantas: [] };
    }
    this.showModal.set(true);
  }

  cerrarModal() {
    this.showModal.set(false);
    this.editingEmpresa = null;
    this.nuevaPlanta.set('');
  }

  agregarPlanta() {
    if (!this.editingEmpresa) return;
    const planta = this.nuevaPlanta().trim();
    if (!planta) return;
    if (this.editingEmpresa.plantas.includes(planta)) return;
    this.editingEmpresa.plantas = [...this.editingEmpresa.plantas, planta];
    this.nuevaPlanta.set('');
  }

  eliminarPlanta(planta: string) {
    if (!this.editingEmpresa) return;
    this.editingEmpresa.plantas = this.editingEmpresa.plantas.filter((p) => p !== planta);
  }

  guardarEmpresa() {
    if (!this.editingEmpresa) return;
    if (!this.editingEmpresa.nombre.trim()) {
      alert('El nombre de la empresa es requerido');
      return;
    }

    this.saving.set(true);
    if (this.editingEmpresa._id) {
      this.http.put(`${this.API}/${this.editingEmpresa._id}`, this.editingEmpresa).subscribe({
        next: () => {
          this.saving.set(false);
          this.cerrarModal();
          this.loadEmpresas();
        },
        error: (err) => {
          console.error('Error updating empresa:', err);
          this.saving.set(false);
        },
      });
    } else {
      this.http.post<Empresa>(this.API, this.editingEmpresa).subscribe({
        next: (res: Empresa) => {
          this.saving.set(false);
          this.cerrarModal();
          this.empresas.update(empresas => [...empresas, res]);
        },
        error: (err) => {
          console.error('Error creating empresa:', err);
          this.saving.set(false);
        },
      });
    }
  }

   eliminarEmpresa(id: string) {
    if (!confirm('¿Está seguro de eliminar esta empresa?')) return;
    this.http.delete(`${this.API}/${id}`).subscribe({
      next: () => this.loadEmpresas(),
      error: (err) => console.error('Error deleting empresa:', err),
    });
  }

  verHistorialCompras() {
    this.router.navigate(['/admin/historico-costos']);
  }
}
