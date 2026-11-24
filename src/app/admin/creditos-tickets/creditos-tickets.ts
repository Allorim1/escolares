import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge';
import { io, Socket } from 'socket.io-client';

type Estado = 'abierto' | 'en_proceso' | 'cerrado';
type Tipo = 'consulta' | 'pago_atrasado';

interface Ticket {
  id: string;
  usuarioId: string;
  usuarioNombre?: string;
  usuarioTelefono?: string;
  tipo: Tipo;
  asunto: string;
  estado: Estado;
  actualizadoEn: string;
  diasAtraso?: number;
  mensajes: { autor: 'cliente' | 'staff'; texto: string; createdAt: string }[];
}

const PESTANAS: { value: Estado | 'todos'; label: string }[] = [
  { value: 'abierto', label: 'Abiertos' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'cerrado', label: 'Cerrados' },
  { value: 'todos', label: 'Todos' },
];

/** Bandeja del Centro de Ayuda: consultas de clientes y casos de pago atrasado (ver el
 *  botón "Abrir caso" en Solicitudes de Crédito para clientes con más de 7 días de atraso). */
@Component({
  selector: 'app-creditos-tickets',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, SkeletonComponent, StatusBadgeComponent],
  templateUrl: './creditos-tickets.html',
  styleUrl: './creditos-tickets.css',
})
export class CreditosTickets implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private notifications = inject(NotificationModalService);
  private router = inject(Router);
  private readonly API = '/api/creditos/admin/tickets';

  readonly pestanas = PESTANAS;
  pestanaActiva = signal<Estado | 'todos'>('abierto');
  tickets = signal<Ticket[]>([]);
  loading = signal(false);
  paginaActual = signal(1);
  readonly pageSize = 10;
  private socket: Socket | null = null;

  ngOnInit() {
    this.cargar();
    // Tiempo real: tickets nuevos o mensajes de clientes refrescan la bandeja sola.
    this.socket = io(window.location.origin, { transports: ['websocket'] });
    this.socket.on('connect', () => this.socket?.emit('join-tickets-admin-room'));
    this.socket.on('ticket-actualizado', () => this.cargar(true));
  }

  ngOnDestroy() {
    this.socket?.disconnect();
    this.socket = null;
  }

  cambiarPestana(valor: Estado | 'todos') {
    this.pestanaActiva.set(valor);
    this.paginaActual.set(1);
    this.cargar();
  }

  /** silencioso: recarga sin mostrar "Cargando..." (para los avisos en tiempo real). */
  cargar(silencioso = false) {
    if (!silencioso) this.loading.set(true);
    const estado = this.pestanaActiva();
    const url = estado === 'todos' ? this.API : `${this.API}?estado=${estado}`;
    this.http.get<Ticket[]>(url).subscribe({
      next: (data) => { this.tickets.set(data); this.loading.set(false); },
      error: (err) => { console.error('Error al cargar tickets', err); this.loading.set(false); this.notifications.fromHttpError(err, 'Error al cargar tickets'); },
    });
  }

  etiqueta(estado: Estado): { texto: string; clase: string; tone: 'success'|'warning'|'danger'|'info'|'neutral' } {
    switch (estado) {
      case 'abierto': return { texto: 'Abierto', clase: 'badge-warning', tone: 'warning' };
      case 'en_proceso': return { texto: 'En proceso', clase: 'badge-primary', tone: 'info' };
      case 'cerrado': return { texto: 'Cerrado', clase: 'badge-medium', tone: 'neutral' };
    }
  }

  get totalPaginas(): number { return Math.max(1, Math.ceil(this.tickets().length / this.pageSize)); }
  get ticketsPaginados(): Ticket[] { const s=(this.paginaActual()-1)*this.pageSize; return this.tickets().slice(s,s+this.pageSize); }
  irPagina(p:number){ if(p<1||p>this.totalPaginas) return; this.paginaActual.set(p); }

  ultimoMensaje(t: Ticket): string {
    return t.mensajes[t.mensajes.length - 1]?.texto ?? '';
  }

  abrir(t: Ticket) {
    this.router.navigate(['/admin/creditos-tickets', t.id]);
  }
}
