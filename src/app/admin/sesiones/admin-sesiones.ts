import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/data-access/auth.service';
import { UserSession } from '../../backend/models';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';

@Component({
  selector: 'app-admin-sesiones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-sesiones.html',
  styleUrl: './admin-sesiones.css',
})
export class AdminSesiones implements OnInit {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private notificationModal = inject(NotificationModalService);

  sesiones = signal<UserSession[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  filtroTexto = '';
  filtroEstado: 'todas' | 'activas' | 'cerradas' = 'todas';
  refreshInterval: any;

  ngOnInit() {
    if (!this.esRoot()) {
      this.router.navigate(['/admin/inicio']);
      return;
    }
    this.cargarSesiones();
    this.refreshInterval = setInterval(() => this.cargarSesiones(), 30000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  cargarSesiones() {
    this.cargando.set(true);
    this.authService.getAllSessions().subscribe({
      next: (sesiones) => {
        this.sesiones.set(sesiones || []);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Error al cargar sesiones');
        this.cargando.set(false);
      },
    });
  }

  get sesionesFiltradas(): UserSession[] {
    let resultado = this.sesiones();
    const texto = this.filtroTexto.toLowerCase().trim();

    if (texto) {
      resultado = resultado.filter(s =>
        s.username?.toLowerCase().includes(texto) ||
        s.email?.toLowerCase().includes(texto) ||
        s.ip?.includes(texto) ||
        s.device?.toLowerCase().includes(texto) ||
        s.browser?.toLowerCase().includes(texto)
      );
    }

    if (this.filtroEstado === 'activas') {
      resultado = resultado.filter(s => s.active);
    } else if (this.filtroEstado === 'cerradas') {
      resultado = resultado.filter(s => !s.active);
    }

    return resultado;
  }

  get sesionesActivas(): UserSession[] {
    return this.sesionesFiltradas.filter(s => s.active);
  }

  get sesionesCerradas(): UserSession[] {
    return this.sesionesFiltradas.filter(s => !s.active);
  }

  onFiltroTextoChange(valor: string) {
    this.filtroTexto = valor;
  }

  onFiltroEstadoChange(valor: 'todas' | 'activas' | 'cerradas') {
    this.filtroEstado = valor;
  }

  cerrarSesion(sesion: UserSession) {
    if (!confirm(`¿Cerrar sesión de "${sesion.username}" desde ${sesion.ip || 'IP desconocida'}?`)) {
      return;
    }

    this.authService.terminateSession(sesion.id).subscribe({
      next: () => {
        this.notificationModal.success('Sesión cerrada correctamente');
        this.cargarSesiones();
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
        this.cargarSesiones();
      },
      error: (err) => {
        this.notificationModal.error(err.error?.error || 'Error al cerrar sesiones');
      },
    });
  }

  formatearFecha(fecha: string): string {
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

  getActiveColor(active: boolean): string {
    return active ? '#22c55e' : '#ef4444';
  }

  getActiveLabel(active: boolean): string {
    return active ? 'Activa' : 'Cerrada';
  }
}
