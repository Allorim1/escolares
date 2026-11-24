import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { io, Socket } from 'socket.io-client';

import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';
type Estado = 'abierto' | 'en_proceso' | 'cerrado';

interface Mensaje {
  autor: 'cliente' | 'staff';
  autorNombre?: string;
  texto: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  usuarioId: string;
  usuarioNombre?: string;
  usuarioTelefono?: string;
  tipo: 'consulta' | 'pago_atrasado';
  asunto: string;
  estado: Estado;
  mensajes: Mensaje[];
}

@Component({
  selector: 'app-creditos-tickets-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creditos-tickets-detalle.html',
  styleUrl: './creditos-tickets-detalle.css',
})
export class CreditosTicketsDetalle implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private notifications = inject(NotificationModalService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private readonly API = '/api/creditos/admin/tickets';

  ticket = signal<Ticket | null>(null);
  loading = signal(false);
  enviando = signal(false);
  mensaje = '';

  private id = this.route.snapshot.paramMap.get('id') ?? '';
  private socket: Socket | null = null;

  async ngOnInit() {
    this.cargar();
    this.conectarSocket();
  }

  async ngOnDestroy() {
    this.socket?.disconnect();
    this.socket = null;
  }

  /** silencioso: recarga sin mostrar "Cargando..." (para los avisos en tiempo real). */
  async cargar(silencioso = false) {
    if (!silencioso) this.loading.set(true);
    this.http.get<Ticket>(`${this.API}/${this.id}`).subscribe({
      next: (t) => { this.ticket.set(t); this.loading.set(false); },
      error: (err) => { console.error('Error cargando ticket:', err); this.loading.set(false); },
    });
  }

  /** Tiempo real: cuando el cliente escribe desde la app, el backend avisa por socket.io y
   *  se recarga el ticket. Al reconectar se recarga también, por si llegó algo mientras tanto. */
  private async conectarSocket() {
    this.socket = io(window.location.origin, { transports: ['websocket'] });
    this.socket.on('connect', () => {
      this.socket?.emit('join-ticket-room', this.id);
      if (this.ticket()) this.cargar(true);
    });
    this.socket.on('ticket-actualizado', ({ ticketId }: { ticketId: string }) => {
      if (ticketId === this.id) this.cargar(true);
    });
  }

  etiqueta(estado: Estado): { texto: string; clase: string } {
    switch (estado) {
      case 'abierto': return { texto: 'Abierto', clase: 'badge-warning' };
      case 'en_proceso': return { texto: 'En proceso', clase: 'badge-primary' };
      case 'cerrado': return { texto: 'Cerrado', clase: 'badge-medium' };
    }
  }

  async enviar() {
    const texto = this.mensaje.trim();
    if (!texto) return;
    this.enviando.set(true);
    this.http.post(`${this.API}/${this.id}/mensajes`, { mensaje: texto }).subscribe({
      next: () => { this.mensaje = ''; this.enviando.set(false); this.cargar(true); },
      error: (err) => { this.enviando.set(false); this.notifications.fromHttpError(err, 'Error al enviar el mensaje'); },
    });
  }

  async cerrar() {
    const ok = await this.notifications.confirm({ titulo: 'Confirmar acción', mensaje: '¿Cerrar este ticket?', tipo: 'warning', confirmarTexto: 'Confirmar' });
    if (!ok) return;
    this.http.post(`${this.API}/${this.id}/cerrar`, {}).subscribe({
      next: () => this.cargar(true),
      error: (err) => this.notifications.fromHttpError(err, 'Error al cerrar el ticket'),
    });
  }

  volver() {
    this.router.navigate(['/admin/creditos-tickets']);
  }
}