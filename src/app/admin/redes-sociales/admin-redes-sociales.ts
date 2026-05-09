import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RedesSocialesBackend, RedSocial, MensajeRedSocial, RespuestaAutomatica, NotificacionRedSocial } from '../../backend/data-access/redes-sociales.backend';

// Interfaces para el sistema de chat
interface Chat {
  usuario: string;
  plataforma: string;
  mensajes: ChatMessage[];
  ultimoMensaje: MensajeRedSocial;
  tieneNoLeidos: boolean;
  noLeidosCount: number;
}

interface ChatMessage extends MensajeRedSocial {
  esRespuesta: boolean;
}

@Component({
  selector: 'app-admin-redes-sociales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-redes-sociales.html',
  styleUrl: './admin-redes-sociales.css',
})
export class AdminRedesSociales implements OnInit {
  private readonly redesSocialesBackend = inject(RedesSocialesBackend);

  // Señales para almacenar datos de redes sociales
  redesSociales = signal<RedSocial[]>([]);
  mensajes = signal<MensajeRedSocial[]>([]);
  respuestasAutomaticas = signal<RespuestaAutomatica[]>([]);
  notificaciones = signal<NotificacionRedSocial[]>([]);

  // Señales individuales para formularios (evitan error NG5002)
  nuevaRedPlataforma = signal('');
  nuevaRedUsuario = signal('');
  nuevaRedToken = signal('');
  nuevaRedHabilitada = signal(false);

  nuevaRespuestaPalabraClave = signal('');
  nuevaRespuestaRespuesta = signal('');

  nuevaNotificacionTipo = signal('');
  nuevaNotificacionCanal = signal('');
  nuevaNotificacionActiva = signal(false);

  // Chat system signals
  chatSeleccionado = signal<Chat | null>(null);
  nuevoMensajeTexto = signal<string>('');
  archivoSeleccionadoSignal = signal<File | null>(null);
  mostrarNotificacionMensaje = signal<boolean>(false);
  ultimoMensajeNotificado = signal<MensajeRedSocial | null>(null);

  filtroPlataforma = signal<string>(''); // '' = todas, 'TikTok', 'Instagram', etc.

  // Chats agrupados por usuario
  chats = computed(() => {
    const mensajes = this.mensajes();
    console.log('Calculando chats con mensajes:', mensajes.length);

    const chatsMap = new Map<string, Chat>();

    // Agrupar mensajes por usuario y plataforma
    mensajes.forEach(mensaje => {
      const key = `${mensaje.usuario}-${mensaje.plataforma}`;
      console.log('Procesando mensaje:', { key, usuario: mensaje.usuario, plataforma: mensaje.plataforma, texto: mensaje.texto?.substring(0, 50) });

      if (!chatsMap.has(key)) {
        chatsMap.set(key, {
          usuario: mensaje.usuario,
          plataforma: mensaje.plataforma,
          mensajes: [],
          ultimoMensaje: mensaje,
          tieneNoLeidos: false,
          noLeidosCount: 0
        });
      }

      const chat = chatsMap.get(key)!;
      chat.mensajes.push({
        ...mensaje,
        esRespuesta: mensaje.respondido // Asumimos que si está respondido, es nuestra respuesta
      });

      // Actualizar último mensaje
      if (mensaje.fecha > chat.ultimoMensaje.fecha) {
        chat.ultimoMensaje = mensaje;
      }

      // Contar mensajes no leídos
      if (!mensaje.leido) {
        chat.tieneNoLeidos = true;
        chat.noLeidosCount++;
      }
    });

    const chatsArray = Array.from(chatsMap.values());
    console.log('Chats calculados:', chatsArray.length, chatsArray.map(c => ({ usuario: c.usuario, plataforma: c.plataforma, mensajes: c.mensajes.length })));

    // Ordenar mensajes dentro de cada chat por fecha
    chatsMap.forEach(chat => {
      chat.mensajes.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    });

    // Convertir a array y ordenar por último mensaje
    return chatsArray.sort((a, b) =>
      b.ultimoMensaje.fecha.getTime() - a.ultimoMensaje.fecha.getTime()
    );
  });

