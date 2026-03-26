import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Documento {
  _id?: string;
  nombre: string;
  descripcion: string;
  imagenes: string[];
  fechaSubida: Date;
  fechaVencimiento?: Date;
  categoria?: string;
}

@Component({
  selector: 'app-galeria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './galeria.html',
  styleUrl: './galeria.css',
})
export class Galeria implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  tipoActual = signal<'temporales' | 'legales' | null>(null);
  documentos = signal<Documento[]>([]);
  showModal = signal(false);
  showDocModal = signal(false);
  showQRModal = signal(false);
  showImageViewer = signal(false);

  docSeleccionado = signal<Documento | null>(null);
  imagenesActuales = signal<string[]>([]);
  imagenViewerIndex = signal(0);

  qrCodeData = signal('');
  qrExpiracion = signal('');
  qrFotoRecibida = signal(false);
  qrInterval: any = null;

  editando = signal<Documento | null>(null);
  newDoc = { nombre: '', descripcion: '', fechaVencimiento: '', categoria: 'otro' };

  categorias = [
    { value: 'contrato', label: 'Contratos' },
    { value: 'constitucion', label: 'Acta Constitutiva' },
    { value: 'registro', label: 'Registro' },
    { value: 'poder', label: 'Poder' },
    { value: 'certificado', label: 'Certificados' },
    { value: 'otro', label: 'Otros' },
  ];

  ngOnInit() {}

  abrirGaleria(tipo: 'temporales' | 'legales') {
    this.tipoActual.set(tipo);
    this.loadDocumentos(tipo);
    this.showModal.set(true);
  }

  cerrarModal() {
    this.showModal.set(false);
    this.tipoActual.set(null);
    this.documentos.set([]);
  }

  loadDocumentos(tipo: string) {
    this.http.get<Documento[]>(`/api/galeria/${tipo}`).subscribe({
      next: (data) => this.documentos.set(data),
      error: (err) => console.error('Error cargando documentos:', err),
    });
  }

  getTitulo(): string {
    return this.tipoActual() === 'temporales' ? 'Documentos Temporales' : 'Documentos Legales';
  }

  estaVencido(doc: Documento): boolean {
    if (!doc.fechaVencimiento) return false;
    return new Date(doc.fechaVencimiento) < new Date();
  }

  formatearFecha(fecha: Date | string | undefined): string {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleDateString('es-VE');
  }

  getCategoriaLabel(valor: string | undefined): string {
    return this.categorias.find(c => c.value === valor)?.label || valor || '';
  }

  abrirNuevoDoc() {
    this.editando.set(null);
    this.newDoc = { nombre: '', descripcion: '', fechaVencimiento: '', categoria: 'otro' };
    this.showDocModal.set(true);
  }

  cerrarDocModal() {
    this.showDocModal.set(false);
    this.editando.set(null);
  }

  guardarDoc() {
    if (!this.newDoc.nombre.trim()) return;
    const tipo = this.tipoActual()!;
    if (this.editando()) {
      this.http.put(`/api/galeria/${tipo}/${this.editando()!._id}`, this.newDoc).subscribe({
        next: () => { this.loadDocumentos(tipo); this.cerrarDocModal(); },
        error: (err) => console.error('Error actualizando:', err),
      });
    } else {
      this.http.post(`/api/galeria/${tipo}`, this.newDoc).subscribe({
        next: () => { this.loadDocumentos(tipo); this.cerrarDocModal(); },
        error: (err) => console.error('Error creando:', err),
      });
    }
  }

  editarDoc(doc: Documento, e: Event) {
    e.stopPropagation();
    this.editando.set(doc);
    this.newDoc = {
      nombre: doc.nombre,
      descripcion: doc.descripcion || '',
      fechaVencimiento: doc.fechaVencimiento ? new Date(doc.fechaVencimiento).toISOString().split('T')[0] : '',
      categoria: doc.categoria || 'otro',
    };
    this.showDocModal.set(true);
  }

  eliminarDoc(doc: Documento, e: Event) {
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return;
    const tipo = this.tipoActual()!;
    this.http.delete(`/api/galeria/${tipo}/${doc._id}`).subscribe({
      next: () => this.loadDocumentos(tipo),
      error: (err) => console.error('Error eliminando:', err),
    });
  }

  abrirDocImagenes(doc: Documento) {
    this.docSeleccionado.set(doc);
    this.imagenesActuales.set(doc.imagenes ? [...doc.imagenes] : []);
    this.showQRModal.set(false);
    this.qrFotoRecibida.set(false);
  }

  cerrarDocImagenes() {
    if (this.qrInterval) {
      clearInterval(this.qrInterval);
      this.qrInterval = null;
    }
    this.docSeleccionado.set(null);
    this.imagenesActuales.set([]);
    this.showQRModal.set(false);
  }

  agregarFoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        this.resizeImage(result, 1200, (resized) => {
          this.subirImagen(resized);
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  abrirCamara() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        this.resizeImage(result, 1200, (resized) => {
          this.subirImagen(resized);
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  private resizeImage(base64: string, maxWidth: number, callback: (result: string) => void) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = base64;
  }

  private subirImagen(base64: string) {
    const doc = this.docSeleccionado();
    const tipo = this.tipoActual()!;
    if (!doc) return;
    this.http.post(`/api/galeria/${tipo}/${doc._id}/upload`, { imagen: base64 }).subscribe({
      next: () => {
        this.imagenesActuales.update(imgs => [...imgs, base64]);
        this.loadDocumentos(tipo);
      },
      error: (err) => console.error('Error subiendo imagen:', err),
    });
  }

  abrirQR() {
    const doc = this.docSeleccionado();
    const tipo = this.tipoActual()!;
    if (!doc) return;
    this.qrCodeData.set('');
    this.qrExpiracion.set('');
    this.qrFotoRecibida.set(false);
    this.showQRModal.set(true);
    this.cdr.detectChanges();

    const imagenesIniciales = [...this.imagenesActuales()];

    this.http.post<{ qrCode: string; uploadUrl: string; expiresAt: string }>(`/api/galeria/${tipo}/generate-qr`, {
      docId: doc._id
    }).subscribe({
      next: (res) => {
        this.qrCodeData.set(res.qrCode);
        this.qrExpiracion.set(res.expiresAt);
        this.cdr.detectChanges();

        this.qrInterval = setInterval(() => {
          this.http.get<{ imagenes: string[] }>(`/api/galeria/${tipo}/imagenes/${doc._id}`).subscribe({
            next: (pollRes) => {
              if (pollRes.imagenes && pollRes.imagenes.length > imagenesIniciales.length) {
                this.qrFotoRecibida.set(true);
                this.cdr.detectChanges();
                clearInterval(this.qrInterval);
                this.qrInterval = null;
                setTimeout(() => {
                  this.imagenesActuales.set(pollRes.imagenes);
                  this.showQRModal.set(false);
                  this.loadDocumentos(tipo);
                  this.cdr.detectChanges();
                }, 2000);
              }
            },
            error: () => {}
          });
        }, 2000);
      },
      error: (err) => {
        console.error('Error generating QR:', err);
        alert('Error al generar código QR');
        this.showQRModal.set(false);
      }
    });
  }

  cerrarQR() {
    if (this.qrInterval) {
      clearInterval(this.qrInterval);
      this.qrInterval = null;
    }
    this.showQRModal.set(false);
  }

  eliminarImagen(index: number) {
    if (!confirm('¿Eliminar esta imagen?')) return;
    const doc = this.docSeleccionado();
    const tipo = this.tipoActual()!;
    if (!doc) return;
    this.http.delete(`/api/galeria/${tipo}/imagenes/${doc._id}/${index}`).subscribe({
      next: () => {
        this.imagenesActuales.update(imgs => imgs.filter((_, i) => i !== index));
        this.loadDocumentos(tipo);
      },
      error: (err) => console.error('Error eliminando imagen:', err),
    });
  }

  verImagen(index: number) {
    this.imagenViewerIndex.set(index);
    this.showImageViewer.set(true);
  }

  cerrarImageViewer() {
    this.showImageViewer.set(false);
  }

  imagenAnterior() {
    this.imagenViewerIndex.update(i => Math.max(0, i - 1));
  }

  imagenSiguiente() {
    this.imagenViewerIndex.update(i => Math.min(this.imagenesActuales().length - 1, i + 1));
  }
}
