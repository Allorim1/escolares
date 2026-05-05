import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-redes-sociales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-redes-sociales.html',
  styleUrl: './admin-redes-sociales.css',
})
export class AdminRedesSociales implements OnInit {
  // Señales para almacenar datos de redes sociales
  redesSociales = signal<any[]>([
    { plataforma: 'TikTok', habilitada: false, token: '', usuario: '' },
    { plataforma: 'Instagram', habilitada: false, token: '', usuario: '' },
    { plataforma: 'Telegram', habilitada: false, token: '', usuario: '' },
    { plataforma: 'Facebook', habilitada: false, token: '', usuario: '' },
  ]);

  // Señales para mensajes entrantes
  mensajes = signal<any[]>([
    { id: 1, plataforma: 'Instagram', usuario: '@cliente1', texto: '¿Tienen stock del producto X?', fecha: '2025-05-05 10:30', leido: false },
    { id: 2, plataforma: 'Facebook', usuario: 'Juan Pérez', texto: 'Quiero hacer una devolución', fecha: '2025-05-05 09:15', leido: true },
    { id: 3, plataforma: 'Telegram', usuario: 'Maria Lopez', texto: 'Hola, ¿cuál es el horario de atención?', fecha: '2025-05-04 16:45', leido: false },
    { id: 4, plataforma: 'TikTok', usuario: '@usuario_tiktok', texto: 'Me encantan sus productos!', fecha: '2025-05-04 14:20', leido: true },
  ]);

  // Señales para respuestas automáticas (opcional)
  respuestasAutomaticas = signal<any[]>([
    { palabraClave: 'hola', respuesta: '¡Hola! ¿En qué puedo ayudarte?' },
    { palabraClave: 'precio', respuesta: 'Los precios varían según el producto. Visita nuestra tienda.' },
  ]);

  // Señales para notificaciones
  notificaciones = signal<any[]>([
    { tipo: 'nuevo_seguidor', activa: true, canal: 'email' },
    { tipo: 'nuevo_mensaje', activa: true, canal: 'telegram' },
  ]);

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

  mensajeSeleccionado = signal<any>(null);
  textoRespuesta = signal<string>('');

  ngOnInit() {
    // Aquí se podrían cargar datos desde un backend
    console.log('Componente Redes Sociales inicializado');
  }

  // Métodos para redes sociales
  agregarRedSocial() {
    const plataforma = this.nuevaRedPlataforma().trim();
    if (!plataforma) return;
    this.redesSociales.update(redes => [...redes, {
      plataforma,
      usuario: this.nuevaRedUsuario(),
      token: this.nuevaRedToken(),
      habilitada: this.nuevaRedHabilitada(),
    }]);
    this.nuevaRedPlataforma.set('');
    this.nuevaRedUsuario.set('');
    this.nuevaRedToken.set('');
    this.nuevaRedHabilitada.set(false);
  }

  eliminarRedSocial(index: number) {
    if (!confirm('¿Eliminar esta red social?')) return;
    this.redesSociales.update(redes => redes.filter((_, i) => i !== index));
  }

  // Métodos para mensajes
  seleccionarMensaje(mensaje: any) {
    this.mensajeSeleccionado.set(mensaje);
    this.textoRespuesta.set('');
    if (!mensaje.leido) {
      this.marcarComoLeido(mensaje.id);
    }
  }

  marcarComoLeido(id: number) {
    this.mensajes.update(mensajes =>
      mensajes.map(msg => msg.id === id ? { ...msg, leido: true } : msg)
    );
  }

  enviarRespuesta() {
    const mensaje = this.mensajeSeleccionado();
    const respuesta = this.textoRespuesta().trim();
    if (!mensaje || !respuesta) {
      alert('Por favor, selecciona un mensaje y escribe una respuesta.');
      return;
    }
    // Aquí se enviaría la respuesta al backend
    console.log(`Respondiendo a ${mensaje.usuario} en ${mensaje.plataforma}: ${respuesta}`);
    alert(`Respuesta enviada a ${mensaje.usuario} (${mensaje.plataforma})`);
    this.textoRespuesta.set('');
    // Simulación: agregar la respuesta al mensaje (en un caso real se enviaría a la API)
    this.mensajes.update(mensajes =>
      mensajes.map(msg => msg.id === mensaje.id ? { ...msg, leido: true, respondido: true } : msg)
    );
  }

  eliminarMensaje(id: number) {
    if (!confirm('¿Eliminar este mensaje?')) return;
    this.mensajes.update(mensajes => mensajes.filter(msg => msg.id !== id));
    if (this.mensajeSeleccionado()?.id === id) {
      this.mensajeSeleccionado.set(null);
    }
  }

  // Métodos para respuestas automáticas
  agregarRespuesta() {
    const palabraClave = this.nuevaRespuestaPalabraClave().trim();
    const respuesta = this.nuevaRespuestaRespuesta().trim();
    if (!palabraClave || !respuesta) return;
    this.respuestasAutomaticas.update(respuestas => [...respuestas, { palabraClave, respuesta }]);
    this.nuevaRespuestaPalabraClave.set('');
    this.nuevaRespuestaRespuesta.set('');
  }

  eliminarRespuesta(index: number) {
    if (!confirm('¿Eliminar esta respuesta automática?')) return;
    this.respuestasAutomaticas.update(respuestas => respuestas.filter((_, i) => i !== index));
  }

  // Métodos para notificaciones
  agregarNotificacion() {
    const tipo = this.nuevaNotificacionTipo().trim();
    if (!tipo) return;
    this.notificaciones.update(notifs => [...notifs, {
      tipo,
      canal: this.nuevaNotificacionCanal(),
      activa: this.nuevaNotificacionActiva(),
    }]);
    this.nuevaNotificacionTipo.set('');
    this.nuevaNotificacionCanal.set('');
    this.nuevaNotificacionActiva.set(false);
  }

  eliminarNotificacion(index: number) {
    if (!confirm('¿Eliminar esta notificación?')) return;
    this.notificaciones.update(notifs => notifs.filter((_, i) => i !== index));
  }

  guardarConfiguracion() {
    // Aquí se enviaría la configuración al backend
    console.log('Guardando configuración de redes sociales:', this.redesSociales());
    console.log('Respuestas automáticas:', this.respuestasAutomaticas());
    console.log('Notificaciones:', this.notificaciones());
    alert('Configuración guardada (simulación)');
  }
}