import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RedesSocialesBackend, RedSocial, MensajeRedSocial, RespuestaAutomatica, NotificacionRedSocial } from '../../backend/data-access/redes-sociales.backend';

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

  mensajeSeleccionado = signal<MensajeRedSocial | null>(null);
  textoRespuesta = signal<string>('');
  filtroPlataforma = signal<string>(''); // '' = todas, 'TikTok', 'Instagram', etc.

  // Mensajes filtrados por plataforma
  mensajesFiltrados = computed(() => {
    const filtro = this.filtroPlataforma();
    if (!filtro) return this.mensajes();
    return this.mensajes().filter(msg => msg.plataforma === filtro);
  });

  loading = signal(false);
  error = signal<string | null>(null);

  async ngOnInit() {
    await this.cargarDatos();
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

  // Métodos para mensajes
  seleccionarMensaje(mensaje: MensajeRedSocial) {
    this.mensajeSeleccionado.set(mensaje);
    this.textoRespuesta.set('');
    if (!mensaje.leido) {
      this.marcarComoLeido(mensaje);
    }
  }

  async marcarComoLeido(mensaje: MensajeRedSocial) {
    try {
      const mensajeActualizado = await this.redesSocialesBackend.updateMensaje(mensaje.id, { leido: true }).toPromise();
      if (mensajeActualizado) {
        this.mensajes.update(mensajes => mensajes.map(msg => msg.id === mensaje.id ? mensajeActualizado : msg));
      }
    } catch (error) {
      console.error('Error marcando mensaje como leído:', error);
    }
  }

  async enviarRespuesta() {
    const mensaje = this.mensajeSeleccionado();
    const respuesta = this.textoRespuesta().trim();
    if (!mensaje || !respuesta) {
      alert('Por favor, selecciona un mensaje y escribe una respuesta.');
      return;
    }

    try {
      const mensajeActualizado = await this.redesSocialesBackend.updateMensaje(mensaje.id, { 
        respondido: true, 
        respuesta 
      }).toPromise();
      
      if (mensajeActualizado) {
        this.mensajes.update(mensajes => mensajes.map(msg => msg.id === mensaje.id ? mensajeActualizado : msg));
      }
      this.textoRespuesta.set('');
      alert(`Respuesta enviada a ${mensaje.usuario} (${mensaje.plataforma})`);
    } catch (error) {
      console.error('Error enviando respuesta:', error);
      alert('Error al enviar respuesta');
    }
  }

  async eliminarMensaje(mensaje: MensajeRedSocial) {
    if (!confirm('¿Eliminar este mensaje?')) return;
    
    try {
      await this.redesSocialesBackend.deleteMensaje(mensaje.id).toPromise();
      this.mensajes.update(mensajes => mensajes.filter(msg => msg.id !== mensaje.id));
      if (this.mensajeSeleccionado()?.id === mensaje.id) {
        this.mensajeSeleccionado.set(null);
      }
    } catch (error) {
      console.error('Error eliminando mensaje:', error);
      alert('Error al eliminar mensaje');
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