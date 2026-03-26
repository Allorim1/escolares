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
export class Galeria {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  tipoActual: 'temporales' | 'legales' | null = null;
  documentos: Documento[] = [];
  showModal = false;
  showDocModal = false;
  showQRModal = false;
  showImageViewer = false;

  docSeleccionado: Documento | null = null;
  imagenesActuales: string[] = [];
  imagenViewerIndex = 0;

  qrCodeData = '';
  qrExpiracion = '';
  qrFotoRecibida = false;
  qrInterval: any = null;

  editando: Documento | null = null;
  newDoc = { nombre: '', descripcion: '', fechaVencimiento: '', categoria: 'otro' };

  categorias = [
    { value: 'contrato', label: 'Contratos' },
    { value: 'constitucion', label: 'Acta Constitutiva' },
    { value: 'registro', label: 'Registro' },
    { value: 'poder', label: 'Poder' },
    { value: 'certificado', label: 'Certificados' },
    { value: 'otro', label: 'Otros' },
  ];

  abrirGaleria(tipo: 'temporales' | 'legales') {
    this.tipoActual = tipo;
    this.showModal = true;
    this.loadDocumentos(tipo);
    this.cdr.detectChanges();
  }

  cerrarModal() {
    this.showModal = false;
    this.tipoActual = null;
    this.documentos = [];
    this.docSeleccionado = null;
    this.cdr.detectChanges();
  }

  loadDocumentos(tipo: string) {
    this.http.get<Documento[]>(`/api/galeria/${tipo}`).subscribe({
      next: (data) => {
        this.documentos = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando documentos:', err);
        this.cdr.detectChanges();
      },
    });
  }

  getTitulo(): string {
    return this.tipoActual === 'temporales' ? 'Documentos Temporales' : 'Documentos Legales';
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
    this.editando = null;
    this.newDoc = { nombre: '', descripcion: '', fechaVencimiento: '', categoria: 'otro' };
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
    const tipo = this.tipoActual!;
    if (this.editando) {
      this.http.put(`/api/galeria/${tipo}/${this.editando._id}`, this.newDoc).subscribe({
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
    this.editando = doc;
    this.newDoc = {
      nombre: doc.nombre,
      descripcion: doc.descripcion || '',
      fechaVencimiento: doc.fechaVencimiento ? new Date(doc.fechaVencimiento).toISOString().split('T')[0] : '',
      categoria: doc.categoria || 'otro',
    };
    this.showDocModal = true;
    this.cdr.detectChanges();
  }

  eliminarDoc(doc: Documento, e: Event) {
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return;
    const tipo = this.tipoActual!;
    this.http.delete(`/api/galeria/${tipo}/${doc._id}`).subscribe({
      next: () => this.loadDocumentos(tipo),
      error: (err) => console.error('Error eliminando:', err),
    });
  }

  abrirDocImagenes(doc: Documento) {
    this.docSeleccionado = doc;
    this.imagenesActuales = doc.imagenes ? [...doc.imagenes] : [];
    this.showQRModal = false;
    this.qrFotoRecibida = false;
    this.cdr.detectChanges();
  }

  cerrarDocImagenes() {
    if (this.qrInterval) {
      clearInterval(this.qrInterval);
      this.qrInterval = null;
    }
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
    input.capture = 'environment' as any;
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
    const doc = this.docSeleccionado;
    const tipo = this.tipoActual!;
    if (!doc) return;
    this.http.post(`/api/galeria/${tipo}/${doc._id}/upload`, { imagen: base64 }).subscribe({
      next: () => {
        this.imagenesActuales = [...this.imagenesActuales, base64];
        this.loadDocumentos(tipo);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error subiendo imagen:', err),
    });
  }

  abrirQR() {
    const doc = this.docSeleccionado;
    const tipo = this.tipoActual!;
    if (!doc) return;
    this.qrCodeData = '';
    this.qrExpiracion = '';
    this.qrFotoRecibida = false;
    this.showQRModal = true;
    this.cdr.detectChanges();

    const imagenesIniciales = [...this.imagenesActuales];

    this.http.post<{ qrCode: string; uploadUrl: string; expiresAt: string }>(`/api/galeria/${tipo}/generate-qr`, {
      docId: doc._id
    }).subscribe({
      next: (res) => {
        this.qrCodeData = res.qrCode;
        this.qrExpiracion = res.expiresAt;
        this.cdr.detectChanges();

        this.qrInterval = setInterval(() => {
          this.http.get<{ imagenes: string[] }>(`/api/galeria/${tipo}/imagenes/${doc._id}`).subscribe({
            next: (pollRes) => {
              if (pollRes.imagenes && pollRes.imagenes.length > imagenesIniciales.length) {
                this.qrFotoRecibida = true;
                this.cdr.detectChanges();
                clearInterval(this.qrInterval);
                this.qrInterval = null;
                setTimeout(() => {
                  this.imagenesActuales = pollRes.imagenes;
                  this.showQRModal = false;
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
        this.showQRModal = false;
        this.cdr.detectChanges();
      }
    });
  }

  cerrarQR() {
    if (this.qrInterval) {
      clearInterval(this.qrInterval);
      this.qrInterval = null;
    }
    this.showQRModal = false;
    this.cdr.detectChanges();
  }

  eliminarImagen(index: number) {
    if (!confirm('¿Eliminar esta imagen?')) return;
    const doc = this.docSeleccionado;
    const tipo = this.tipoActual!;
    if (!doc) return;
    this.http.delete(`/api/galeria/${tipo}/imagenes/${doc._id}/${index}`).subscribe({
      next: () => {
        this.imagenesActuales = this.imagenesActuales.filter((_, i) => i !== index);
        this.loadDocumentos(tipo);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error eliminando imagen:', err),
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