  loading = signal(false);
  error = signal<string | null>(null);
  private mensajesInterval: any;

  async ngOnInit() {
    await this.cargarDatos();
    this.iniciarVerificacionMensajes();
  }

  ngOnDestroy() {
    if (this.mensajesInterval) {
      clearInterval(this.mensajesInterval);
    }
  }

  // Método para actualizar mensajes en tiempo real vía polling
  private actualizarMensajes() {
    // Este método se llama desde el intervalo para actualizar mensajes
    this.redesSocialesBackend.getMensajes().subscribe({
      next: (mensajesActuales) => {
        const mensajesPrevios = this.mensajes();
        const mensajesActualesArray = mensajesActuales || [];

        // Filtrar mensajes nuevos
        const nuevosMensajes = mensajesActualesArray.filter(msg =>
          !mensajesPrevios.some(prev => prev.id === msg.id)
        );

        // Actualizar si hay cambios
        if (nuevosMensajes.length > 0 || mensajesActualesArray.length !== mensajesPrevios.length) {
          console.log('Actualizando mensajes desde polling:', { nuevos: nuevosMensajes.length, total: mensajesActualesArray.length });
          this.mensajes.set(mensajesActualesArray);

          // Mostrar notificación para mensajes nuevos no leídos
          if (nuevosMensajes.length > 0) {
            const ultimoNuevo = nuevosMensajes.find(msg => !msg.leido);
            if (ultimoNuevo) {
              this.ultimoMensajeNotificado.set(ultimoNuevo);
              this.mostrarNotificacionMensaje.set(true);

              // Auto-ocultar notificación
              setTimeout(() => {
                this.mostrarNotificacionMensaje.set(false);
              }, 5000);
            }
          }
        }
      },
      error: (error) => {
        console.error('Error actualizando mensajes:', error);
      }
    });
  }

  private iniciarVerificacionMensajes() {
    // Verificar nuevos mensajes cada 30 segundos
    this.mensajesInterval = setInterval(() => {
      this.actualizarMensajes();
    }, 30000); // 30 segundos
  }

  async cargarDatos() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [redes, mensajes, respuestas, notificaciones] = await Promise.all([
        this.redesSocialesBackend.getRedesSociales().toPromise(),
        this.redesSocialesBackend.getMensajes().toPromise(),
        this.redesSocialesBackend.getRespuestasAutomaticas().toPromise(),
        this.redesSocialesBackend.getNotificaciones().toPromise(),
      ]);
      console.log('Datos cargados:', {
        redes: redes?.length || 0,
        mensajes: mensajes?.length || 0,
        respuestas: respuestas?.length || 0,
        notificaciones: notificaciones?.length || 0
      });

      if (mensajes && mensajes.length > 0) {
        console.log('Primeros mensajes:', mensajes.slice(0, 3).map(m => ({
          id: m.id,
          usuario: m.usuario,
          plataforma: m.plataforma,
          texto: m.texto?.substring(0, 50),
          fecha: m.fecha
        })));
      }

