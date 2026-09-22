import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
  icono: string;
  activo: boolean;
}

const CATEGORIAS = ['Útiles', 'Uniformes', 'Libros', 'Tecnología'];

@Component({
  selector: 'app-creditos-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creditos-productos.html',
  styleUrl: './creditos-productos.css',
})
export class CreditosProductos implements OnInit {
  private http = inject(HttpClient);
  private readonly API = '/api/creditos/admin/productos';

  readonly categorias = CATEGORIAS;
  productos = signal<Producto[]>([]);
  loading = signal(false);
  saving = signal(false);
  showModal = signal(false);
  editando: Producto | null = null;

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.loading.set(true);
    this.http.get<Producto[]>(this.API).subscribe({
      next: (data) => { this.productos.set(data); this.loading.set(false); },
      error: (err) => { console.error('Error cargando productos:', err); this.loading.set(false); },
    });
  }

  abrirModal(producto?: Producto) {
    this.editando = producto
      ? { ...producto }
      : { id: '', nombre: '', descripcion: '', categoria: CATEGORIAS[0], precio: 0, icono: 'pricetag', activo: true };
    this.showModal.set(true);
  }

  cerrarModal() {
    this.showModal.set(false);
    this.editando = null;
  }

  guardar() {
    if (!this.editando) return;
    if (!this.editando.nombre.trim() || !(this.editando.precio > 0)) {
      alert('Nombre y precio (mayor a 0) son requeridos');
      return;
    }

    this.saving.set(true);
    if (this.editando.id) {
      this.http.put<Producto>(`${this.API}/${this.editando.id}`, this.editando).subscribe({
        next: () => { this.saving.set(false); this.cerrarModal(); this.cargar(); },
        error: (err) => { this.saving.set(false); alert(err.error?.error || 'Error al guardar'); },
      });
    } else {
      this.http.post<Producto>(this.API, this.editando).subscribe({
        next: () => { this.saving.set(false); this.cerrarModal(); this.cargar(); },
        error: (err) => { this.saving.set(false); alert(err.error?.error || 'Error al crear'); },
      });
    }
  }

  eliminar(producto: Producto) {
    if (!confirm(`¿Eliminar "${producto.nombre}" del catálogo?`)) return;
    this.http.delete(`${this.API}/${producto.id}`).subscribe({
      next: () => this.cargar(),
      error: (err) => alert(err.error?.error || 'Error al eliminar'),
    });
  }
}
