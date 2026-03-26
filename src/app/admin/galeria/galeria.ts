import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Documento {
  _id?: string;
  nombre: string;
  descripcion: string;
  imagenes: string[];
  fechaSubida: Date;
}

@Component({
  selector: 'app-galeria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './galeria.html',
  styleUrl: './galeria.css',
})
export class Galeria {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  showModal = false;
  showDocModal = false;
  showQRModal = false;
  showImageViewer = false;

  tipoActual = '';
  documentos: Documento[] = [];
  docSeleccionado: Documento | null = null;
  imagenesActuales: string[] = [];
  imagenViewerIndex = 0;

  qrCodeData = '';
  qrExpiracion = '';
  qrFotoRecibida = false;
  qrInterval: any = null;

  editando: Documento | null = null;
  newDoc = { nombre: '', descripcion: '' };
  busqueda = '';

  abrirGaleria(tipo: string) {
    this.tipoActual = tipo;
    this.showModal = true;
    this.docSeleccionado = null;
    this.busqueda = '';
    this.cdr.detectChanges();
    this.loadDocumentos(tipo);
  }

  cerrarModal() {
    if (this.qrInterval) { clearInterval(this.qrInterval); this.qrInterval = null; }
    this.showModal = false;
    this.tipoActual = '';
    this.documentos = [];
    this.docSeleccionado = null;
    this.cdr.detectChanges();
  }

  loadDocumentos(tipo: string) {
    this.http.get<Documento[]>(`/api/galeria/${tipo}`).subscribe({
      next: (data) => {
        this.documentos = [];
        this.cdr.detectChanges();
        this.documentos = [...(data || [])];
        this.cdr.detectChanges();
      },
      error: () => {
        this.documentos = [];
        this.cdr.detectChanges();
      },
    });
  }

  getTitulo(): string {
    return this.tipoActual === 'temporales' ? 'Documentos Temporales' : 'Documentos Legales';
  }

  getDocumentosFiltrados(): Documento[] {
    if (!this.busqueda.trim()) return this.documentos;
    const term = this.busqueda.toLowerCase().trim();
    return this.documentos.filter(d =>
      d.nombre.toLowerCase().includes(term) ||
      (d.descripcion || '').toLowerCase().includes(term)
    );
  }

  formatearFecha(fecha: Date | string | undefined): string {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleDateString('es-VE');
  }

  abrirNuevoDoc() {
    this.editando = null;
    this.newDoc = { nombre: '', descripcion: '' };
    this.showDocModal = true;
    this.cdr.detectChanges();
  }

  cerrarDocModal() {
    this.showDocModal = false;
    this.editando = null;
    this.cdr.detectChanges();
  }

  guardarDoc() {
    if (!this.newDoc.nombre.trim()) return;
    if (this.editando) {
      this.http.put(`/api/galeria/${this.tipoActual}/${this.editando._id}`, this.newDoc).subscribe({
        next: () => {
          this.cerrarDocModal();
          this.loadDocumentos(this.tipoActual);
        },
      });
    } else {
      this.http.post<any>(`/api/galeria/${this.tipoActual}`, this.newDoc).subscribe({
        next: (doc) => {
          this.cerrarDocModal();
          this.loadDocumentos(this.tipoActual);
          this.docSeleccionado = { ...doc, imagenes: [] };
          this.imagenesActuales = [];
          this.cdr.detectChanges();
        },
      });
    }
  }

  editarDoc(doc: Documento, e: Event) {
    e.stopPropagation();
    this.editando = doc;
    this.newDoc = {
      nombre: doc.nombre,
      descripcion: doc.descripcion || '',
    };
    this.showDocModal = true;
    this.cdr.detectChanges();
  }

  eliminarDoc(doc: Documento, e: Event) {
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return;
    this.http.delete(`/api/galeria/${this.tipoActual}/${doc._id}`).subscribe({
      next: () => this.loadDocumentos(this.tipoActual),
      error: () => alert('Error al eliminar'),
    });
  }

