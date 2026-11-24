import { Component, OnInit, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';
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

interface DeliveryUserResponse {
  id: string;
  deliveryPersonId?: string;
  nombreCompleto?: string;
  username?: string;
  telefono?: string;
  activo?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

@Component({
  selector: 'app-admin-repartidores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-repartidores.html',
  styleUrls: ['./admin-repartidores.css'],
})
export class AdminRepartidoresComponent implements OnInit {
  private http = inject(HttpClient);
  private notifications = inject(NotificationModalService);

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
    fotoDNI: '',
  });
  selectedDNIFile: File | null = null;

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
      error: (err) => console.error('Error cargando repartidores:', err),
    });
  }

  loadRepartidorUsers() {
    this.http.get<DeliveryUserResponse[]>('/api/users?role=repartidor').subscribe({
      next: (users) => {
        const repartidores = users.map((user) => {
          const deliveryPersonId = user.deliveryPersonId || user.id;
          return {
            id: deliveryPersonId,
            nombre: user.nombreCompleto || user.username || '',
            telefono: user.telefono,
            activo: user.activo !== undefined ? user.activo : true,
            createdAt: new Date(user.createdAt ?? Date.now()),
            updatedAt: new Date(user.updatedAt ?? Date.now()),
            isUser: true,
          };
        });
        this.repartidorUsers.set(repartidores);
        this.updateCombinedList();
      },
      error: (err) => console.error('Error cargando usuarios repartidores:', err),
    });
  }

  async updateCombinedList() {
    const merged = [...this.deliveryPersons(), ...this.repartidorUsers()];
    const seen = new Set<string>();

    const deduped = merged.filter((person) => {
      const key = person.id || person._id || person.nombre;
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    this.combinedList.set(deduped);
  }

  async showAddForm() {
    this.isAdding.set(true);
    this.editingPerson.set(null);
    this.formData.set({
      nombre: '',
      telefono: '',
      activo: true,
      email: '',
      password: '',
      fotoDNI: '',
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
      fotoDNI: person.fotoDNI || '',
    });
    this.selectedDNIFile = null;
    this.showModal.set(true);
  }

  async onDNIFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedDNIFile = file;
    }
  }

  async cancelEdit() {
    this.showModal.set(false);
    this.isAdding.set(false);
    this.editingPerson.set(null);
  }

  async savePerson() {
    const data = this.formData();
    if (!data.nombre.trim()) {
      this.notifications.error('El nombre es requerido');
      return;
    }

    if (this.isAdding()) {
      if (!data.email || !data.password) {
        this.notifications.error('Email y password son requeridos para crear el repartidor');
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
          this.notifications.fromHttpError(err, 'Error al crear repartidor');
        },
      });
    } else {
      const person = this.editingPerson();
      if (!person?.id) return;
      const updateData: {
        nombre: string;
        telefono: string;
        activo: boolean;
        email?: string;
        password?: string;
      } = {
        nombre: data.nombre,
        telefono: data.telefono,
        activo: data.activo,
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
          this.notifications.fromHttpError(err, 'Error al actualizar repartidor');
        },
      });
    }
  }

  async uploadDNI(personId: string) {
    if (!this.selectedDNIFile) return;

    const formData = new FormData();
    formData.append('dni', this.selectedDNIFile);

    this.http.post<DeliveryPerson>(`/api/delivery/${personId}/dni`, formData).subscribe({
      next: () => {
        this.loadDeliveryPersons();
        this.loadRepartidorUsers();
        this.cancelEdit();
      },
      error: (err) => {
        console.error('Error subiendo DNI:', err);
        this.notifications.fromHttpError(err, 'Error al subir foto de DNI');
      },
    });
  }

  async deletePerson(person: DeliveryPerson) {
    const ok = await this.notifications.confirm({ titulo: 'Confirmar acción', mensaje: `¿Eliminar repartidor "${person.nombre}"?`, tipo: 'danger', confirmarTexto: 'Eliminar' });
    if (!ok) return;
    this.http.delete(`/api/delivery/${person.id}`).subscribe({
      next: () => {
        this.loadDeliveryPersons();
        this.loadRepartidorUsers();
      },
      error: (err) => {
        console.error('Error eliminando repartidor:', err);
        this.notifications.fromHttpError(err, 'Error al eliminar repartidor');
      },
    });
  }

  toggleActivo(person: DeliveryPerson) {
    const updated = {
      nombre: person.nombre,
      telefono: person.telefono,
      activo: !person.activo,
    };
    this.http.put<DeliveryPerson>(`/api/delivery/${person.id}`, updated).subscribe({
      next: () => {
        this.loadDeliveryPersons();
        this.loadRepartidorUsers();
      },
      error: (err) => {
        console.error('Error cambiando estado:', err);
        this.notifications.fromHttpError(err, 'Error al cambiar estado');
      },
    });
  }
}