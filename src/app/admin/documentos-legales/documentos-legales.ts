import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Documento {
  _id?: string;
  nombre: string;
  descripcion: string;
  archivo: string;
  fechaSubida: Date;
  categoria: string;
}

@Component({
  selector: 'app-documentos-legales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './documentos-legales.html',
  styleUrl: './documentos-legales.css',
})
export class DocumentosLegales implements OnInit {
  private http = inject(HttpClient);
  private API = '/api/documentos-legales';

  documentos = signal<Documento[]>([]);
  showModal = signal(false);
  showPreview = signal(false);
  previewUrl = signal('');
  previewNombre = signal('');
  editando = signal<Documento | null>(null);

  newDoc = {
    nombre: '',
    descripcion: '',
    categoria: 'contrato',
  };

  categorias = [
    { value: 'contrato', label: 'Contratos' },
    { value: 'constitucion', label: 'Acta Constitutiva' },
    { value: 'registro', label: 'Registro' },
    { value: 'poder', label: 'Poder' },
    { value: 'certificado', label: 'Certificados' },
    { value: 'otro', label: 'Otros' },
  ];

  ngOnInit() {
    this.loadDocumentos();
  }

  loadDocumentos() {
    this.http.get<Documento[]>(this.API).subscribe({
      next: (data) => this.documentos.set(data),
      error: (err) => console.error('Error cargando documentos:', err),
    });
  }

  abrirModal() {
    this.editando.set(null);
    this.newDoc = { nombre: '', descripcion: '', categoria: 'contrato' };
    this.showModal.set(true);
  }

  cerrarModal() {
    this.showModal.set(false);
    this.editando.set(null);
  }

  guardarDocumento() {
    if (!this.newDoc.nombre.trim()) return;

    if (this.editando()) {
      this.http.put(`${this.API}/${this.editando()!._id}`, this.newDoc).subscribe({
        next: () => {
          this.loadDocumentos();
          this.cerrarModal();
        },
        error: (err) => console.error('Error actualizando documento:', err),
      });
    } else {
      this.http.post(this.API, this.newDoc).subscribe({
        next: () => {
          this.loadDocumentos();
          this.cerrarModal();
        },
        error: (err) => console.error('Error creando documento:', err),
      });
    }
  }

  editarDocumento(doc: Documento) {
    this.editando.set(doc);
    this.newDoc = {
      nombre: doc.nombre,
      descripcion: doc.descripcion || '',
      categoria: doc.categoria || 'contrato',
    };
    this.showModal.set(true);
  }

  eliminarDocumento(doc: Documento) {
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return;
    this.http.delete(`${this.API}/${doc._id}`).subscribe({
      next: () => this.loadDocumentos(),
      error: (err) => console.error('Error eliminando documento:', err),
    });
  }

  previewDocumento(doc: Documento) {
    this.previewUrl.set(doc.archivo);
    this.previewNombre.set(doc.nombre);
    this.showPreview.set(true);
  }

  cerrarPreview() {
    this.showPreview.set(false);
    this.previewUrl.set('');
  }

  getCategoriaLabel(valor: string): string {
    return this.categorias.find(c => c.value === valor)?.label || valor;
  }

  formatearFecha(fecha: Date | string | undefined): string {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleDateString('es-VE');
  }
}
