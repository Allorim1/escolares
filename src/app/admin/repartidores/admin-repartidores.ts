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
  fotoDNI?: string;
  createdAt: Date;
  updatedAt: Date;
  isUser?: boolean;
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
  repartidorUsers = signal<DeliveryPerson[]>([]);
  combinedList = signal<DeliveryPerson[]>([]);
  showModal = signal(false);
  editingPerson = signal<DeliveryPerson | null>(null);
  isAdding = signal(false);
  formData = signal({
    nombre: '',
    telefono: '',
    activo: true,
    email: '',
    password: '',
    fotoDNI: ''
  });
  selectedDNIFile: File | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadDeliveryPersons();
    this.loadRepartidorUsers();
  }

  loadDeliveryPersons() {
    this.http.get<DeliveryPerson[]>('/api/delivery').subscribe({
      next: (data) => {
        this.deliveryPersons.set(data);
        this.updateCombinedList();
      },
      error: (err) => console.error('Error cargando repartidores:', err)
    });
  }

  loadRepartidorUsers() {
    this.http.get<any[]>('/api/users?role=repartidor').subscribe({
      next: (users) => {
        const repartidores = users.map(user => {
          const deliveryPersonId = user._id || user.deliveryPersonId;
          return {
            id: deliveryPersonId,
            nombre: user.nombreCompleto || user.username,
            telefono: user.telefono,
            activo: user.activo,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
            isUser: true
          };
        });
        this.repartidorUsers.set(repartidores);
        this.updateCombinedList();
      },
      error: (err) => console.error('Error cargando usuarios repartidores:', err)
    });
  }

  updateCombinedList() {
    this.combinedList.set([
      ...this.deliveryPersons(),
      ...this.repartidorUsers()
    ]);
  }

  showAddForm() {
    this.isAdding.set(true);
    this.editingPerson.set(null);
    this.formData.set({
      nombre: '',
      telefono: '',
      activo: true,
      email: '',
      password: '',
      fotoDNI: ''
    });
    this.selectedDNIFile = null;
    this.showModal.set(true);
  }

  async showEditForm(person: DeliveryPerson) {
    this.editingPerson.set(person);
    this.isAdding.set(false);
    this.formData.set({
      nombre: person.nombre,
      telefono: person.telefono || '',
      activo: person.activo,
      email: '',
      password: '',
      fotoDNI: person.fotoDNI || ''
    });
    this.selectedDNIFile = null;
    this.showModal.set(true);
  }

  onDNIFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedDNIFile = file;
    }
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
         next: (newPerson) => {
           if (this.selectedDNIFile && newPerson.id) {
             this.uploadDNI(newPerson.id);
           } else {
             this.loadDeliveryPersons();
             this.loadRepartidorUsers();
             this.cancelEdit();
           }
         },
        error: (err) => {
          console.error('Error creando repartidor:', err);
          alert('Error al crear repartidor');
        }
      });
    } else {
      const person = this.editingPerson();
      if (!person?.id) return;
      const updateData: any = {
        nombre: data.nombre,
        telefono: data.telefono,
        activo: data.activo
      };
      if (data.email) updateData.email = data.email;
      if (data.password) updateData.password = data.password;
      const personId = person.id;
this.http.put<DeliveryPerson>(`/api/delivery/${personId}`, updateData).subscribe({
         next: () => {
           if (this.selectedDNIFile) {
             this.uploadDNI(personId);
           } else {
             this.loadDeliveryPersons();
             this.loadRepartidorUsers();
             this.cancelEdit();
           }
         },
        error: (err) => {
          console.error('Error actualizando repartidor:', err);
          alert('Error al actualizar repartidor');
        }
      });
    }
  }

  uploadDNI(personId: string) {
    if (!this.selectedDNIFile) return;
    
    const formData = new FormData();
    formData.append('dni', this.selectedDNIFile);
    
    this.http.post<DeliveryPerson>(`/api/delivery/${personId}/dni`, formData).subscribe({
      next: () => {
        this.loadDeliveryPersons();
        this.cancelEdit();
      },
      error: (err) => {
        console.error('Error subiendo DNI:', err);
        alert('Error al subir foto de DNI');
      }
    });
  }

  deletePerson(person: DeliveryPerson) {
    if (!confirm(`¿Eliminar repartidor "${person.nombre}"?`)) return;
    this.http.delete(`/api/delivery/${person.id}`).subscribe({
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
    this.http.put<DeliveryPerson>(`/api/delivery/${person.id}`, updated).subscribe({
      next: () => this.loadDeliveryPersons(),
      error: (err) => {
        console.error('Error cambiando estado:', err);
        alert('Error al cambiar estado');
      }
    });
  }
}
