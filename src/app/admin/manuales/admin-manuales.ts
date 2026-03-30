import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/data-access/auth.service';

interface Paso {
  id: string;
  numero: number;
  titulo: string;
  descripcion: string;
  imagen?: string;
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

  manuales = signal<Manual[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

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
        this.error.set('Error al cargar manuales');
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
    this.clearMessages();
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
      descripcion: '',
      imagen: ''
    };
    this.formPasos.push(nuevoPaso);
  }

  eliminarPaso(index: number) {
    this.formPasos.splice(index, 1);
    // Renumber steps
    this.formPasos.forEach((paso, i) => {
      paso.numero = i + 1;
    });
  }

  moverPasoArriba(index: number) {
    if (index > 0) {
      const temp = this.formPasos[index];
      this.formPasos[index] = this.formPasos[index - 1];
      this.formPasos[index - 1] = temp;
      this.formPasos.forEach((paso, i) => {
        paso.numero = i + 1;
      });
    }
  }

  moverPasoAbajo(index: number) {
    if (index < this.formPasos.length - 1) {
      const temp = this.formPasos[index];
      this.formPasos[index] = this.formPasos[index + 1];
      this.formPasos[index + 1] = temp;
      this.formPasos.forEach((paso, i) => {
        paso.numero = i + 1;
      });
    }
  }

  onImageSelected(event: any, pasoIndex: number) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.formPasos[pasoIndex].imagen = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  guardarManual() {
    if (!this.formTitulo.trim()) {
      this.error.set('El título es requerido');
      return;
    }

    if (this.formPasos.length === 0) {
      this.error.set('Debe agregar al menos un paso');
      return;
    }

    // Validate steps
    for (let i = 0; i < this.formPasos.length; i++) {
      if (!this.formPasos[i].titulo.trim()) {
        this.error.set(`El paso ${i + 1} debe tener un título`);
        return;
      }
      if (!this.formPasos[i].descripcion.trim()) {
        this.error.set(`El paso ${i + 1} debe tener una descripción`);
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
