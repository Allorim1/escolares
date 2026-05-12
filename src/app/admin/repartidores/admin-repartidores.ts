import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DeliveryPerson {
  _id?: string;
  id: string;
  nombre: string;
  telefono?: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-admin-repartidores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-repartidores.html',
  styleUrls: ['./admin-repartidores.css']
})
export class AdminRepartidoresComponent implements OnInit {
  deliveryPersons = signal<DeliveryPerson[]>([]);
  showModal = signal(false);
  editingPerson = signal<DeliveryPerson | null>(null);
  isAdding = signal(false);
  formData = signal({
    nombre: '',
    telefono: '',
    activo: true,
    email: '',
    password: ''
  });

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadDeliveryPersons();
  }

  loadDeliveryPersons() {
    this.http.get<DeliveryPerson[]>('/api/delivery').subscribe({
      next: (data) => this.deliveryPersons.set(data),
      error: (err) => console.error('Error cargando repartidores:', err)
    });
  }

  showAddForm() {
    this.isAdding.set(true);
    this.editingPerson.set(null);
    this.formData.set({
      nombre: '',
      telefono: '',
      activo: true,
      email: '',
      password: ''
    });
    this.showModal.set(true);
  }

  showEditForm(person: DeliveryPerson) {
    this.editingPerson.set(person);
    this.isAdding.set(false);
    this.formData.set({
      nombre: person.nombre,
      telefono: person.telefono || '',
      activo: person.activo,
      email: '',
      password: ''
    });
    this.showModal.set(true);
  }

  cancelEdit() {
    this.showModal.set(false);
    this.isAdding.set(false);
    this.editingPerson.set(null);
  }

  savePerson() {
    const data = this.formData();
    if (!data.nombre.trim()) {
      alert('El nombre es requerido');
      return;
    }

    if (this.isAdding()) {
      if (!data.email || !data.password) {
        alert('Email y password son requeridos para crear el repartidor');
        return;
      }
      this.http.post<DeliveryPerson>('/api/delivery', data).subscribe({
        next: () => {
          this.loadDeliveryPersons();
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Error creando repartidor:', err);
          alert('Error al crear repartidor');
        }
      });
    } else {
      const person = this.editingPerson();
      if (!person?._id) return;
      const updateData: any = {
        nombre: data.nombre,
        telefono: data.telefono,
        activo: data.activo
      };
      if (data.email) updateData.email = data.email;
      if (data.password) updateData.password = data.password;
      this.http.put<DeliveryPerson>(`/api/delivery/${person._id}`, updateData).subscribe({
        next: () => {
          this.loadDeliveryPersons();
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Error actualizando repartidor:', err);
          alert('Error al actualizar repartidor');
        }
      });
    }
  }

  deletePerson(person: DeliveryPerson) {
    if (!confirm(`¿Eliminar repartidor "${person.nombre}"?`)) return;
    this.http.delete(`/api/delivery/${person._id}`).subscribe({
      next: () => this.loadDeliveryPersons(),
      error: (err) => {
        console.error('Error eliminando repartidor:', err);
        alert('Error al eliminar repartidor');
      }
    });
  }

  toggleActivo(person: DeliveryPerson) {
    const updated = { 
      nombre: person.nombre, 
      telefono: person.telefono, 
      activo: !person.activo 
    };
    this.http.put<DeliveryPerson>(`/api/delivery/${person._id}`, updated).subscribe({
      next: () => this.loadDeliveryPersons(),
      error: (err) => {
        console.error('Error cambiando estado:', err);
        alert('Error al cambiar estado');
      }
    });
  }
}
