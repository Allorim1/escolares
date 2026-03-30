import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/data-access/auth.service';

interface Manual {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  fechaSubida: Date;
  url: string;
  tamano: number;
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

  manuales = signal<Manual[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  showModal = signal(false);
  isEditing = signal(false);
  editingManual = signal<Manual | null>(null);

  formNombre = '';
  formDescripcion = '';
  formTipo = 'manual';
  selectedFile: File | null = null;

  tiposDocumento = [
    { value: 'manual', label: 'Manual' },
    { value: 'guia', label: 'Guía' },
    { value: 'procedimiento', label: 'Procedimiento' },
    { value: 'instructivo', label: 'Instructivo' },
    { value: 'politica', label: 'Política' },
    { value: 'formato', label: 'Formato' },
    { value: 'otro', label: 'Otro' },
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
        this.error.set('Error al cargar manuales');
        this.cargando.set(false);
      },
    });
  }

  openAddModal() {
    this.isEditing.set(false);
    this.editingManual.set(null);
    this.formNombre = '';
    this.formDescripcion = '';
    this.formTipo = 'manual';
    this.selectedFile = null;
    this.showModal.set(true);
  }

  openEditModal(manual: Manual) {
    this.isEditing.set(true);
    this.editingManual.set(manual);
    this.formNombre = manual.nombre;
    this.formDescripcion = manual.descripcion;
    this.formTipo = manual.tipo;
    this.selectedFile = null;
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.isEditing.set(false);
    this.editingManual.set(null);
    this.clearMessages();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  guardarManual() {
    if (!this.formNombre.trim()) {
      this.error.set('El nombre es requerido');
      return;
    }

    if (this.isEditing()) {
      this.actualizarManual();
    } else {
      this.subirManual();
    }
  }

  subirManual() {
    if (!this.selectedFile) {
      this.error.set('Debe seleccionar un archivo');
      return;
    }

    const formData = new FormData();
    formData.append('nombre', this.formNombre);
    formData.append('descripcion', this.formDescripcion);
    formData.append('tipo', this.formTipo);
    formData.append('archivo', this.selectedFile);

    this.http.post('/api/manuales', formData).subscribe({
      next: () => {
        this.success.set('Manual subido correctamente');
        this.cargarManuales();
        this.closeModal();
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Error al subir manual');
      },
    });
  }

  actualizarManual() {
    const manual = this.editingManual();
    if (!manual) return;

    const formData = new FormData();
    formData.append('nombre', this.formNombre);
    formData.append('descripcion', this.formDescripcion);
    formData.append('tipo', this.formTipo);
    if (this.selectedFile) {
      formData.append('archivo', this.selectedFile);
    }

    this.http.put(`/api/manuales/${manual.id}`, formData).subscribe({
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
    if (!confirm(`¿Estás seguro de eliminar "${manual.nombre}"?`)) {
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

  descargarManual(manual: Manual) {
    window.open(`/api/manuales/${manual.id}/descargar`, '_blank');
  }

  getTipoLabel(tipo: string): string {
    const found = this.tiposDocumento.find(t => t.value === tipo);
    return found ? found.label : tipo;
  }

  formatTamano(tamano: number): string {
    if (tamano < 1024) return tamano + ' B';
    if (tamano < 1024 * 1024) return (tamano / 1024).toFixed(1) + ' KB';
    return (tamano / (1024 * 1024)).toFixed(1) + ' MB';
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
}
