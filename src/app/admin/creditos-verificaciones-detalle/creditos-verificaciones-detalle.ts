import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state';
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
  imports: [CommonModule, FormsModule, StatusBadgeComponent, SkeletonComponent, EmptyStateComponent],
  templateUrl: './creditos-verificaciones-detalle.html',
  styleUrl: './creditos-verificaciones-detalle.css',
})
export class CreditosVerificacionesDetalle implements OnInit {
  private http = inject(HttpClient);
  private notifications = inject(NotificationModalService);
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
  private lastFocused: HTMLElement | null = null;

  async ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.cargar();
    this.http.get<{ nivelMaximo: number }>('/api/creditos/admin/reglas').subscribe({
      next: (r) => this.nivelMaximo.set(r.nivelMaximo),
    });
  }

  private api(sufijo = ''): string {
    return `/api/creditos/admin/usuarios/${this.id}${sufijo}`;
  }

  async cargar() {
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

  etiqueta(status: Estado): { texto: string; tone: 'success'|'warning'|'danger'|'info'|'neutral' } {
    switch (status) {
      case 'verificado': return { texto: 'Verificada', tone: 'success' };
      case 'en_revision': return { texto: 'En revisión', tone: 'warning' };
      case 'rechazado': return { texto: 'Rechazada', tone: 'danger' };
      default: return { texto: 'Sin verificar', tone: 'neutral' };
    }
  }

  async aprobar() {
    const ok = await this.notifications.confirm({ titulo: 'Confirmar acción', mensaje: '¿Aprobar la verificación de esta cuenta?', tipo: 'warning', confirmarTexto: 'Confirmar' });
    if (!ok) return;
    this.procesando.set(true);
    this.http.post(this.api('/verificacion/aprobar'), {}).subscribe({
      next: () => { this.procesando.set(false); this.cargar(); },
      error: (err) => { this.procesando.set(false); this.notifications.fromHttpError(err, 'Error al aprobar'); },
    });
  }

  abrirRechazo() {
    this.lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.mostrarRechazo.set(true);
  }

  cerrarRechazo() {
    this.mostrarRechazo.set(false);
    const el=this.lastFocused; this.lastFocused=null; setTimeout(()=>el?.focus(),0);
  }

  confirmarRechazo() {
    this.procesando.set(true);
    this.http.post(this.api('/verificacion/rechazar'), { motivo: this.motivoRechazo() }).subscribe({
      next: () => { this.procesando.set(false); this.mostrarRechazo.set(false); this.motivoRechazo.set(''); this.cargar(); const el=this.lastFocused; this.lastFocused=null; setTimeout(()=>el?.focus(),0); },
      error: (err) => { this.procesando.set(false); this.notifications.fromHttpError(err, 'Error al rechazar'); },
    });
  }

  cambiarNivel(delta: number) {
    const actual = this.usuario()?.nivel || 1;
    const nuevo = Math.min(Math.max(actual + delta, 1), this.nivelMaximo());
    if (nuevo === actual) return;
    this.procesando.set(true);
    this.http.post<CreditoUsuario>(this.api('/nivel'), { nivel: nuevo }).subscribe({
      next: (data) => { this.usuario.set(data); this.procesando.set(false); },
      error: (err) => { this.procesando.set(false); this.notifications.fromHttpError(err, 'Error al cambiar el nivel'); },
    });
  }

  volver() {
    this.router.navigate(['/admin/creditos-verificaciones']);
  }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.mostrarRechazo()) this.cerrarRechazo(); }
}
