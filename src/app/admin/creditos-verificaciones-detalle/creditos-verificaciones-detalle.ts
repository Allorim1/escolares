import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

type Estado = 'sin_verificar' | 'en_revision' | 'verificado' | 'rechazado';

interface DocumentoArchivo {
  path: string;
  mimetype: string;
  size: number;
}

interface Verificacion {
  nombreCompleto: string;
  documento: string;
  fechaNacimiento: string;
  direccion: string;
  ciudad: string;
  referenciaNombre: string;
  referenciaTelefono: string;
  ocupacion: string;
  lugarTrabajo?: string;
  documentos: Partial<Record<string, DocumentoArchivo>>;
  enviadoEn: string;
  revisadoPor?: string;
  revisadoEn?: string;
  motivoRechazo?: string;
}

interface CreditoUsuario {
  id: string;
  nombre: string;
  telefono: string;
  email?: string;
  nivel: number;
  status: Estado;
  createdAt: string;
  verificacion?: Verificacion;
}

const DOCUMENTOS: { campo: string; titulo: string }[] = [
  { campo: 'fotoCedula', titulo: 'Cédula de identidad' },
  { campo: 'fotoSelfie', titulo: 'Selfie de identidad' },
  { campo: 'fotoComprobantePago', titulo: 'Último comprobante de pago' },
  { campo: 'fotoConstanciaTrabajo', titulo: 'Constancia de trabajo vigente' },
  { campo: 'fotoReferenciaBancaria', titulo: 'Referencia bancaria' },
  { campo: 'fotoSoporteBeneficio', titulo: 'Soporte del beneficio escolar' },
];

@Component({
  selector: 'app-creditos-verificaciones-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creditos-verificaciones-detalle.html',
  styleUrl: './creditos-verificaciones-detalle.css',
})
export class CreditosVerificacionesDetalle implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly documentos = DOCUMENTOS;

  id = '';
  usuario = signal<CreditoUsuario | null>(null);
  loading = signal(false);
  procesando = signal(false);
  nivelMaximo = signal(5);
  motivoRechazo = signal('');
  mostrarRechazo = signal(false);

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.cargar();
    this.http.get<{ nivelMaximo: number }>('/api/creditos/admin/reglas').subscribe({
      next: (r) => this.nivelMaximo.set(r.nivelMaximo),
    });
  }

  private api(sufijo = ''): string {
    return `/api/creditos/admin/usuarios/${this.id}${sufijo}`;
  }

  cargar() {
    this.loading.set(true);
    this.http.get<CreditoUsuario>(this.api()).subscribe({
      next: (data) => {
        this.usuario.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando usuario:', err);
        this.loading.set(false);
      },
    });
  }

  documentoUrl(campo: string): string {
    return this.api(`/documentos/${campo}`);
  }

  esPdf(campo: string): boolean {
    return this.usuario()?.verificacion?.documentos?.[campo]?.mimetype === 'application/pdf';
  }

  etiqueta(status: Estado): { texto: string; clase: string } {
    switch (status) {
      case 'verificado': return { texto: 'Verificada', clase: 'badge-success' };
      case 'en_revision': return { texto: 'En revisión', clase: 'badge-warning' };
      case 'rechazado': return { texto: 'Rechazada', clase: 'badge-danger' };
      default: return { texto: 'Sin verificar', clase: 'badge-medium' };
    }
  }

  aprobar() {
    if (!confirm('¿Aprobar la verificación de esta cuenta?')) return;
    this.procesando.set(true);
    this.http.post(this.api('/verificacion/aprobar'), {}).subscribe({
      next: () => { this.procesando.set(false); this.cargar(); },
      error: (err) => { this.procesando.set(false); alert(err.error?.error || 'Error al aprobar'); },
    });
  }

  abrirRechazo() {
    this.mostrarRechazo.set(true);
  }

  confirmarRechazo() {
    this.procesando.set(true);
    this.http.post(this.api('/verificacion/rechazar'), { motivo: this.motivoRechazo() }).subscribe({
      next: () => { this.procesando.set(false); this.mostrarRechazo.set(false); this.motivoRechazo.set(''); this.cargar(); },
      error: (err) => { this.procesando.set(false); alert(err.error?.error || 'Error al rechazar'); },
    });
  }

  cambiarNivel(delta: number) {
    const actual = this.usuario()?.nivel || 1;
    const nuevo = Math.min(Math.max(actual + delta, 1), this.nivelMaximo());
    if (nuevo === actual) return;
    this.procesando.set(true);
    this.http.post<CreditoUsuario>(this.api('/nivel'), { nivel: nuevo }).subscribe({
      next: (data) => { this.usuario.set(data); this.procesando.set(false); },
      error: (err) => { this.procesando.set(false); alert(err.error?.error || 'Error al cambiar el nivel'); },
    });
  }

  volver() {
    this.router.navigate(['/admin/creditos-verificaciones']);
  }
}
