import { Component, HostListener, OnInit, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge';

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
  imports: [FormsModule, EmptyStateComponent, SkeletonComponent, StatusBadgeComponent],
  templateUrl: './creditos-productos.html',
  styleUrl: './creditos-productos.css',
})
export class CreditosProductos implements OnInit {
  private http = inject(HttpClient);
  private notifications = inject(NotificationModalService);
  private readonly API = '/api/creditos/admin/productos';

  readonly categorias = CATEGORIAS;
  productos = signal<Producto[]>([]);
  loading = signal(false);
  saving = signal(false);
  showModal = signal(false);
  editando: Producto | null = null;
  paginaActual = signal(1);
  readonly pageSize = 10;
  private lastFocused: HTMLElement | null = null;

  async ngOnInit() {
    this.cargar();
  }

  async cargar() {
    this.loading.set(true);
    this.http.get<Producto[]>(this.API).subscribe({
      next: (data) => {
        this.productos.set(data);
        this.paginaActual.set(1);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando productos:', err);
        this.loading.set(false);
      },
    });
  }

  async abrirModal(producto?: Producto) {
    this.lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.editando = producto
      ? { ...producto }
      : {
          id: '',
          nombre: '',
          descripcion: '',
          categoria: CATEGORIAS[0],
          precio: 0,
          icono: 'pricetag',
          activo: true,
        };
    this.showModal.set(true);
  }

  async cerrarModal() {
    this.showModal.set(false);
    this.editando = null;
    const el=this.lastFocused; this.lastFocused=null; setTimeout(()=>el?.focus(),0);
  }

  get totalPaginas(): number { return Math.max(1, Math.ceil(this.productos().length / this.pageSize)); }
  get paginados(): Producto[] { const s=(this.paginaActual()-1)*this.pageSize; return this.productos().slice(s,s+this.pageSize); }
  irPagina(p:number){ if(p<1||p>this.totalPaginas) return; this.paginaActual.set(p); }

  async guardar() {
    if (!this.editando) return;
    if (!this.editando.nombre.trim() || !(this.editando.precio > 0)) {
      this.notifications.error('Nombre y precio (mayor a 0) son requeridos');
      return;
    }

    this.saving.set(true);
    if (this.editando.id) {
      this.http.put<Producto>(`${this.API}/${this.editando.id}`, this.editando).subscribe({
        next: () => {
          this.saving.set(false);
          this.cerrarModal();
          this.notifications.success('Producto guardado');
          this.cargar();
        },
        error: (err) => {
          this.saving.set(false);
          this.notifications.fromHttpError(err, 'Error al guardar producto');
        },
      });
    } else {
      this.http.post<Producto>(this.API, this.editando).subscribe({
        next: () => {
          this.saving.set(false);
          this.cerrarModal();
          this.notifications.success('Producto guardado');
          this.cargar();
        },
        error: (err) => {
          this.saving.set(false);
          this.notifications.fromHttpError(err, 'Error al crear producto');
        },
      });
    }
  }

  async eliminar(producto: Producto) {
    const ok = await this.notifications.confirm({ titulo: 'Confirmar eliminación', mensaje: `¿Eliminar "${producto.nombre}" del catálogo?`, tipo: 'danger', confirmarTexto: 'Eliminar' });
    if (!ok) return;
    this.http.delete(`${this.API}/${producto.id}`).subscribe({
      next: () => this.cargar(),
      error: (err) => this.notifications.fromHttpError(err, 'Error al eliminar producto'),
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.showModal()) this.cerrarModal(); }
}
