import { HttpClient } from '@angular/common/http';

import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

interface PagoQrPublico {
  montoBs: number;
  destino: {
    banco: string;
    bancoNombre: string;
    telefono: string;
    rif: string;
    titular: string;
  };
  estado:
    | 'esperando'
    | 'enviado'
    | 'validando'
    | 'validado'
    | 'rechazado'
    | 'cancelado'
    | 'vencido';
  mensaje: string | null;
  expiraEn: string;
  intentosRestantes: number;
}

@Component({
  selector: 'app-pago-qr',
  imports: [FormsModule],
  templateUrl: './pago-qr.html',
  styleUrl: './pago-qr.css',
})
export class PagoQr implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') || '';
  private readonly base = `${environment.apiUrl}/pago-qr/solicitudes/${encodeURIComponent(this.token)}`;
  private intervalo: ReturnType<typeof setInterval> | null = null;
  private consultando = false;

  readonly bancos = [
    { codigo: '0102', nombre: 'Banco de Venezuela' },
    { codigo: '0104', nombre: 'Venezolano de Crédito' },
    { codigo: '0105', nombre: 'Mercantil' },
    { codigo: '0108', nombre: 'BBVA Provincial' },
    { codigo: '0114', nombre: 'Bancaribe' },
    { codigo: '0115', nombre: 'Banco Exterior' },
    { codigo: '0128', nombre: 'Banco Caroní' },
    { codigo: '0134', nombre: 'Banesco' },
    { codigo: '0137', nombre: 'Sofitasa' },
    { codigo: '0138', nombre: 'Banco Plaza' },
    { codigo: '0146', nombre: 'Bangente' },
    { codigo: '0151', nombre: 'BFC Banco Fondo Común' },
    { codigo: '0156', nombre: '100% Banco' },
    { codigo: '0157', nombre: 'DelSur' },
    { codigo: '0163', nombre: 'Banco del Tesoro' },
    { codigo: '0166', nombre: 'Banco Agrícola de Venezuela' },
    { codigo: '0168', nombre: 'Bancrecer' },
    { codigo: '0169', nombre: 'R4 / Mi Banco' },
    { codigo: '0171', nombre: 'Banco Activo' },
    { codigo: '0172', nombre: 'Bancamiga' },
    { codigo: '0173', nombre: 'Banco Internacional de Desarrollo' },
    { codigo: '0174', nombre: 'Banplus' },
    { codigo: '0175', nombre: 'Banco Digital de los Trabajadores' },
    { codigo: '0177', nombre: 'Banfanb' },
    { codigo: '0178', nombre: 'N58 Banco Digital' },
    { codigo: '0191', nombre: 'BNC Nacional de Crédito' },
  ];

  solicitud: PagoQrPublico | null = null;
  cargando = true;
  enviando = false;
  error = '';
  copiado = '';
  nacionalidad = 'V';
  cedula = '';
  telefono = '';
  banco = '';
  referencia = '';
  fechaPago = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date());

  get puedeEnviar(): boolean {
    return Boolean(
      this.solicitud &&
      ['esperando', 'rechazado'].includes(this.solicitud.estado) &&
      this.solicitud.intentosRestantes > 0,
    );
  }

  get vencido(): boolean {
    return this.solicitud?.estado === 'vencido' || this.solicitud?.estado === 'cancelado';
  }

  ngOnInit(): void {
    if (!this.token) {
      this.cargando = false;
      this.error = 'El enlace de pago no es válido.';
      return;
    }
    void this.consultar();
    this.intervalo = setInterval(() => void this.consultar(), 2500);
  }

  ngOnDestroy(): void {
    if (this.intervalo) clearInterval(this.intervalo);
  }

  async consultar(): Promise<void> {
    if (this.consultando || !this.token) return;
    this.consultando = true;
    try {
      this.solicitud = await firstValueFrom(this.http.get<PagoQrPublico>(this.base));
      this.cargando = false;
      if (this.solicitud.estado === 'rechazado')
        this.error =
          this.solicitud.mensaje ||
          'El banco no confirmó el pago. Revisa los datos e inténtalo otra vez.';
      else if (this.solicitud.estado === 'vencido' || this.solicitud.estado === 'cancelado')
        this.error =
          this.solicitud.mensaje ||
          'Esta solicitud ya no está activa. Pide un nuevo QR en la caja.';
      else this.error = '';
      if (['validado', 'vencido', 'cancelado'].includes(this.solicitud.estado) && this.intervalo) {
        clearInterval(this.intervalo);
        this.intervalo = null;
      }
    } catch (error) {
      this.cargando = false;
      this.error = this.mensajeError(
        error,
        'No se pudo consultar la solicitud. Revisa tu conexión.',
      );
    } finally {
      this.consultando = false;
    }
  }

  async enviarDatos(): Promise<void> {
    if (!this.puedeEnviar || this.enviando) return;
    this.error = '';
    this.enviando = true;
    try {
      await firstValueFrom(
        this.http.post(`${this.base}/datos`, {
          cedula: `${this.nacionalidad}${this.cedula.replace(/\D/g, '')}`,
          telefono: this.telefono.replace(/\D/g, ''),
          banco: this.banco,
          referencia: this.referencia.replace(/\D/g, ''),
          fechaPago: this.fechaPago,
        }),
      );
      this.solicitud = this.solicitud ? { ...this.solicitud, estado: 'enviado' } : null;
      this.error = '';
    } catch (error) {
      this.error = this.mensajeError(error, 'No se pudieron enviar los datos del pago.');
    } finally {
      this.enviando = false;
    }
  }

  async copiar(valor: string, campo: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(valor);
      this.copiado = campo;
      setTimeout(() => {
        if (this.copiado === campo) this.copiado = '';
      }, 1500);
    } catch {
      this.error = 'No se pudo copiar. Mantén presionado el dato para copiarlo manualmente.';
    }
  }

  monto(n: number): string {
    return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private mensajeError(error: unknown, alternativo: string): string {
    const body = error instanceof Error && 'error' in error
      ? error.error
      : typeof error === 'object' && error !== null && 'error' in error
        ? error.error
        : undefined;
    const message = typeof body === 'object' && body !== null && 'message' in body
      ? body.message
      : undefined;
    return typeof message === 'string' ? message : alternativo;
  }
}
