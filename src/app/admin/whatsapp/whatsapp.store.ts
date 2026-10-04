import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { io, Socket } from 'socket.io-client';

export type Direccion = 'entrante' | 'saliente';
export type TipoMensaje = 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contacts' | 'unsupported';
export type EstadoMensaje = 'enviando' | 'enviado' | 'entregado' | 'leido' | 'fallido' | 'recibido';

export interface WaMensaje {
  id: string;
  waMessageId?: string;
  waId: string;
  direccion: Direccion;
  tipo: TipoMensaje;
  texto?: string;
  media?: { mimetype: string; nombre?: string; size?: number; estado: 'pendiente' | 'listo' | 'error' };
  ubicacion?: { latitud: number; longitud: number; nombre?: string; direccion?: string };
  estado: EstadoMensaje;
  error?: string;
  cita?: { id: string; direccion: Direccion; tipo: TipoMensaje; texto?: string };
  reaccion?: string;
  enviadoPor?: { userId: string; nombre: string };
  fecha: string;
}

export interface WaConversacion {
  waId: string;
  nombre?: string;
  alias?: string;
  cliente?: { nombre?: string; empresa?: string; planta?: string; cedula?: string };
  ultimoMensaje?: Pick<WaMensaje, 'id' | 'direccion' | 'tipo' | 'texto' | 'estado' | 'fecha'>;
  noLeidos: number;
  ultimoEntranteEn?: string;
  updatedAt: string;
}

interface Hilo {
  mensajes: WaMensaje[];
  hayMas: boolean;
  cargando: boolean;
}

export type EstadoConexion = 'conectando' | 'conectado' | 'desconectado' | 'sin-permiso';

const API = '/api/whatsapp';
const PAGINA = 50;

/**
 * Estado de la bandeja de WhatsApp: conversaciones, mensajes por conversación y
 * adjuntos. Se alimenta por REST al abrir y luego en tiempo real por socket.io
 * (sala 'whatsapp', que manda los mensajes completos). Al reconectar se vuelve a
 * sincronizar por REST por si algo llegó mientras el socket estaba caído.
 * Se provee a nivel de la página: vive y muere con ella.
 */
@Injectable()
export class WhatsAppStore implements OnDestroy {
  private http = inject(HttpClient);
  private socket: Socket | null = null;
  private objectUrls = new Map<string, string>();
  private descargasEnCurso = new Set<string>();

  readonly conexion = signal<EstadoConexion>('conectando');
  readonly configurado = signal(true);
  readonly cuenta = signal<{ numero: string; nombre: string } | null>(null);
  readonly conversaciones = signal<WaConversacion[]>([]);
  readonly cargandoConversaciones = signal(true);
  readonly hilos = signal<Record<string, Hilo>>({});
  /** URLs locales (blob:) de los adjuntos ya descargados, por id de mensaje. */
  readonly mediaUrls = signal<Record<string, string>>({});

  /** Motivo por el que el tiempo real no está activo (se muestra en el indicador). */
  readonly errorConexion = signal<string | null>(null);
  readonly refrescando = signal(false);
  /** Transporte de socket.io en uso: 'websocket', o 'polling' si el proxy no deja pasar WebSocket. */
  readonly transporte = signal<string | null>(null);

  readonly totalNoLeidos = computed(() => this.conversaciones().reduce((t, c) => t + (c.noLeidos > 0 ? 1 : 0), 0));

  /** Conversación abierta en pantalla: es la única cuyo hilo se resincroniza. */
  hiloActivo: string | null = null;

  private sincronizador?: ReturnType<typeof setInterval>;
  private ultimaSincronizacion = 0;
  private sincronizando = false;
  private alVolver = () => {
    if (document.visibilityState === 'visible') this.sincronizar();
  };

