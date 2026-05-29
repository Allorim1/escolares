import { Component, inject, signal, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../shared/data-access/auth.service';

interface Usuario {
  _id: string;
  username?: string;
  nombre?: string;
  email?: string;
  rol?: string;
  ultimoMensaje?: string;
  ultimoMensajeFecha?: Date;
  sinLeer?: number;
}

interface Mensaje {
  _id?: string;
  emisorId: string;
  emisorNombre: string;
  receptorId: string;
  mensaje: string;
  leido: boolean;
  fecha: Date;
}

interface MensajePublico {
  _id?: string;
  emisorNombre: string;
  mensaje: string;
  fecha: Date;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit, AfterViewChecked {
  private http = inject(HttpClient);
  authService = inject(AuthService);

  @ViewChild('mensajesContainer') mensajesContainer!: ElementRef;
  @ViewChild('mensajesPublicosContainer') mensajesPublicosContainer!: ElementRef;

  usuarios = signal<Usuario[]>([]);
  usuariosFiltrados: Usuario[] = [];
  usuarioSeleccionado = signal<Usuario | null>(null);
  mensajes: Mensaje[] = [];
  mensajesPublicos: MensajePublico[] = [];
  
  tabActiva: 'privado' | 'publico' = 'privado';
  busqueda = '';
  nuevoMensaje = '';
  nuevoMensajePublico = '';
  currentUserId = '';
  
  private pollingInterval: any;
  private pollingPublicoInterval: any;

  ngOnInit() {
    this.currentUserId = this.authService.user()?.id || '';
    this.cargarUsuarios();
    this.cargarMensajesPublicos();
    this.iniciarPolling();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  cargarUsuarios() {
    this.http.get<Usuario[]>('/api/chat/admin/usuarios').subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.usuariosFiltrados = data;
      },
      error: (err) => console.error('Error cargando usuarios:', err)
    });
  }

  filtrarUsuarios() {
    const usuariosList = this.usuarios();
    if (!this.busqueda.trim()) {
      this.usuariosFiltrados = usuariosList;
    } else {
      const term = this.busqueda.toLowerCase();
      this.usuariosFiltrados = usuariosList.filter(u => 
        (u.username || u.nombre || '').toLowerCase().includes(term)
      );
    }
  }

  seleccionarUsuario(usuario: Usuario) {
    this.usuarioSeleccionado.set(usuario);
    this.cargarMensajes(usuario._id);
  }

  cargarMensajes(usuarioId: string) {
    this.http.get<Mensaje[]>(`/api/chat/mensajes/${usuarioId}`).subscribe({
      next: (data) => {
        this.mensajes = data;
        this.scrollToBottom();
      },
      error: (err) => console.error('Error cargando mensajes:', err)
    });
  }

  cargarMensajesPublicos() {
    this.http.get<MensajePublico[]>('/api/chat/publico').subscribe({
      next: (data) => {
        this.mensajesPublicos = data;
      },
      error: (err) => console.error('Error cargando mensajes públicos:', err)
    });
  }

  enviarMensaje() {
    if (!this.nuevoMensaje.trim() || !this.usuarioSeleccionado()) return;

    const receptorId = this.usuarioSeleccionado()!._id;
    
    this.http.post('/api/chat/mensaje', {
      receptorId,
      mensaje: this.nuevoMensaje.trim()
    }).subscribe({
      next: () => {
        this.nuevoMensaje = '';
        this.cargarMensajes(receptorId);
      },
      error: (err) => console.error('Error enviando mensaje:', err)
    });
  }

  enviarMensajePublico() {
    if (!this.nuevoMensajePublico.trim()) return;

    const usuario = this.authService.user();
    const emisorNombre = usuario?.username || 'Usuario';

    this.http.post('/api/chat/publico', {
      emisorNombre,
      mensaje: this.nuevoMensajePublico.trim()
    }).subscribe({
      next: () => {
        this.nuevoMensajePublico = '';
        this.cargarMensajesPublicos();
      },
      error: (err) => console.error('Error enviando mensaje:', err)
    });
  }

  getInitials(nombre: string): string {
    if (!nombre) return '?';
    const parts = nombre.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  }

  getRolLabel(rol: string): string {
    const labels: Record<string, string> = {
      'root': 'Administrador',
      'admin': 'Admin',
      'owner': 'Propietario',
      'usuario': 'Usuario',
    };
    return labels[rol] || rol;
  }

  formatearFecha(fecha: Date | string): string {
    const date = new Date(fecha);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('es-VE', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private scrollToBottom() {
    if (this.tabActiva === 'privado' && this.mensajesContainer) {
      const el = this.mensajesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } else if (this.tabActiva === 'publico' && this.mensajesPublicosContainer) {
      const el = this.mensajesPublicosContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  private iniciarPolling() {
    this.pollingInterval = setInterval(() => {
      if (this.tabActiva === 'privado' && this.usuarioSeleccionado()) {
        this.cargarMensajes(this.usuarioSeleccionado()!._id);
      }
    }, 5000);

    this.pollingPublicoInterval = setInterval(() => {
      if (this.tabActiva === 'publico') {
        this.cargarMensajesPublicos();
      }
    }, 5000);
  }
}