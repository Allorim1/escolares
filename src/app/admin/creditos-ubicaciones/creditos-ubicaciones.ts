import { Component, ElementRef, AfterViewInit, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { GoogleMapsService } from '../../shared/services/google-maps.service';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';

interface UbicacionCliente {
  usuarioId: string;
  nombre: string;
  telefono: string;
  lat: number;
  lng: number;
  actualizadaEn: string;
}

interface ClienteConDistancia extends UbicacionCliente {
  distanciaKm: number;
  lugar: string | null;
}

const RADIO_KM_DEFAULT = 10;

/** Centro de referencia mientras no se conoce la posición real del staff: local de
 *  Escolares en Av. Lara, Valencia, Carabobo (placeId ChIJY0Vnkq5ngI4RlAo0hRTQtJE). */
const CENTRO_DEFECTO = { lat: 10.1794491, lng: -68.0039378 };

/** Distancia entre dos puntos (fórmula de Haversine), en km. */
function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

@Component({
  selector: 'app-creditos-ubicaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creditos-ubicaciones.html',
  styleUrl: './creditos-ubicaciones.css',
})
export class CreditosUbicaciones implements AfterViewInit, OnDestroy {
  private http = inject(HttpClient);
  private mapsService = inject(GoogleMapsService);
  private notificaciones = inject(NotificationModalService);

  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLElement>;

  cargando = signal(true);
  /** Solo para errores que impiden mostrar el mapa (falló la API de Maps, o el backend). */
  errorMapa = signal<string | null>(null);
  /** Aviso no bloqueante: el navegador no pudo detectar la ubicación automáticamente, pero
   *  se puede seguir usando el módulo marcando la posición a mano en el mapa. */
  avisoUbicacion = signal<string | null>(null);
  ubicacionManual = signal(false);
  radioKm = signal(RADIO_KM_DEFAULT);
  miUbicacion = signal<{ lat: number; lng: number } | null>(null);

  cercanos = signal<ClienteConDistancia[]>([]);
  lejanos = signal<ClienteConDistancia[]>([]);

  private map: google.maps.Map | null = null;
  private miMarcador: google.maps.Marker | null = null;
  private marcadoresClientes: google.maps.Marker[] = [];
  private todas: UbicacionCliente[] = [];

  async ngAfterViewInit() {
    await this.iniciar();
  }

  ngOnDestroy() {
    this.marcadoresClientes.forEach((m) => m.setMap(null));
  }

  async iniciar() {
    this.cargando.set(true);
    this.errorMapa.set(null);
    this.avisoUbicacion.set(null);
    try {
      await this.mapsService.loadApi();
    } catch {
      this.errorMapa.set('No se pudo cargar Google Maps. Revisá la conexión e intentá de nuevo.');
      this.cargando.set(false);
      return;
    }

    let ubicacion: { lat: number; lng: number };
    try {
      ubicacion = await this.obtenerMiUbicacion();
      this.ubicacionManual.set(false);
    } catch (error) {
      // No se pudo detectar sola: se arranca en un punto de referencia y se deja que el
      // staff marque su posición real con un clic, en vez de bloquear todo el módulo.
      this.avisoUbicacion.set(
        `${error instanceof Error ? error.message : 'No se pudo obtener tu ubicación automáticamente.'} Mientras tanto, hacé clic en el mapa para indicar dónde estás.`,
      );
      ubicacion = CENTRO_DEFECTO;
      this.ubicacionManual.set(true);
    }

    this.miUbicacion.set(ubicacion);
    this.iniciarMapa(ubicacion);
    try {
      await this.cargarUbicaciones();
    } catch {
      this.errorMapa.set('No se pudieron cargar las ubicaciones de los clientes.');
    } finally {
      this.cargando.set(false);
    }
  }

  private async obtenerMiUbicacion(): Promise<{ lat: number; lng: number }> {
    if (!navigator.geolocation) {
      throw new Error('Tu navegador no soporta geolocalización.');
    }

    // El permiso de ubicación del navegador solo se concede en contextos seguros
    // (HTTPS o localhost). Si el panel se sirve por HTTP sin cifrar, Chrome/Edge/Firefox
    // bloquean la API directamente y da el mismo error que si el usuario la hubiera
    // denegado, aunque tenga la ubicación del sistema operativo activada.
    if (!window.isSecureContext) {
      throw new Error('Este panel se está cargando sin HTTPS, y los navegadores bloquean la ubicación fuera de un sitio seguro.');
    }

    // El permiso del SITIO es independiente del permiso del sistema operativo: se puede
    // haber quedado bloqueado para este dominio en particular sin que el usuario lo note.
    if (navigator.permissions?.query) {
      try {
        const estado = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (estado.state === 'denied') {
          throw new Error('El permiso de ubicación para este sitio está bloqueado en el navegador.');
        }
      } catch {
        // Si la Permissions API no soporta 'geolocation' en este navegador, se sigue con getCurrentPosition.
      }
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (error) => {
          console.error('Error de geolocalización:', error.code, error.message);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              // También aparece cuando Windows no puede resolver ninguna posición (p.ej. un
              // escritorio sin Wi-Fi, del que depende su proveedor de ubicación) aunque los
              // permisos del sitio y del sistema estén en "Permitir".
              reject(new Error('El navegador no pudo obtener tu ubicación (permiso bloqueado, o Windows no logró determinar tu posición).'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('El navegador no pudo determinar tu ubicación en este momento (sin señal de red/GPS).'));
              break;
            case error.TIMEOUT:
              reject(new Error('Tardó demasiado en obtener tu ubicación.'));
              break;
            default:
              reject(new Error(`No se pudo obtener tu ubicación (${error.message || 'error desconocido'}).`));
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    });
  }

  private iniciarMapa(centro: { lat: number; lng: number }) {
    const container = this.mapContainer?.nativeElement;
    if (!container) return;

    this.map = this.mapsService.createMap(container, { center: centro, zoom: this.ubicacionManual() ? 6 : 13 });
    this.miMarcador = this.mapsService.createMarker({
      position: centro,
      map: this.map,
      title: 'Tu ubicación',
    });

    // Respaldo cuando la detección automática falla: se puede marcar la posición a mano.
    this.map.addListener('click', (evento) => {
      if (!evento.latLng) return;
      const punto = { lat: evento.latLng.lat(), lng: evento.latLng.lng() };
      this.miUbicacion.set(punto);
      this.miMarcador?.setPosition(punto);
      this.ubicacionManual.set(true);
      this.avisoUbicacion.set('Ubicación marcada a mano.');
      void this.recalcular();
    });
  }

  async cargarUbicaciones() {
    this.todas = (await this.http.get<UbicacionCliente[]>('/api/creditos/admin/ubicaciones').toPromise()) ?? [];
    await this.recalcular();
  }

  async actualizar() {
    this.cargando.set(true);
    try {
      const ubicacion = await this.obtenerMiUbicacion();
      this.miUbicacion.set(ubicacion);
      this.ubicacionManual.set(false);
      this.avisoUbicacion.set(null);
      this.map?.setCenter(ubicacion);
      this.map?.setZoom(13);
      this.miMarcador?.setPosition(ubicacion);
      await this.cargarUbicaciones();
    } catch (error) {
      // No se pisa la ubicación ya establecida (automática o manual): solo se avisa que
      // el reintento automático falló y se sigue pudiendo ajustar a mano.
      this.notificaciones.error(
        `${error instanceof Error ? error.message : 'No se pudo actualizar tu ubicación'}. Podés marcarla a mano en el mapa.`,
        'No se pudo detectar la ubicación',
      );
      await this.cargarUbicaciones();
    } finally {
      this.cargando.set(false);
    }
  }

  /** Reparte a los clientes entre "cercanos" (con marcador en el mapa) y "lejanos" (solo se
   *  indica el lugar, sin marcarlos junto al staff), según el radio elegido. */
  async recalcular() {
    const mia = this.miUbicacion();
    if (!mia) return;

    const conDistancia = this.todas
      .map((u) => ({ ...u, distanciaKm: distanciaKm(mia, u), lugar: null as string | null }))
      .sort((a, b) => a.distanciaKm - b.distanciaKm);

    const radio = this.radioKm();
    const cercanos = conDistancia.filter((c) => c.distanciaKm <= radio);
    const lejanos = conDistancia.filter((c) => c.distanciaKm > radio);

    this.cercanos.set(cercanos);
    this.lejanos.set(lejanos);
    this.dibujarMarcadores(cercanos);
    void this.resolverLugares(lejanos);
  }

  private dibujarMarcadores(clientes: ClienteConDistancia[]) {
    this.marcadoresClientes.forEach((m) => m.setMap(null));
    this.marcadoresClientes = [];
    if (!this.map) return;

    for (const c of clientes) {
      const marcador = this.mapsService.createMarker({
        position: { lat: c.lat, lng: c.lng },
        map: this.map,
        title: `${c.nombre} · ${c.distanciaKm.toFixed(1)} km`,
      });
      this.marcadoresClientes.push(marcador);
    }
  }

  /** Los clientes fuera del radio no se marcan en el mapa; solo se les resuelve el nombre
   *  del lugar (geocodificación inversa) para mostrarlo en la lista. */
  private async resolverLugares(clientes: ClienteConDistancia[]) {
    await Promise.all(
      clientes.map(async (c) => {
        try {
          const resultado = await this.mapsService.reverseGeocode(c.lat, c.lng);
          c.lugar = resultado.formatted_address;
          this.lejanos.set([...this.lejanos()]);
        } catch {
          // Se deja sin resolver: la fila igual muestra la distancia.
        }
      }),
    );
  }

  centrarEn(c: ClienteConDistancia) {
    this.map?.setCenter({ lat: c.lat, lng: c.lng });
    this.map?.setZoom(15);
  }
}