      this.redesSociales.set(redes || []);
      this.mensajes.set(mensajes || []);
      this.respuestasAutomaticas.set(respuestas || []);
      this.notificaciones.set(notificaciones || []);
    } catch (err) {
      console.error('Error cargando datos de redes sociales:', err);
      this.error.set('Error al cargar datos. Por favor, intente nuevamente.');
    } finally {
      this.loading.set(false);
    }
  }

  // Métodos para redes sociales
  async agregarRedSocial() {
    const plataforma = this.nuevaRedPlataforma().trim();
    const usuario = this.nuevaRedUsuario().trim();
    if (!plataforma || !usuario) {
      alert('Plataforma y usuario son requeridos');
      return;
    }

    // Validación específica para Instagram
    if (plataforma === 'Instagram') {
      if (!/^\d+$/.test(usuario)) {
        alert('Para Instagram, el campo "Usuario / Página" debe contener solo el ID numérico de la página de Facebook (sin @)');
        return;
      }
    }

    try {
      const nuevaRed: Partial<RedSocial> = {
        plataforma,
        usuario,
        token: this.nuevaRedToken().trim(),
        habilitada: this.nuevaRedHabilitada(),
      };

      const redCreada = await this.redesSocialesBackend.createRedSocial(nuevaRed).toPromise();
      if (redCreada) {
        this.redesSociales.update(redes => [...redes, redCreada]);
      }
      
      this.nuevaRedPlataforma.set('');
      this.nuevaRedUsuario.set('');
      this.nuevaRedToken.set('');
      this.nuevaRedHabilitada.set(false);
    } catch (error) {
      console.error('Error creando red social:', error);
      alert('Error al crear red social');
    }
  }

  async eliminarRedSocial(red: RedSocial) {
    if (!confirm(`¿Eliminar la red social ${red.plataforma} - ${red.usuario}?`)) return;
    
    try {
      await this.redesSocialesBackend.deleteRedSocial(red.id).toPromise();
      this.redesSociales.update(redes => redes.filter(r => r.id !== red.id));
    } catch (error) {
      console.error('Error eliminando red social:', error);
      alert('Error al eliminar red social');
    }
  }

  async actualizarRedSocial(red: RedSocial) {
    try {
      const redActualizada = await this.redesSocialesBackend.updateRedSocial(red.id, red).toPromise();
      if (redActualizada) {
        this.redesSociales.update(redes => redes.map(r => r.id === red.id ? redActualizada : r));
      }
    } catch (error) {
      console.error('Error actualizando red social:', error);
      alert('Error al actualizar red social');
    }
  }

  // Métodos para chats
  seleccionarChat(chat: Chat) {
    this.chatSeleccionado.set(chat);
    this.nuevoMensajeTexto.set('');
    this.archivoSeleccionadoSignal.set(null);
    // Marcar todos los mensajes del chat como leídos
    if (chat.tieneNoLeidos) {
      this.marcarChatComoLeido(chat);
    }
  }

  async marcarChatComoLeido(chat: Chat) {
    try {
      const updates = chat.mensajes
        .filter(msg => !msg.leido)
        .map(msg => this.redesSocialesBackend.updateMensaje(msg.id, { leido: true }).toPromise());

      await Promise.all(updates);

      // Actualizar los mensajes localmente
      this.mensajes.update(mensajes =>
        mensajes.map(msg => {
          const chatMensaje = chat.mensajes.find(cm => cm.id === msg.id);
          return chatMensaje ? { ...msg, leido: true } : msg;
        })
      );
    } catch (error) {
      console.error('Error marcando chat como leído:', error);
    }
  }

  async enviarMensajeChat() {
    const chat = this.chatSeleccionado();
    const texto = this.nuevoMensajeTexto().trim();
    const archivo = this.archivoSeleccionadoSignal();

    if (!chat || (!texto && !archivo)) {
      return;
    }

    try {
      let mediaType: string | undefined;
      let mediaUrl: string | undefined;
      let mediaCaption: string | undefined;
      let mediaFilename: string | undefined;

      // Si hay archivo adjunto, subirlo primero
      if (archivo) {
        const formData = new FormData();
        formData.append('file', archivo);

        const uploadResponse = await fetch('/api/redes-sociales/upload-media', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });

        if (!uploadResponse.ok) {
          throw new Error('Error al subir el archivo');
        }

        const uploadData = await uploadResponse.json();
        mediaUrl = uploadData.url;
        mediaType = uploadData.mimetype.startsWith('image/') ? 'image' :
                   uploadData.mimetype.startsWith('video/') ? 'video' : 'document';
        mediaFilename = uploadData.filename;

        if (texto) {
          mediaCaption = texto;
        }
      }

      // Crear el mensaje de respuesta en la base de datos
      const nuevoMensaje: Partial<MensajeRedSocial> = {
        plataforma: chat.plataforma,
        usuario: chat.usuario,
        texto: texto || undefined,
        leido: true,
        respondido: true,
        mediaType,
        mediaUrl,
        mediaCaption,
        mediaFilename
      };

      const mensajeCreado = await this.redesSocialesBackend.createMensaje(nuevoMensaje).toPromise();

      if (mensajeCreado) {
        // Marcar como respondido para enviar por la plataforma
        await this.redesSocialesBackend.updateMensaje(mensajeCreado.id, {
          respondido: true,
          respuesta: texto,
          mediaType,
          mediaUrl,
          mediaCaption,
          mediaFilename
        }).toPromise();

        // Forzar actualización inmediata de mensajes para que aparezca el nuevo mensaje
        this.actualizarMensajes();

        this.nuevoMensajeTexto.set('');
        this.archivoSeleccionadoSignal.set(null);
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      alert('Error al enviar mensaje: ' + (error as Error).message);
    }
  }

  onArchivoSeleccionado(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.archivoSeleccionadoSignal.set(file);
    }
  }

  removerArchivo() {
    this.archivoSeleccionadoSignal.set(null);
  }

  archivoSeleccionado() {
    return this.archivoSeleccionadoSignal();
  }

  async eliminarMensaje(mensaje: MensajeRedSocial) {
    if (!confirm('¿Eliminar este mensaje?')) return;

    try {
      await this.redesSocialesBackend.deleteMensaje(mensaje.id).toPromise();
      this.mensajes.update(mensajes => mensajes.filter(msg => msg.id !== mensaje.id));
      // Si el chat seleccionado ya no tiene mensajes, deseleccionarlo
      const chat = this.chatSeleccionado();
      if (chat && chat.mensajes.every(msg => msg.id !== mensaje.id) && chat.mensajes.length <= 1) {
        this.chatSeleccionado.set(null);
      }
    } catch (error) {
      console.error('Error eliminando mensaje:', error);
      alert('Error al eliminar mensaje');
    }
  }

  getPlatformIcon(plataforma: string): string {
    switch (plataforma) {
      case 'WhatsApp': return '📱';
      case 'Instagram': return '📸';
      case 'Facebook': return '👥';
      case 'TikTok': return '🎵';
      case 'Telegram': return '✈️';
      default: return '💬';
    }
  }

  getUserDisplayName(usuario: string): string {
    // Si es un ID numérico largo (probablemente Instagram/Facebook), mostrar abreviado
    if (/^\d{10,}$/.test(usuario)) {
      return `Usuario ${usuario.slice(-4)}`;
    }
    // Si parece un número de teléfono
    if (/^\+\d+/.test(usuario)) {
      return usuario.replace(/(\+\d{1,3})\d{6}(\d{3})/, '$1****$2');
    }
    return usuario;
  }

  cerrarNotificacionMensaje() {
    this.mostrarNotificacionMensaje.set(false);
    this.ultimoMensajeNotificado.set(null);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      this.enviarMensajeChat();
      event.preventDefault();
    }
  }

  // Métodos para respuestas automáticas
  async agregarRespuesta() {
    const palabraClave = this.nuevaRespuestaPalabraClave().trim();
    const respuesta = this.nuevaRespuestaRespuesta().trim();
    if (!palabraClave || !respuesta) {
      alert('Palabra clave y respuesta son requeridos');
      return;
    }

    try {
      const nuevaRespuesta: Partial<RespuestaAutomatica> = {
        palabraClave,
        respuesta,
      };

      const respuestaCreada = await this.redesSocialesBackend.createRespuestaAutomatica(nuevaRespuesta).toPromise();
      if (respuestaCreada) {
        this.respuestasAutomaticas.update(respuestas => [...respuestas, respuestaCreada]);
      }
      
      this.nuevaRespuestaPalabraClave.set('');
      this.nuevaRespuestaRespuesta.set('');
    } catch (error) {
      console.error('Error creando respuesta automática:', error);
      alert('Error al crear respuesta automática');
    }
  }

  async eliminarRespuesta(respuesta: RespuestaAutomatica) {
    if (!confirm(`¿Eliminar la respuesta automática para "${respuesta.palabraClave}"?`)) return;
    
    try {
      await this.redesSocialesBackend.deleteRespuestaAutomatica(respuesta.id).toPromise();
      this.respuestasAutomaticas.update(respuestas => respuestas.filter(r => r.id !== respuesta.id));
    } catch (error) {
      console.error('Error eliminando respuesta automática:', error);
      alert('Error al eliminar respuesta automática');
    }
  }

  async actualizarRespuesta(respuesta: RespuestaAutomatica) {
    try {
      const respuestaActualizada = await this.redesSocialesBackend.updateRespuestaAutomatica(respuesta.id, respuesta).toPromise();
      if (respuestaActualizada) {
        this.respuestasAutomaticas.update(respuestas => respuestas.map(r => r.id === respuesta.id ? respuestaActualizada : r));
      }
    } catch (error) {
      console.error('Error actualizando respuesta automática:', error);
      alert('Error al actualizar respuesta automática');
    }
  }

  // Métodos para notificaciones
  async agregarNotificacion() {
    const tipo = this.nuevaNotificacionTipo().trim();
    const canal = this.nuevaNotificacionCanal().trim();
    if (!tipo || !canal) {
      alert('Tipo y canal son requeridos');
      return;
    }

    try {
      const nuevaNotificacion: Partial<NotificacionRedSocial> = {
        tipo,
        canal,
        activa: this.nuevaNotificacionActiva(),
      };

      const notificacionCreada = await this.redesSocialesBackend.createNotificacion(nuevaNotificacion).toPromise();
      if (notificacionCreada) {
        this.notificaciones.update(notifs => [...notifs, notificacionCreada]);
      }
      
      this.nuevaNotificacionTipo.set('');
      this.nuevaNotificacionCanal.set('');
      this.nuevaNotificacionActiva.set(false);
    } catch (error) {
      console.error('Error creando notificación:', error);
      alert('Error al crear notificación');
    }
  }

  async eliminarNotificacion(notificacion: NotificacionRedSocial) {
    if (!confirm(`¿Eliminar la notificación ${notificacion.tipo}?`)) return;
    
    try {
      await this.redesSocialesBackend.deleteNotificacion(notificacion.id).toPromise();
      this.notificaciones.update(notifs => notifs.filter(n => n.id !== notificacion.id));
    } catch (error) {
      console.error('Error eliminando notificación:', error);
      alert('Error al eliminar notificación');
    }
  }

  async actualizarNotificacion(notificacion: NotificacionRedSocial) {
    try {
      const notificacionActualizada = await this.redesSocialesBackend.updateNotificacion(notificacion.id, notificacion).toPromise();
      if (notificacionActualizada) {
        this.notificaciones.update(notifs => notifs.map(n => n.id === notificacion.id ? notificacionActualizada : n));
      }
    } catch (error) {
      console.error('Error actualizando notificación:', error);
      alert('Error al actualizar notificación');
    }
  }

  async guardarConfiguracion() {
    try {
      // Guardar todas las redes sociales
      for (const red of this.redesSociales()) {
        await this.redesSocialesBackend.updateRedSocial(red.id, red).toPromise();
      }
      
      // Guardar todas las respuestas automáticas
      for (const respuesta of this.respuestasAutomaticas()) {
        await this.redesSocialesBackend.updateRespuestaAutomatica(respuesta.id, respuesta).toPromise();
      }
      
      // Guardar todas las notificaciones
      for (const notificacion of this.notificaciones()) {
        await this.redesSocialesBackend.updateNotificacion(notificacion.id, notificacion).toPromise();
      }
      
      alert('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error guardando configuración:', error);
      alert('Error al guardar configuración');
    }
  }
}