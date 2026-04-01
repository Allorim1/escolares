import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../shared/data-access/auth.service';
import { StoreSettingsService } from '../../shared/data-access/store-settings.service';

interface DashboardStats {
  totalProveedores: number;
  totalFacturas: number;
  facturasPendientes: number;
  facturasPagadas: number;
  totalDeuda: number;
  totalPagado: number;
  productos: number;
  usuarios: number;
}

@Component({
  selector: 'app-admin-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class AdminInicio implements OnInit {
  private http = inject(HttpClient);
  authService = inject(AuthService);
  storeSettings = inject(StoreSettingsService);
  
  get userName(): string {
    const user = this.authService.user();
    return user?.nombreCompleto || user?.username || 'Usuario';
  }
  
  get isRoot(): boolean {
    const user = this.authService.user();
    return user?.rol === 'root';
  }
  
  stats = signal<DashboardStats>({
    totalProveedores: 0,
    totalFacturas: 0,
    facturasPendientes: 0,
    facturasPagadas: 0,
    totalDeuda: 0,
    totalPagado: 0,
    productos: 0,
    usuarios: 0,
  });

  loading = signal(true);

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.http.get<any>('/api/proveedores').subscribe({
      next: (proveedores: any[]) => {
        let facturasPendientes = 0;
        let facturasPagadas = 0;
        let totalDeuda = 0;
        let totalPagado = 0;
        let totalFacturas = 0;

        proveedores.forEach(p => {
          if (p.facturas) {
            totalFacturas += p.facturas.length;
            p.facturas.forEach((f: any) => {
              const deuda = f.deudaActual || 0;
              const pagado = (f.totalPagar || 0) - deuda;
              
              if (deuda > 0) {
                facturasPendientes++;
              } else {
                facturasPagadas++;
              }
              
              totalDeuda += deuda;
              totalPagado += pagado;
            });
          }
        });

        this.stats.set({
          totalProveedores: proveedores.length,
          totalFacturas,
          facturasPendientes,
          facturasPagadas,
          totalDeuda,
          totalPagado,
          productos: 0,
          usuarios: 0,
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  formatMoneda(value: number): string {
    return value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  toggleCompras() {
    this.storeSettings.toggleCompras();
  }
}
