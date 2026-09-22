import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

type Estado = 'sin_verificar' | 'en_revision' | 'verificado' | 'rechazado';

interface CreditoUsuario {
  id: string;
  nombre: string;
  telefono: string;
  email?: string;
  nivel: number;
  status: Estado;
  createdAt: string;
}

const PESTANAS: { value: Estado | 'todos'; label: string }[] = [
  { value: 'en_revision', label: 'En revisión' },
  { value: 'verificado', label: 'Verificadas' },
  { value: 'rechazado', label: 'Rechazadas' },
  { value: 'sin_verificar', label: 'Sin verificar' },
  { value: 'todos', label: 'Todos' },
];

@Component({
  selector: 'app-creditos-verificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creditos-verificaciones.html',
  styleUrl: './creditos-verificaciones.css',
})
export class CreditosVerificaciones implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly API = '/api/creditos/admin/usuarios';

  readonly pestanas = PESTANAS;
  pestanaActiva = signal<Estado | 'todos'>('en_revision');
  busqueda = signal('');
  usuarios = signal<CreditoUsuario[]>([]);
  loading = signal(false);

  usuariosFiltrados = computed(() => {
    const termino = this.busqueda().toLowerCase().trim();
    if (!termino) return this.usuarios();
    return this.usuarios().filter(
      (u) => u.nombre.toLowerCase().includes(termino) || u.telefono.includes(termino),
    );
  });

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
    const url = estado === 'todos' ? this.API : `${this.API}?status=${estado}`;
    this.http.get<CreditoUsuario[]>(url).subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando usuarios de créditos:', err);
        this.loading.set(false);
      },
    });
  }

  etiqueta(status: Estado): { texto: string; clase: string } {
    switch (status) {
      case 'verificado': return { texto: 'Verificada', clase: 'badge-success' };
      case 'en_revision': return { texto: 'En revisión', clase: 'badge-warning' };
      case 'rechazado': return { texto: 'Rechazada', clase: 'badge-danger' };
      default: return { texto: 'Sin verificar', clase: 'badge-medium' };
    }
  }

  verDetalle(usuario: CreditoUsuario) {
    this.router.navigate(['/admin/creditos-verificaciones', usuario.id]);
  }
}
