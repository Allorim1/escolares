import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../shared/data-access/auth.service';

interface ContrasenaAuditoria {
  id: string;
  userId: string;
  username: string;
  email: string;
  contrasena: string;
  rol: string;
  fecha: string;
  accion: string;
}

@Component({
  selector: 'app-admin-contrasenas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contrasenas.html',
  styleUrl: './contrasenas.css',
})
export class AdminContrasenas implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  contrasenas = signal<ContrasenaAuditoria[]>([]);
  busqueda = signal('');
  cargando = signal(true);
  error = signal<string | null>(null);

  paginaActual = signal(1);
  readonly tamPagina = 10;

  contrasenasPaginadas = signal<ContrasenaAuditoria[]>([]);
  totalPaginas = signal(1);

  ngOnInit() {
    if (!this.esRoot()) {
      this.error.set('No tienes acceso a esta sección. Solo el usuario root puede ver las contraseñas.');
      this.cargando.set(false);
      return;
    }

    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      if (this.router.url.includes('/admin/contrasenas')) {
        this.cargarContrasenas();
      }
    });

    this.cargarContrasenas();
  }

  cargarContrasenas() {
    this.cargando.set(true);
    this.paginaActual.set(1);

    const termino = this.busqueda().trim();
    const request$ = termino
      ? this.authService.searchPasswords(termino)
      : this.authService.getAllPasswords();

    request$.subscribe({
      next: (data) => {
        this.contrasenas.set(data || []);
        this.aplicarPaginado();
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Error al cargar contraseñas');
        this.cargando.set(false);
      },
    });
  }

  onBusquedaChange(valor: string) {
    this.busqueda.set(valor);
    this.paginaActual.set(1);
    this.cargarContrasenas();
  }

  private aplicarPaginado() {
    const datos = this.contrasenas();
    const inicio = (this.paginaActual() - 1) * this.tamPagina;
    const fin = inicio + this.tamPagina;
    this.contrasenasPaginadas.set(datos.slice(inicio, fin));
    this.totalPaginas.set(Math.max(1, Math.ceil(datos.length / this.tamPagina)));
  }

  cambiarPagina(pagina: number) {
    const total = this.totalPaginas();
    this.paginaActual.set(Math.max(1, Math.min(total, pagina)));
    this.aplicarPaginado();
  }

  irAtrasGrupo() {
    const actual = this.paginaActual();
    const grupoInicio = Math.floor((actual - 1) / 10) * 10 + 1;
    this.paginaActual.set(Math.max(1, grupoInicio - 10));
    this.aplicarPaginado();
  }

  irAdelanteGrupo() {
    const actual = this.paginaActual();
    const total = this.totalPaginas();
    const grupoInicio = Math.floor((actual - 1) / 10) * 10 + 1;
    this.paginaActual.set(Math.min(total, grupoInicio + 10));
    this.aplicarPaginado();
  }

  puedeIrAtrasGrupo = computed(() => {
    const actual = this.paginaActual();
    const grupoInicio = Math.floor((actual - 1) / 10) * 10 + 1;
    return grupoInicio > 1;
  });

  puedeIrAdelanteGrupo = computed(() => {
    const actual = this.paginaActual();
    const total = this.totalPaginas();
    const grupoInicio = Math.floor((actual - 1) / 10) * 10 + 1;
    return grupoInicio + 9 < total;
  });

  numerosPaginas = computed(() => {
    const total = this.totalPaginas();
    const actual = this.paginaActual();
    const grupoInicio = Math.floor((actual - 1) / 10) * 10 + 1;
    const grupoFin = Math.min(grupoInicio + 9, total);
    const paginas: (number | string)[] = [];

    if (total <= 11) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    paginas.push(1);

    if (grupoInicio > 2) {
      paginas.push('...');
    } else if (grupoInicio === 2) {
      paginas.push(2);
    }

    for (let p = grupoInicio; p <= grupoFin; p++) {
      if (p > 1 && p < total) {
        paginas.push(p);
      }
    }

    if (grupoFin < total - 1) {
      paginas.push('...');
    } else if (grupoFin === total - 1) {
      paginas.push(total - 1);
    }

    if (total > 1) {
      paginas.push(total);
    }

    return paginas;
  });

  esRoot(): boolean {
    return this.authService.user()?.rol === 'root';
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleString('es-VE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  eliminarContrasena(item: ContrasenaAuditoria) {
    if (!confirm(`¿Eliminar el registro de contraseña de "${item.username}"?`)) {
      return;
    }

    this.authService.deletePassword(item.id).subscribe({
      next: () => {
        this.cargarContrasenas();
      },
      error: (err) => {
        alert(err.error?.error || 'Error al eliminar el registro');
      },
    });
  }
}
