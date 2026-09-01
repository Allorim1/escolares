import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/data-access/auth.service';
import { UserSession } from '../../backend/models';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';

type Tab = 'activas' | 'historial';

@Component({
  selector: 'app-admin-sesiones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-sesiones.html',
  styleUrl: './admin-sesiones.css',
})
export class AdminSesiones implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationModal = inject(NotificationModalService);

  private readonly HISTORIAL_PAGE_SIZE = 20;

  tab = signal<Tab>('activas');

  sesionesActivas = signal<UserSession[]>([]);
  historial = signal<UserSession[]>([]);
  historialTotal = signal(0);
  private historialSkip = 0;

  cargando = signal(true);
  cargandoMas = signal(false);
  error = signal<string | null>(null);
  filtroTexto = '';
  refreshInterval: any;

  ngOnInit() {
    if (!this.esRoot()) {
      this.router.navigate(['/admin/inicio']);
      return;
    }
    this.cargarActivas();
    this.refreshInterval = setInterval(() => {
      if (this.tab() === 'activas') {
        this.cargarActivas(false);
      }
    }, 30000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  cambiarTab(tab: Tab) {
    if (this.tab() === tab) return;
    this.tab.set(tab);
    this.filtroTexto = '';
    if (tab === 'activas') {
      this.cargarActivas();
    } else if (this.historial().length === 0) {
      this.cargarHistorial(true);
    }
  }

  cargarActivas(mostrarCarga = true) {
    if (mostrarCarga) this.cargando.set(true);
    this.error.set(null);
    this.authService.getAllSessions({ estado: 'activas', limit: 500 }).subscribe({
      next: (res) => {
        this.sesionesActivas.set(res.sessions || []);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Error al cargar sesiones activas');
        this.cargando.set(false);
      },
    });
  }

  cargarHistorial(reset: boolean) {
    if (reset) {
      this.historialSkip = 0;
      this.cargando.set(true);
    } else {
      this.cargandoMas.set(true);
    }
    this.error.set(null);

    this.authService
      .getAllSessions({ estado: 'cerradas', limit: this.HISTORIAL_PAGE_SIZE, skip: this.historialSkip })
      .subscribe({
        next: (res) => {
          this.historial.set(reset ? res.sessions || [] : [...this.historial(), ...(res.sessions || [])]);
          this.historialTotal.set(res.total || 0);
          this.cargando.set(false);
          this.cargandoMas.set(false);
        },
        error: (err) => {
          this.error.set(err.error?.error || 'Error al cargar historial de sesiones');
          this.cargando.set(false);
          this.cargandoMas.set(false);
        },
      });
  }

  cargarMasHistorial() {
    this.historialSkip += this.HISTORIAL_PAGE_SIZE;
    this.cargarHistorial(false);
  }

  refrescar() {
    if (this.tab() === 'activas') {
      this.cargarActivas();
    } else {
      this.cargarHistorial(true);
    }
  }

  get hayMasHistorial(): boolean {
    return this.historial().length < this.historialTotal();
  }

  private filtrar(sesiones: UserSession[]): UserSession[] {
    const texto = this.filtroTexto.toLowerCase().trim();
    if (!texto) return sesiones;
    return sesiones.filter(s =>
      s.username?.toLowerCase().includes(texto) ||
      s.email?.toLowerCase().includes(texto) ||
      s.ip?.includes(texto) ||
      s.device?.toLowerCase().includes(texto) ||
      s.browser?.toLowerCase().includes(texto)
    );
  }

  get sesionesActivasFiltradas(): UserSession[] {
    return this.filtrar(this.sesionesActivas());
  }

  get historialFiltrado(): UserSession[] {
    return this.filtrar(this.historial());
  }

  onFiltroTextoChange(valor: string) {
    this.filtroTexto = valor;
  }

  cerrarSesion(sesion: UserSession) {
    if (!confirm(`¿Cerrar sesión de "${sesion.username}" desde ${sesion.ip || 'IP desconocida'}?`)) {
      return;
    }

    this.authService.terminateSession(sesion.id).subscribe({
      next: () => {
        this.notificationModal.success('Sesión cerrada correctamente');
        this.cargarActivas();
      },
      error: (err) => {
        this.notificationModal.error(err.error?.error || 'Error al cerrar sesión');
      },
    });
  }

  cerrarTodasSesionesUsuario(userId: string, username: string) {
    if (!confirm(`¿Cerrar TODAS las sesiones activas de "${username}"?`)) {
      return;
    }

    this.authService.terminateAllUserSessions(userId).subscribe({
      next: () => {
        this.notificationModal.success('Todas las sesiones cerradas correctamente');
        this.cargarActivas();
      },
      error: (err) => {
        this.notificationModal.error(err.error?.error || 'Error al cerrar sesiones');
      },
    });
  }

  formatearFecha(fecha?: string): string {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  esRoot(): boolean {
    return this.authService.user()?.rol === 'root';
  }

  getDeviceIcon(device?: string): string {
    switch (device) {
      case 'Móvil': return '📱';
      case 'Tablet': return '📱';
      case 'Escritorio': return '💻';
      default: return '🖥️';
    }
  }

  getCierreLabel(sesion: UserSession): string {
    switch (sesion.closedReason) {
      case 'logout': return 'Cierre de sesión';
      case 'expired': return 'Expirada';
      case 'admin': return 'Cerrada por un administrador';
      case 'user': return 'Cerrada por el usuario';
      default: return 'Cerrada';
    }
  }

  getCierreIcon(sesion: UserSession): string {
    switch (sesion.closedReason) {
      case 'logout': return '🚪';
      case 'expired': return '⏱️';
      case 'admin': return '🛡️';
      case 'user': return '🔒';
      default: return '⏹️';
    }
  }
}
