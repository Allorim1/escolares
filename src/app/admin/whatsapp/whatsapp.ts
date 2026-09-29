import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { WaConversacion, WaMensaje, WhatsAppStore } from './whatsapp.store';

type Item =
  | { clase: 'dia'; clave: string; etiqueta: string }
  | { clase: 'msg'; clave: string; m: WaMensaje; agrupado: boolean };

interface Adjunto {
  archivo: File;
  preview?: string;
}

const MB = 1024 * 1024;

/** Mensaje de error que devuelve la API ({ error: '...' }) o uno por defecto. */
function mensajeError(err: unknown, porDefecto: string): string {
  const cuerpo = err instanceof HttpErrorResponse ? err.error : null;
  return (cuerpo && typeof cuerpo === 'object' && typeof cuerpo.error === 'string' && cuerpo.error) || porDefecto;
}
const VENTANA_MS = 24 * 60 * 60 * 1000;
const TITULO_ORIGINAL = typeof document !== 'undefined' ? document.title : '';

@Component({
  selector: 'app-whatsapp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [WhatsAppStore],
  templateUrl: './whatsapp.html',
  styleUrl: './whatsapp.css',
})
export class WhatsApp implements OnInit, OnDestroy {
  readonly store = inject(WhatsAppStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild('scroller') scroller?: ElementRef<HTMLDivElement>;
  @ViewChild('entrada') entrada?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('selectorArchivo') selectorArchivo?: ElementRef<HTMLInputElement>;
  @ViewChild('inputNombre') inputNombre?: ElementRef<HTMLInputElement>;

  readonly seleccionado = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly soloNoLeidos = signal(false);

  texto = '';
  readonly adjunto = signal<Adjunto | null>(null);
  readonly citando = signal<WaMensaje | null>(null);
  readonly enviando = signal(false);
  readonly progreso = signal<number | null>(null);
  readonly errorEnvio = signal<string | null>(null);
  readonly arrastrando = signal(false);
  readonly lightbox = signal<string | null>(null);
  readonly editandoNombre = signal(false);
  nombreEditado = '';
  readonly hayNuevosAbajo = signal(false);

  /** Reloj para refrescar la ventana de 24 h y las horas relativas sin recargar. */
  private readonly ahora = signal(Date.now());
  private reloj?: ReturnType<typeof setInterval>;
  private pegadoAbajo = true;
  private ultimoId: string | null = null;
  private audio?: AudioContext;

  readonly conversacionesFiltradas = computed(() => {
    const q = this.normalizar(this.busqueda());
    return this.store.conversaciones().filter((c) => {
      if (this.soloNoLeidos() && c.noLeidos === 0) return false;
      if (!q) return true;
      return [c.waId, c.alias, c.nombre, c.cliente?.nombre, c.cliente?.empresa, c.cliente?.planta]
        .some((v) => v && this.normalizar(v).includes(q));
    });
  });

  readonly conversacion = computed(() => this.store.conversaciones().find((c) => c.waId === this.seleccionado()) ?? null);
  readonly hilo = computed(() => {
    const id = this.seleccionado();
    return id ? this.store.hilos()[id] ?? null : null;
  });

  readonly items = computed<Item[]>(() => {
    const items: Item[] = [];
    let diaAnterior = '';
    let anterior: WaMensaje | null = null;
    for (const m of this.hilo()?.mensajes ?? []) {
      const dia = new Date(m.fecha).toDateString();
      if (dia !== diaAnterior) {
        items.push({ clase: 'dia', clave: `d-${dia}`, etiqueta: this.etiquetaDia(m.fecha) });
        diaAnterior = dia;
        anterior = null;
      }
      const agrupado = !!anterior && anterior.direccion === m.direccion && +new Date(m.fecha) - +new Date(anterior.fecha) < 5 * 60 * 1000;
      items.push({ clase: 'msg', clave: m.id, m, agrupado });
      anterior = m;
    }
    return items;
  });

  /** Ventana de 24 h desde el último mensaje del cliente: fuera de ella WhatsApp solo acepta plantillas. */
  readonly ventana = computed(() => {
    const c = this.conversacion();
    if (!c?.ultimoEntranteEn) return { abierta: false, restante: '' };
    const restanteMs = +new Date(c.ultimoEntranteEn) + VENTANA_MS - this.ahora();
    if (restanteMs <= 0) return { abierta: false, restante: '' };
    const h = Math.floor(restanteMs / 3600000);
    const min = Math.floor((restanteMs % 3600000) / 60000);
    return { abierta: true, restante: h > 0 ? `${h} h ${min} min` : `${min} min` };
  });

  constructor() {
    // Descargar los adjuntos visibles del hilo abierto (imágenes, stickers, audio y video).
    effect(() => {
      for (const m of this.hilo()?.mensajes ?? []) {
        if (m.media?.estado === 'listo' && m.tipo !== 'document') this.store.cargarMedia(m);
      }
    });

    // Scroll: al llegar mensajes nuevos se baja solo si ya se estaba abajo; si no, se avisa.
    effect(() => {
      // Se mira solo el último mensaje: cargar anteriores (arriba) no debe mover el scroll.
      const mensajes = this.hilo()?.mensajes ?? [];
      const ultimo = mensajes[mensajes.length - 1];
      if (!ultimo || ultimo.id === this.ultimoId) return;
      const primeraCarga = this.ultimoId === null;
      this.ultimoId = ultimo.id;
      if (primeraCarga || this.pegadoAbajo || ultimo.direccion === 'saliente') {
        setTimeout(() => this.bajar(), 0);
      } else {
        this.hayNuevosAbajo.set(true);
      }
    });

    effect(() => {
      const n = this.store.totalNoLeidos();
      document.title = n > 0 ? `(${n}) WhatsApp · Escolares` : `WhatsApp · Escolares`;
    });
  }

  ngOnInit() {
    this.store.onEntrante = (m) => this.alRecibir(m);
    this.store.iniciar();
    this.reloj = setInterval(() => this.ahora.set(Date.now()), 30000);

    const chat = this.route.snapshot.queryParamMap.get('chat');
    if (chat) this.abrir(chat);
  }

  ngOnDestroy() {
    clearInterval(this.reloj);
    this.limpiarAdjunto();
    this.audio?.close().catch(() => undefined);
    document.title = TITULO_ORIGINAL;
  }

  // ---------------------------------------------------------------- Conversaciones

  abrir(waId: string) {
    if (this.seleccionado() === waId) return;
    this.seleccionado.set(waId);
    this.citando.set(null);
    this.errorEnvio.set(null);
    this.editandoNombre.set(false);
    this.hayNuevosAbajo.set(false);
    this.pegadoAbajo = true;
    this.ultimoId = null;
    this.router.navigate([], { queryParams: { chat: waId }, replaceUrl: true });
    this.store.abrirHilo(waId);
    this.marcarLeidaSiVisible();
    setTimeout(() => this.entrada?.nativeElement.focus(), 0);
  }

  cerrarChat() {
    this.seleccionado.set(null);
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  nombre(c: WaConversacion | null): string {
    if (!c) return '';
    return c.alias || c.nombre || c.cliente?.nombre || this.telefono(c.waId);
  }

  telefono(waId: string): string {
    // Venezuela: 58 + 10 dígitos -> +58 412-4402607
    const m = waId.match(/^58(\d{3})(\d{7})$/);
    return m ? `+58 ${m[1]}-${m[2]}` : `+${waId}`;
  }

  iniciales(c: WaConversacion): string {
    const n = c.alias || c.nombre || c.cliente?.nombre;
    if (!n) return '#';
    return n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  }

  colorAvatar(waId: string): string {
    let h = 0;
    for (const ch of waId) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return `hsl(${h}, 55%, 45%)`;
  }

  vistaPrevia(c: WaConversacion): string {
    const u = c.ultimoMensaje;
    if (!u) return '';
    const etiquetas: Record<string, string> = {
      image: '📷 Foto', video: '🎥 Video', audio: '🎤 Audio', document: '📄 Documento',
      sticker: '🏷️ Sticker', location: '📍 Ubicación', contacts: '👤 Contacto',
    };
    const base = etiquetas[u.tipo];
    if (base && u.texto) return `${base.split(' ')[0]} ${u.texto}`;
    return base || u.texto || '';
  }

  horaLista(fecha?: string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    const hoy = new Date(this.ahora());
    if (d.toDateString() === hoy.toDateString()) return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);
    if (d.toDateString() === ayer.toDateString()) return 'Ayer';
    if (+hoy - +d < 6 * 24 * 3600 * 1000) return d.toLocaleDateString('es-VE', { weekday: 'short' });
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  hora(fecha: string): string {
    return new Date(fecha).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  }

  private etiquetaDia(fecha: string): string {
    const d = new Date(fecha);
    const hoy = new Date();
    const ayer = new Date();
    ayer.setDate(hoy.getDate() - 1);
    if (d.toDateString() === hoy.toDateString()) return 'Hoy';
    if (d.toDateString() === ayer.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  iniciarRenombre() {
    this.nombreEditado = this.conversacion()?.alias || this.conversacion()?.nombre || '';
    this.editandoNombre.set(true);
    setTimeout(() => this.inputNombre?.nativeElement.select(), 0);
  }

  async guardarNombre() {
    const waId = this.seleccionado();
    if (!waId) return;
    try {
      await this.store.renombrar(waId, this.nombreEditado);
      this.editandoNombre.set(false);
    } catch {
      this.errorEnvio.set('No se pudo guardar el nombre');
    }
  }

  // ---------------------------------------------------------------- Lectura y avisos

  private alRecibir(m: WaMensaje) {
    const visible = document.visibilityState === 'visible';
    if (m.waId === this.seleccionado() && visible) {
      this.store.marcarLeida(m.waId);
    } else {
      this.sonar();
    }
  }

  private marcarLeidaSiVisible() {
    const waId = this.seleccionado();
    if (waId && document.visibilityState === 'visible') this.store.marcarLeida(waId);
  }

  @HostListener('document:visibilitychange')
  onVisibilidad() {
    this.marcarLeidaSiVisible();
  }

  /** Aviso sonoro corto (dos tonos), sin archivos de audio. */
  private sonar() {
    try {
      this.audio ??= new AudioContext();
      const ctx = this.audio;
      [880, 1175].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + i * 0.12;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.16);
      });
    } catch {
      /* el navegador puede bloquear audio sin interacción previa */
    }
  }

  // ---------------------------------------------------------------- Scroll

  onScroll() {
    const el = this.scroller?.nativeElement;
    if (!el) return;
    this.pegadoAbajo = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (this.pegadoAbajo) this.hayNuevosAbajo.set(false);
    if (el.scrollTop < 120) this.cargarAnteriores();
  }

  private async cargarAnteriores() {
    const waId = this.seleccionado();
    const el = this.scroller?.nativeElement;
    if (!waId || !el) return;
    const alturaPrevia = el.scrollHeight;
    const topPrevio = el.scrollTop;
    const agregados = await this.store.cargarAnteriores(waId);
    if (agregados > 0) {
      // Mantener a la vista el mismo mensaje que se estaba leyendo.
      setTimeout(() => (el.scrollTop = el.scrollHeight - alturaPrevia + topPrevio), 0);
    }
  }

  bajar(suave = false) {
    const el = this.scroller?.nativeElement;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: suave ? 'smooth' : 'auto' });
    this.pegadoAbajo = true;
    this.hayNuevosAbajo.set(false);
  }

  /** Las imágenes cambian la altura al cargar: si se estaba abajo, seguir abajo. */
  alCargarMedia() {
    if (this.pegadoAbajo) this.bajar();
  }

  // ---------------------------------------------------------------- Composer

  onTeclado(ev: KeyboardEvent) {
    if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) {
      ev.preventDefault();
      this.enviar();
    }
    if (ev.key === 'Escape') {
      this.citando.set(null);
    }
  }

  autoAjustar() {
    const el = this.entrada?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  citar(m: WaMensaje) {
    this.citando.set(m);
    this.entrada?.nativeElement.focus();
  }

  elegirArchivo() {
    this.selectorArchivo?.nativeElement.click();
  }

  onArchivo(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (archivo) this.prepararAdjunto(archivo);
  }

  onPegar(ev: ClipboardEvent) {
    const archivo = Array.from(ev.clipboardData?.files ?? [])[0];
    if (archivo) {
      ev.preventDefault();
      this.prepararAdjunto(archivo);
    }
  }

  onArrastre(ev: DragEvent, activo: boolean) {
    if (!this.seleccionado() || !ev.dataTransfer?.types.includes('Files')) return;
    ev.preventDefault();
    this.arrastrando.set(activo);
  }

  onSoltar(ev: DragEvent) {
    ev.preventDefault();
    this.arrastrando.set(false);
    const archivo = ev.dataTransfer?.files?.[0];
    if (archivo && this.seleccionado()) this.prepararAdjunto(archivo);
  }

  private prepararAdjunto(archivo: File) {
    this.errorEnvio.set(null);
    if (archivo.size > 25 * MB) {
      this.errorEnvio.set('El archivo supera el máximo de 25 MB.');
      return;
    }
    this.limpiarAdjunto();
    const preview = archivo.type.startsWith('image/') ? URL.createObjectURL(archivo) : undefined;
    this.adjunto.set({ archivo, preview });
    setTimeout(() => this.entrada?.nativeElement.focus(), 0);
  }

  limpiarAdjunto() {
    const a = this.adjunto();
    if (a?.preview) URL.revokeObjectURL(a.preview);
    this.adjunto.set(null);
  }

  /** Aviso de cómo se enviará el archivo (WhatsApp manda como documento lo que no cumple sus límites). */
  avisoAdjunto(a: Adjunto): string {
    const t = a.archivo.type;
    if (t.startsWith('image/') && (!['image/jpeg', 'image/png'].includes(t) || a.archivo.size > 5 * MB)) {
      return 'Se enviará como documento (WhatsApp solo acepta fotos JPG/PNG de hasta 5 MB).';
    }
    if (t.startsWith('video/') && (!['video/mp4', 'video/3gpp'].includes(t) || a.archivo.size > 16 * MB)) {
      return 'Se enviará como documento (WhatsApp solo acepta videos MP4 de hasta 16 MB).';
    }
    return '';
  }

  puedeEnviar(): boolean {
    return !this.enviando() && this.ventana().abierta && (!!this.texto.trim() || !!this.adjunto());
  }

  async enviar() {
    const waId = this.seleccionado();
    if (!waId || !this.puedeEnviar()) return;

    const texto = this.texto.trim();
    const adjunto = this.adjunto();
    const cita = this.citando()?.id;

    this.enviando.set(true);
    this.errorEnvio.set(null);
    // Se limpia al instante: el mensaje aparece en el hilo como "enviando" por socket.
    this.texto = '';
    this.citando.set(null);
    setTimeout(() => this.autoAjustar(), 0);

    try {
      if (adjunto) {
        this.progreso.set(0);
        await this.store.enviarArchivo(waId, adjunto.archivo, texto, cita, (p) => this.progreso.set(p));
        this.limpiarAdjunto();
      } else {
        await this.store.enviarTexto(waId, texto, cita);
      }
    } catch (err) {
      if (!adjunto) this.texto = texto;
      this.errorEnvio.set(mensajeError(err, 'No se pudo enviar el mensaje'));
    } finally {
      this.enviando.set(false);
      this.progreso.set(null);
      this.entrada?.nativeElement.focus();
    }
  }

  async reintentar(m: WaMensaje) {
    try {
      await this.store.reintentar(m);
    } catch (err) {
      this.errorEnvio.set(mensajeError(err, 'No se pudo reintentar'));
    }
  }

  // ---------------------------------------------------------------- Adjuntos

  url(m: WaMensaje): string | undefined {
    return this.store.mediaUrls()[m.id];
  }

  abrirDocumento(m: WaMensaje) {
    const url = this.url(m);
    if (url) {
      this.descargar(url, m.media?.nombre || 'documento');
      return;
    }
    this.store.cargarMedia(m);
    // Esperar a que se descargue y abrirlo.
    const t = setInterval(() => {
      const u = this.url(m);
      if (u) {
        clearInterval(t);
        this.descargar(u, m.media?.nombre || 'documento');
      }
    }, 150);
    setTimeout(() => clearInterval(t), 30000);
  }

  private descargar(url: string, nombre: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
  }

  tamano(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < MB) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / MB).toFixed(1)} MB`;
  }

  extension(nombre?: string): string {
    const ext = nombre?.split('.').pop();
    return ext && ext !== nombre ? ext.slice(0, 4).toUpperCase() : 'DOC';
  }

  mapa(m: WaMensaje): string {
    const u = m.ubicacion!;
    return `https://www.google.com/maps?q=${u.latitud},${u.longitud}`;
  }

  textoCita(c: NonNullable<WaMensaje['cita']>): string {
    const etiquetas: Record<string, string> = {
      image: '📷 Foto', video: '🎥 Video', audio: '🎤 Audio', document: '📄 Documento', sticker: '🏷️ Sticker', location: '📍 Ubicación',
    };
    return c.texto || etiquetas[c.tipo] || '';
  }

  @HostListener('document:keydown.escape')
  cerrarLightbox() {
    this.lightbox.set(null);
  }

  private normalizar(v: string): string {
    return v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }
}
