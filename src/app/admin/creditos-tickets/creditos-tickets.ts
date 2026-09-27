import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

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
  imports: [CommonModule],
  templateUrl: './creditos-tickets.html',
  styleUrl: './creditos-tickets.css',
})
export class CreditosTickets implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly API = '/api/creditos/admin/tickets';

  readonly pestanas = PESTANAS;
  pestanaActiva = signal<Estado | 'todos'>('abierto');
  tickets = signal<Ticket[]>([]);
  loading = signal(false);

  ngOnInit() {
    this.cargar();
  }

  cambiarPestana(valor: Estado | 'todos') {
    this.pestanaActiva.set(valor);
    this.cargar();
  }

  cargar() {
    this.loading.set(true);
    const estado = this.pestanaActiva();
    const url = estado === 'todos' ? this.API : `${this.API}?estado=${estado}`;
    this.http.get<Ticket[]>(url).subscribe({
      next: (data) => { this.tickets.set(data); this.loading.set(false); },
      error: (err) => { console.error('Error cargando tickets:', err); this.loading.set(false); },
    });
  }

  etiqueta(estado: Estado): { texto: string; clase: string } {
    switch (estado) {
      case 'abierto': return { texto: 'Abierto', clase: 'badge-warning' };
      case 'en_proceso': return { texto: 'En proceso', clase: 'badge-primary' };
      case 'cerrado': return { texto: 'Cerrado', clase: 'badge-medium' };
    }
  }

  ultimoMensaje(t: Ticket): string {
    return t.mensajes[t.mensajes.length - 1]?.texto ?? '';
  }

  abrir(t: Ticket) {
    this.router.navigate(['/admin/creditos-tickets', t.id]);
  }
}