  abrirDocImagenes(doc: Documento) {
    this.docSeleccionado = doc;
    this.imagenesActuales = doc.imagenes ? [...doc.imagenes] : [];
    this.cdr.detectChanges();
  }

  cerrarDocImagenes() {
    if (this.qrInterval) { clearInterval(this.qrInterval); this.qrInterval = null; }
    this.docSeleccionado = null;
    this.imagenesActuales = [];
    this.showQRModal = false;
    this.cdr.detectChanges();
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
        this.resizeImage(reader.result as string, 1200, (resized) => this.subirImagen(resized));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  abrirCamara() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        this.resizeImage(reader.result as string, 1200, (resized) => this.subirImagen(resized));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  private resizeImage(base64: string, maxWidth: number, callback: (r: string) => void) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = base64;
  }

  private subirImagen(base64: string) {
    const doc = this.docSeleccionado;
    if (!doc) return;
    this.http.post(`/api/galeria/${this.tipoActual}/${doc._id}/upload`, { imagen: base64 }).subscribe({
      next: () => {
        this.imagenesActuales = [...this.imagenesActuales, base64];
        this.loadDocumentos(this.tipoActual);
        this.cdr.detectChanges();
      },
    });
  }

  abrirQR() {
    const doc = this.docSeleccionado;
    if (!doc) return;
    this.qrCodeData = '';
    this.qrExpiracion = '';
    this.qrFotoRecibida = false;
    this.showQRModal = true;
    this.cdr.detectChanges();

    const imagenesIniciales = [...this.imagenesActuales];

    this.http.post<{ qrCode: string; uploadUrl: string; expiresAt: string }>(
      `/api/galeria/${this.tipoActual}/generate-qr`, { docId: doc._id }
    ).subscribe({
      next: (res) => {
        this.qrCodeData = res.qrCode;
        this.qrExpiracion = res.expiresAt;
        this.cdr.detectChanges();

        this.qrInterval = setInterval(() => {
          this.http.get<{ imagenes: string[] }>(`/api/galeria/${this.tipoActual}/imagenes/${doc._id}`).subscribe({
            next: (pollRes) => {
              if (pollRes.imagenes && pollRes.imagenes.length > imagenesIniciales.length) {
                this.qrFotoRecibida = true;
                this.cdr.detectChanges();
                clearInterval(this.qrInterval);
                this.qrInterval = null;
                setTimeout(() => {
                  this.imagenesActuales = pollRes.imagenes;
                  this.showQRModal = false;
                  this.loadDocumentos(this.tipoActual);
                  this.cdr.detectChanges();
                }, 2000);
              }
            },
          });
        }, 2000);
      },
      error: () => {
        alert('Error al generar código QR');
        this.showQRModal = false;
        this.cdr.detectChanges();
      }
    });
  }

  cerrarQR() {
    if (this.qrInterval) { clearInterval(this.qrInterval); this.qrInterval = null; }
    this.showQRModal = false;
    this.cdr.detectChanges();
  }

  eliminarImagen(index: number) {
    if (!confirm('¿Eliminar esta imagen?')) return;
    const doc = this.docSeleccionado;
    if (!doc) return;
    this.http.delete(`/api/galeria/${this.tipoActual}/imagenes/${doc._id}/${index}`).subscribe({
      next: () => {
        this.imagenesActuales = this.imagenesActuales.filter((_, i) => i !== index);
        this.loadDocumentos(this.tipoActual);
        this.cdr.detectChanges();
      },
    });
  }

  verImagen(index: number) {
    this.imagenViewerIndex = index;
    this.showImageViewer = true;
    this.cdr.detectChanges();
  }

  cerrarImageViewer() {
    this.showImageViewer = false;
    this.cdr.detectChanges();
  }

  imagenAnterior() {
    this.imagenViewerIndex = Math.max(0, this.imagenViewerIndex - 1);
    this.cdr.detectChanges();
  }

  imagenSiguiente() {
    this.imagenViewerIndex = Math.min(this.imagenesActuales.length - 1, this.imagenViewerIndex + 1);
    this.cdr.detectChanges();
  }
}
