import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface SolicitudRestablecimiento {
  id: string;
  nombre: string;
  telefono: string;
  solicitadaEn: string;
}

/** Clientes sin email registrado que pidieron "olvidé mi contraseña" desde la app: no se les
 *  puede mandar un código, así que hay que llamarlos y darles una contraseña temporal a mano. */
@Component({
  selector: 'app-creditos-restablecimientos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './creditos-restablecimientos.html',
  styleUrl: './creditos-restablecimientos.css',
})
export class CreditosRestablecimientos implements OnInit {
  private http = inject(HttpClient);
  private readonly API = '/api/creditos/admin';

  solicitudes = signal<SolicitudRestablecimiento[]>([]);
  loading = signal(false);
  procesandoId = signal<string | null>(null);

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.loading.set(true);
    this.http.get<SolicitudRestablecimiento[]>(`${this.API}/restablecimientos`).subscribe({
      next: (data) => { this.solicitudes.set(data); this.loading.set(false); },
      error: (err) => { console.error('Error cargando restablecimientos:', err); this.loading.set(false); },
    });
  }

  restablecer(s: SolicitudRestablecimiento) {
    if (!confirm(`¿Generar una contraseña temporal para ${s.nombre}? Confirma primero su identidad por teléfono.`)) return;
    this.procesandoId.set(s.id);
    this.http.post<{ passwordTemporal: string }>(`${this.API}/usuarios/${s.id}/restablecer-password`, {}).subscribe({
      next: (res) => {
        this.procesandoId.set(null);
        alert(`Contraseña temporal para ${s.nombre}: ${res.passwordTemporal}\n\nDíctasela por teléfono; puede cambiarla luego desde su Perfil.`);
        this.cargar();
      },
      error: (err) => { this.procesandoId.set(null); alert(err.error?.error || 'Error al restablecer la contraseña'); },
    });
  }
}
