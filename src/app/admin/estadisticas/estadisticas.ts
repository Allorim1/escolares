import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadisticasService, EstadisticasResumen } from '../../shared/data-access/estadisticas.service';
import { NotificationService } from '../../shared/data-access/notification.service';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.css',
})
export class Estadisticas implements OnInit {
  private estadisticasService = inject(EstadisticasService);
  private notificationService = inject(NotificationService);

  resumen = signal<EstadisticasResumen | null>(null);
  loading = signal(true);

  ngOnInit() {
    this.loadResumen();
  }

  loadResumen() {
    this.loading.set(true);
    this.estadisticasService.getResumen().subscribe({
      next: (data) => {
        this.resumen.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notificationService.error('Error', 'No se pudieron cargar las estadísticas');
      },
    });
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-VE');
  }
}
