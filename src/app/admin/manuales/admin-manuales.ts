import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/data-access/auth.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';

interface Paso {
  id: string;
  numero: number;
  titulo: string;
  descripcion: string;
  imagen?: string;
  video?: string;
  videoUrl?: string;
  videoDuration?: number;
}

interface Manual {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  pasos: Paso[];
  fechaCreacion: Date;
  fechaActualizacion?: Date;
}

@Component({
  selector: 'app-admin-manuales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-manuales.html',
  styleUrl: './admin-manuales.css',
})
export class AdminManuales implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  private notificationModal = inject(NotificationModalService);

  manuales = signal<Manual[]>([]);
  cargando = signal(true);

  showModal = signal(false);
  isEditing = signal(false);
  editingManual = signal<Manual | null>(null);

  // View modal
  showViewModal = signal(false);
  viewingManual = signal<Manual | null>(null);

  // Form fields
  formTitulo = '';
  formDescripcion = '';
  formCategoria = 'general';
  formPasos: Paso[] = [];

  categorias = [
    { value: 'general', label: 'General' },
    { value: 'productos', label: 'Gestión de Productos' },
    { value: 'usuarios', label: 'Gestión de Usuarios' },
    { value: 'pedidos', label: 'Gestión de Pedidos' },
    { value: 'facturacion', label: 'Facturación' },
    { value: 'configuracion', label: 'Configuración' },
  ];

  ngOnInit() {
    if (!this.esRoot()) {
      this.router.navigate(['/admin/inicio']);
      return;
    }
    this.cargarManuales();
  }

  esRoot(): boolean {
    return this.authService.user()?.rol === 'root';
  }

  cargarManuales() {
    this.cargando.set(true);
    this.http.get<Manual[]>('/api/manuales').subscribe({
      next: (manuales) => {
        this.manuales.set(manuales);
        this.cargando.set(false);
      },
      error: (err) => {
        this.notificationModal.error('Error al cargar manuales');
        this.cargando.set(false);
      },
    });
  }

  openAddModal() {
    this.isEditing.set(false);
    this.editingManual.set(null);
    this.formTitulo = '';
    this.formDescripcion = '';
    this.formCategoria = 'general';
    this.formPasos = [];
    this.showModal.set(true);
  }

  openEditModal(manual: Manual) {
    this.isEditing.set(true);
    this.editingManual.set(manual);
    this.formTitulo = manual.titulo;
    this.formDescripcion = manual.descripcion;
    this.formCategoria = manual.categoria;
    this.formPasos = [...manual.pasos.map(p => ({ ...p }))];
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.isEditing.set(false);
    this.editingManual.set(null);
  }

  verManual(manual: Manual) {
    this.viewingManual.set(manual);
    this.showViewModal.set(true);
  }

  closeViewModal() {
    this.showViewModal.set(false);
    this.viewingManual.set(null);
  }

  agregarPaso() {
    const nuevoPaso: Paso = {
      id: this.generarId(),
      numero: this.formPasos.length + 1,
      titulo: '',
      descripcion: ''
    };
    this.formPasos = [...this.formPasos, nuevoPaso];
  }

  eliminarPaso(index: number) {
    this.formPasos = this.formPasos.filter((_, i) => i !== index);
    // Renumber steps
    this.formPasos.forEach((paso, i) => {
      paso.numero = i + 1;
    });
    this.formPasos = [...this.formPasos];
  }

  moverPasoArriba(index: number) {
    if (index > 0) {
      const newPasos = [...this.formPasos];
      const temp = newPasos[index];
      newPasos[index] = newPasos[index - 1];
      newPasos[index - 1] = temp;
      newPasos.forEach((paso, i) => {
        paso.numero = i + 1;
      });
      this.formPasos = newPasos;
    }
  }

  moverPasoAbajo(index: number) {
    if (index < this.formPasos.length - 1) {
      const newPasos = [...this.formPasos];
      const temp = newPasos[index];
      newPasos[index] = newPasos[index + 1];
      newPasos[index + 1] = temp;
      newPasos.forEach((paso, i) => {
        paso.numero = i + 1;
      });
      this.formPasos = newPasos;
    }
  }

  async onImageSelected(event: any, pasoIndex: number) {
    const file = event.target.files[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB limit for images
    if (file.size > maxSize) {
      this.notificationModal.error('La imagen no puede pesar más de 5MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response: any = await this.http.post('/api/manuales/upload-image', formData).toPromise();
      this.formPasos[pasoIndex].imagen = response.url;
    } catch (err: any) {
      this.notificationModal.error(err.error?.error || 'Error al subir la imagen');
    }
  }

  async onVideoSelected(event: any, pasoIndex: number) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      this.notificationModal.error('El archivo debe ser un video');
      return;
    }

    const maxSize = 30 * 1024 * 1024; // 30MB limit for videos
    if (file.size > maxSize) {
      this.notificationModal.error('El video no puede pesar más de 30MB');
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      if (duration > 60) {
        this.notificationModal.error('El video no puede durar más de 1 minuto');
        URL.revokeObjectURL(video.src);
        return;
      }

      URL.revokeObjectURL(video.src);

      try {
        const formData = new FormData();
        formData.append('video', file);

        const response: any = await this.http.post('/api/manuales/upload-video', formData).toPromise();
        this.formPasos[pasoIndex].video = response.url;
        this.formPasos[pasoIndex].videoDuration = Math.round(duration);
      } catch (err: any) {
        this.notificationModal.error(err.error?.error || 'Error al subir el video');
      }
    };

    video.onerror = () => {
      this.notificationModal.error('Error al leer el video');
      URL.revokeObjectURL(video.src);
    };
  }

  removeVideo(pasoIndex: number) {
    this.formPasos[pasoIndex].video = undefined;
    this.formPasos[pasoIndex].videoDuration = undefined;
    this.formPasos = [...this.formPasos];
  }

  removeVideoUrl(pasoIndex: number) {
    this.formPasos[pasoIndex].videoUrl = undefined;
    this.formPasos = [...this.formPasos];
  }

  removeImage(pasoIndex: number) {
    this.formPasos[pasoIndex].imagen = undefined;
    this.formPasos = [...this.formPasos];
  }

  updateVideoFromUrl(pasoIndex: number) {
    const url = this.formPasos[pasoIndex].videoUrl;
    if (url && !this.isValidVideoUrl(url)) {
      this.notificationModal.error('URL de video no válida. Soportamos YouTube y Vimeo.');
      return;
    }
  }

  isValidVideoUrl(url: string): boolean {
    const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    const vimeoPattern = /^(https?:\/\/)?(www\.)?vimeo\.com\/.+$/;
    return youtubePattern.test(url) || vimeoPattern.test(url);
  }

  getEmbedUrl(url: string): SafeHtml {
    if (!url) return '';
    
    let embedHtml = '';
    
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (youtubeMatch) {
      embedHtml = `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${youtubeMatch[1]}" frameborder="0" allowfullscreen></iframe>`;
      return this.sanitizer.bypassSecurityTrustHtml(embedHtml);
    }
    
    const vimeoMatch = url.match(/(?:www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/\d+\/video\/|)(\d+)/);
    if (vimeoMatch) {
      embedHtml = `<iframe width="100%" height="200" src="https://player.vimeo.com/video/${vimeoMatch[1]}" frameborder="0" allowfullscreen></iframe>`;
      return this.sanitizer.bypassSecurityTrustHtml(embedHtml);
    }
    
    return this.sanitizer.bypassSecurityTrustHtml('<p>URL no compatible</p>');
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  guardarManual() {
    if (!this.formTitulo.trim()) {
      this.notificationModal.error('El título es requerido');
      return;
    }

    if (this.formPasos.length === 0) {
      this.notificationModal.error('Debe agregar al menos un paso');
      return;
    }

    // Validate steps
    for (let i = 0; i < this.formPasos.length; i++) {
      if (!this.formPasos[i].titulo.trim()) {
        this.notificationModal.error(`El paso ${i + 1} debe tener un título`);
        return;
      }
      if (!this.formPasos[i].descripcion.trim()) {
        this.notificationModal.error(`El paso ${i + 1} debe tener una descripción`);
        return;
      }
    }

    if (this.isEditing()) {
      this.actualizarManual();
    } else {
      this.crearManual();
    }
  }

  crearManual() {
    const manualData = {
      titulo: this.formTitulo,
      descripcion: this.formDescripcion,
      categoria: this.formCategoria,
      pasos: this.formPasos.filter(p => p.titulo.trim() && p.descripcion.trim())
    };

    this.http.post('/api/manuales', manualData).subscribe({
      next: () => {
        this.success.set('Manual creado correctamente');
        this.cargarManuales();
        this.closeModal();
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Error al crear manual');
      },
    });
  }

  actualizarManual() {
    const manual = this.editingManual();
    if (!manual) return;

    const manualData = {
      titulo: this.formTitulo,
      descripcion: this.formDescripcion,
      categoria: this.formCategoria,
      pasos: this.formPasos.filter(p => p.titulo.trim() && p.descripcion.trim())
    };

    this.http.put(`/api/manuales/${manual.id}`, manualData).subscribe({
      next: () => {
        this.success.set('Manual actualizado correctamente');
        this.cargarManuales();
        this.closeModal();
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Error al actualizar manual');
      },
    });
  }

  eliminarManual(manual: Manual) {
    if (!confirm(`¿Estás seguro de eliminar "${manual.titulo}"?`)) {
      return;
    }

    this.http.delete(`/api/manuales/${manual.id}`).subscribe({
      next: () => {
        this.success.set('Manual eliminado correctamente');
        this.cargarManuales();
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Error al eliminar manual');
      },
    });
  }

  getCategoriaLabel(categoria: string): string {
    const found = this.categorias.find(c => c.value === categoria);
    return found ? found.label : categoria;
  }

  formatFecha(fecha: Date | string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  clearMessages() {
    this.error.set(null);
    this.success.set(null);
  }

  private generarId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
