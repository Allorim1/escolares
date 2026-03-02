import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarcasService } from '../../shared/data-access/marcas.service';

@Component({
  selector: 'app-admin-marcas',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-marcas.html',
  styleUrl: './admin-marcas.css',
})
export class AdminMarcas {
  marcasService = inject(MarcasService);

  marcas = this.marcasService.marcas;
  editingIndex = signal<string | null>(null);
  isAdding = signal(false);
  newMarcaName = signal('');
  newMarcaImage = signal('');
  editImagePreview = signal<string>('');
  message = signal<string>('');
  messageType = signal<'success' | 'error'>('success');

  showMessage(text: string, type: 'success' | 'error' = 'success') {
    this.message.set(text);
    this.messageType.set(type);
    setTimeout(() => this.message.set(''), 3000);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.convertToBase64(file, (base64) => {
        this.newMarcaImage.set(base64);
      });
    }
  }

  onFileSelectedEdit(event: Event, id: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.convertToBase64(file, (base64) => {
        this.editImagePreview.set(base64);
      });
    }
  }

  private convertToBase64(file: File, callback: (base64: string) => void) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      callback(result);
    };
    reader.readAsDataURL(file);
  }

  agregarMarca() {
    const name = this.newMarcaName();
    if (!name || !name.trim()) {
      this.showMessage('Por favor ingresa el nombre de la marca', 'error');
      return;
    }

    this.marcasService.agregarMarca(name, this.newMarcaImage());
    this.newMarcaName.set('');
    this.newMarcaImage.set('');
    this.isAdding.set(false);
    this.showMessage('Marca agregada correctamente');
  }

  eliminarMarca(id: string) {
    if (confirm('¿Estás seguro de eliminar esta marca?')) {
      this.marcasService.eliminarMarca(id);
      this.showMessage('Marca eliminada correctamente');
    }
  }

  activarEdicion(id: string) {
    this.editingIndex.set(id);
    this.editImagePreview.set('');
  }

  guardarEdicion(id: string, nombre: string) {
    if (!nombre || !nombre.trim()) {
      this.showMessage('Por favor ingresa el nombre de la marca', 'error');
      return;
    }

    const imagen = this.editImagePreview() || this.marcas().find((m) => m.id === id)?.image || '';
    this.marcasService.actualizarMarca(id, nombre, imagen);
    this.editingIndex.set(null);
    this.editImagePreview.set('');
    this.showMessage('Marca actualizada correctamente');
  }

  cancelarEdicion() {
    this.editingIndex.set(null);
    this.isAdding.set(false);
    this.newMarcaName.set('');
    this.newMarcaImage.set('');
    this.editImagePreview.set('');
  }

  showAddForm() {
    this.isAdding.set(true);
    this.editingIndex.set(null);
    this.newMarcaName.set('');
    this.newMarcaImage.set('');
  }
}