  iniciar() {
    this.cargarEstado();
    this.cargarConversaciones();
    this.conectar();

    // Red de seguridad por si el tiempo real falla (proxy, red, sesión): cada 5 s se mira
    // si toca sincronizar; sin socket se sincroniza siempre, con socket cada 30 s.
    this.sincronizador = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const intervalo = this.conexion() === 'conectado' ? 30000 : 5000;
      if (Date.now() - this.ultimaSincronizacion >= intervalo) this.sincronizar();
    }, 5000);
    document.addEventListener('visibilitychange', this.alVolver);
    window.addEventListener('focus', this.alVolver);
  }

  ngOnDestroy() {
    clearInterval(this.sincronizador);
    document.removeEventListener('visibilitychange', this.alVolver);
    window.removeEventListener('focus', this.alVolver);
    this.socket?.disconnect();
    this.socket = null;
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.objectUrls.clear();
  }

  // ---------------------------------------------------------------- REST

  private cargarEstado() {
    this.http.get<{ configurado: boolean; cuenta: { numero: string; nombre: string } | null }>(`${API}/estado`).subscribe({
      next: (r) => {
        this.configurado.set(r.configurado);
        this.cuenta.set(r.cuenta);
      },
      error: (err) => {
        if (err.status === 403) this.conexion.set('sin-permiso');
      },
    });
  }

  cargarConversaciones(): Promise<void> {
    return new Promise((resolve) => {
      this.http.get<WaConversacion[]>(`${API}/conversaciones`).subscribe({
        next: (lista) => {
          this.conversaciones.set(lista);
          this.cargandoConversaciones.set(false);
          resolve();
        },
        error: (err) => {
          console.error('Error cargando conversaciones de WhatsApp:', err);
          if (err.status === 403) this.conexion.set('sin-permiso');
          this.cargandoConversaciones.set(false);
          resolve();
        },
      });
    });
  }

  /** Trae de nuevo la lista y el hilo abierto (sin parpadeos: se fusiona con lo que ya hay). */
  async sincronizar(): Promise<void> {
    if (this.sincronizando || this.conexion() === 'sin-permiso') return;
    this.sincronizando = true;
    this.ultimaSincronizacion = Date.now();
    try {
      await Promise.all([this.cargarConversaciones(), this.hiloActivo ? this.abrirHilo(this.hiloActivo) : Promise.resolve()]);
    } finally {
      this.sincronizando = false;
    }
  }

  /** Botón "Actualizar": sincroniza y, si el tiempo real no está activo, lo reconecta. */
  async refrescar(): Promise<void> {
    if (this.refrescando()) return;
    this.refrescando.set(true);
    try {
      if (this.socket && this.conexion() !== 'conectado' && this.conexion() !== 'sin-permiso') {
        if (this.socket.connected) this.unirseSala(true, () => undefined);
        else this.socket.connect();
      }
      await this.sincronizar();
    } finally {
      // Un mínimo visible para que se note que se actualizó.
      setTimeout(() => this.refrescando.set(false), 400);
    }
  }

  /** Carga la página más reciente de una conversación (o la vuelve a sincronizar si ya estaba cargada). */
  async abrirHilo(waId: string): Promise<void> {
    const actual = this.hilos()[waId];
    if (!actual) this.setHilo(waId, { mensajes: [], hayMas: false, cargando: true });
    try {
      const r = await firstValueFrom(
        this.http.get<{ mensajes: WaMensaje[]; hayMas: boolean }>(`${API}/conversaciones/${waId}/mensajes`, { params: { limite: PAGINA } }),
      );
      const previos = this.hilos()[waId]?.mensajes ?? [];
      // Al resincronizar se conservan los mensajes viejos ya cargados con scroll hacia arriba.
      const masViejos = actual && r.mensajes.length ? previos.filter((m) => m.fecha < r.mensajes[0].fecha) : [];
      this.setHilo(waId, {
        mensajes: [...masViejos, ...r.mensajes],
        hayMas: masViejos.length ? (actual?.hayMas ?? r.hayMas) : r.hayMas,
        cargando: false,
      });
    } catch (err) {
      console.error('Error cargando mensajes de WhatsApp:', err);
      const h = this.hilos()[waId];
      if (h) this.setHilo(waId, { ...h, cargando: false });
    }
  }

  /** Mensajes anteriores (scroll hacia arriba). Devuelve cuántos se agregaron. */
  async cargarAnteriores(waId: string): Promise<number> {
    const h = this.hilos()[waId];
    if (!h || h.cargando || !h.hayMas || !h.mensajes.length) return 0;
    this.setHilo(waId, { ...h, cargando: true });
    try {
      const r = await firstValueFrom(
        this.http.get<{ mensajes: WaMensaje[]; hayMas: boolean }>(`${API}/conversaciones/${waId}/mensajes`, {
          params: { limite: PAGINA, antes: h.mensajes[0].id },
        }),
      );
      const actual = this.hilos()[waId] ?? h;
      const ids = new Set(actual.mensajes.map((m) => m.id));
      const nuevos = r.mensajes.filter((m) => !ids.has(m.id));
      this.setHilo(waId, { mensajes: [...nuevos, ...actual.mensajes], hayMas: r.hayMas, cargando: false });
      return nuevos.length;
    } catch (err) {
      console.error('Error cargando mensajes anteriores:', err);
      this.setHilo(waId, { ...(this.hilos()[waId] ?? h), cargando: false });
      return 0;
    }
  }

  async enviarTexto(waId: string, texto: string, citaId?: string): Promise<void> {
    const m = await firstValueFrom(this.http.post<WaMensaje>(`${API}/conversaciones/${waId}/mensajes`, { texto, citaId }));
    this.upsertMensaje(m);
  }

  /** Sube y envía un archivo, informando el progreso de subida (0-100). */
  enviarArchivo(waId: string, archivo: File, texto: string, citaId: string | undefined, progreso: (p: number) => void): Promise<void> {
    const form = new FormData();
    form.append('archivo', archivo, archivo.name);
    if (texto) form.append('texto', texto);
    if (citaId) form.append('citaId', citaId);

    return new Promise((resolve, reject) => {
      this.http.post<WaMensaje>(`${API}/conversaciones/${waId}/media`, form, { reportProgress: true, observe: 'events' }).subscribe({
        next: (ev) => {
          if (ev.type === HttpEventType.UploadProgress && ev.total) progreso(Math.round((ev.loaded / ev.total) * 100));
          if (ev.type === HttpEventType.Response && ev.body) {
            // El archivo ya está en el navegador: se usa directo en vez de volver a descargarlo.
            this.registrarUrl(ev.body.id, URL.createObjectURL(archivo));
            this.upsertMensaje(ev.body);
            resolve();
          }
        },
        error: reject,
      });
    });
  }

  reintentar(mensaje: WaMensaje): Promise<unknown> {
    return firstValueFrom(this.http.post(`${API}/mensajes/${mensaje.id}/reintentar`, {}));
  }

  reintentarDescarga(mensaje: WaMensaje) {
    this.http.post(`${API}/mensajes/${mensaje.id}/descargar`, {}).subscribe({ error: (e) => console.error(e) });
  }

  marcarLeida(waId: string) {
    const conv = this.conversaciones().find((c) => c.waId === waId);
    if (!conv || conv.noLeidos === 0) return;
    this.actualizarConversacion({ ...conv, noLeidos: 0 });
    this.http.post<WaConversacion>(`${API}/conversaciones/${waId}/leer`, {}).subscribe({
      error: (e) => console.error('Error marcando conversación como leída:', e),
    });
  }

  renombrar(waId: string, alias: string): Promise<WaConversacion> {
    return firstValueFrom(this.http.patch<WaConversacion>(`${API}/conversaciones/${waId}`, { alias })).then((c) => {
      this.actualizarConversacion(c);
      return c;
    });
  }

  /** Descarga (una sola vez) el adjunto de un mensaje y deja su URL local en mediaUrls. */
  cargarMedia(m: WaMensaje) {
    if (m.media?.estado !== 'listo' || this.objectUrls.has(m.id) || this.descargasEnCurso.has(m.id)) return;
    this.descargasEnCurso.add(m.id);
    this.http.get(`${API}/media/${m.id}`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.descargasEnCurso.delete(m.id);
        this.registrarUrl(m.id, URL.createObjectURL(blob));
      },
      error: (err) => {
        this.descargasEnCurso.delete(m.id);
        console.error('Error descargando adjunto de WhatsApp:', err);
      },
    });
  }

  private registrarUrl(id: string, url: string) {
    const previa = this.objectUrls.get(id);
    if (previa) URL.revokeObjectURL(previa);
    this.objectUrls.set(id, url);
    this.mediaUrls.update((m) => ({ ...m, [id]: url }));
  }

  // ---------------------------------------------------------------- Tiempo real

  private conectar() {
    // Arranca por HTTP (polling) y sube a WebSocket si el proxy lo permite: si el upgrade
    // falla, la conexión sigue viva por HTTP en vez de quedarse sin tiempo real.
    this.socket = io(window.location.origin, { transports: ['polling', 'websocket'] });
    let primeraConexion = true;
    const actualizarTransporte = () => this.transporte.set(this.socket?.io.engine?.transport?.name ?? null);

    this.socket.on('connect', () => {
      actualizarTransporte();
      this.socket?.io.engine.once('upgrade', actualizarTransporte);
      this.unirseSala(true, () => {
        if (!primeraConexion) this.resincronizar();
        primeraConexion = false;
      });
    });
    this.socket.on('disconnect', (motivo) => {
      if (this.conexion() === 'sin-permiso') return;
      this.conexion.set('desconectado');
      this.errorConexion.set(`Conexión perdida (${motivo}). Se actualiza cada 5 s mientras se reconecta.`);
    });
    this.socket.on('connect_error', (err) => {
      if (this.conexion() === 'sin-permiso') return;
      this.conexion.set('desconectado');
      this.errorConexion.set(`No se pudo conectar el tiempo real (${err.message}). Se actualiza cada 5 s.`);
    });
    this.socket.io.on('reconnect_attempt', () => {
      if (this.conexion() !== 'sin-permiso') this.conexion.set('conectando');
    });

    this.socket.on('wa:mensaje', ({ mensaje, conversacion }: { mensaje: WaMensaje; conversacion?: WaConversacion }) => {
      this.upsertMensaje(mensaje);
      if (conversacion) this.actualizarConversacion(conversacion);
    });
    this.socket.on('wa:conversacion', ({ conversacion }: { conversacion: WaConversacion }) => this.actualizarConversacion(conversacion));
    this.socket.on('wa:mensaje-eliminado', ({ id, waId }: { id: string; waId: string }) => {
      const h = this.hilos()[waId];
      if (h) this.setHilo(waId, { ...h, mensajes: h.mensajes.filter((m) => m.id !== id) });
    });
  }

  /**
   * La sala exige sesión válida (cookie o token guardado). Si el servidor no responde en
   * 8 s o rechaza por token vencido, se renueva el token con una petición REST y se
   * reintenta una vez; si aun así falla, queda la sincronización periódica como respaldo.
   */
  private unirseSala(reintentar: boolean, alUnirse: () => void) {
    const token = localStorage.getItem('accessToken');
    this.socket?.timeout(8000).emit('join-whatsapp-room', token, (err: Error | null, r?: { ok: boolean; error?: string }) => {
      if (!err && r?.ok) {
        this.conexion.set('conectado');
        this.errorConexion.set(null);
        alUnirse();
        return;
      }
      const motivo = err ? 'el servidor no respondió' : r?.error || 'rechazado';
      console.warn(`WhatsApp: no se pudo activar el tiempo real (${motivo})`);
      if (r?.error === 'Sin permiso') {
        this.conexion.set('sin-permiso');
        return;
      }
      this.conexion.set('desconectado');
      this.errorConexion.set(`Tiempo real no disponible (${motivo}). Se actualiza cada 5 s.`);
      if (reintentar) {
        this.http.get(`${API}/estado`).subscribe({
          next: () => this.unirseSala(false, alUnirse),
          error: () => undefined,
        });
      }
    });
  }

  /** Tras una reconexión: recargar lista e hilo abierto, por si algo llegó mientras tanto. */
  private resincronizar() {
    this.sincronizar();
  }

  // ---------------------------------------------------------------- Helpers de estado

  private setHilo(waId: string, hilo: Hilo) {
    this.hilos.update((h) => ({ ...h, [waId]: hilo }));
  }

  private upsertMensaje(m: WaMensaje) {
    const h = this.hilos()[m.waId];
    if (h) {
      const i = h.mensajes.findIndex((x) => x.id === m.id);
      let lista: WaMensaje[];
      if (i >= 0) {
        lista = [...h.mensajes];
        lista[i] = m;
      } else {
        lista = [...h.mensajes, m].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
      }
      this.setHilo(m.waId, { ...h, mensajes: lista });
    }

    // Reflejar el nuevo estado (ticks) si es el último mensaje de la conversación.
    const conv = this.conversaciones().find((c) => c.waId === m.waId);
    if (conv?.ultimoMensaje?.id === m.id) {
      this.actualizarConversacion({
        ...conv,
        ultimoMensaje: { id: m.id, direccion: m.direccion, tipo: m.tipo, texto: m.texto, estado: m.estado, fecha: m.fecha },
      });
    }
  }

  private actualizarConversacion(c: WaConversacion) {
    this.conversaciones.update((lista) =>
      [c, ...lista.filter((x) => x.waId !== c.waId)].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0)),
    );
  }
}
