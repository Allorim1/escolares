import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { FacturaService, Factura, ResumenFacturas } from '../../shared/data-access/factura.service';
import { RegistroService } from '../../shared/data-access/registro.service';

@Component({
  selector: 'app-admin-facturacion',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './facturacion.html',
  styleUrl: './facturacion.css',
})
export class AdminFacturacion implements OnInit {
  facturaService = inject(FacturaService);
  registroService = inject(RegistroService);

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  showModal = false;
  editingFactura: Factura | null = null;
  
  newFactura = {
    cliente: '',
    total: 0,
  };

  chartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      { data: [], label: 'Dinero Entrante', backgroundColor: '#f59e0b' },
      { data: [], label: 'Dinero Real', backgroundColor: '#10b981' },
    ],
  };

  chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
    },
  };

  ngOnInit() {
    this.facturaService.loadResumen();
  }

  get facturas() {
    return this.facturaService.facturas();
  }

  get resumen(): ResumenFacturas | null {
    return this.facturaService.resumen();
  }

  getChartData() {
    const r = this.resumen;
    if (!r) return this.chartData;

    const labels = r.porMes.map(p => p.mes);
    const entrante = r.porMes.map(p => p.entrante);
    const real = r.porMes.map(p => p.real);

    return {
      labels,
      datasets: [
        { data: entrante, label: 'Dinero Entrante', backgroundColor: '#f59e0b' },
        { data: real, label: 'Dinero Real', backgroundColor: '#10b981' },
      ],
    };
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
    }).format(value);
  }

  openModal(factura?: Factura) {
    if (factura) {
      this.editingFactura = factura;
      this.newFactura = { cliente: factura.cliente, total: factura.total };
    } else {
      this.editingFactura = null;
      this.newFactura = { cliente: '', total: 0 };
    }
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingFactura = null;
    this.newFactura = { cliente: '', total: 0 };
  }

  saveFactura() {
    if (!this.newFactura.cliente || this.newFactura.total <= 0) {
      alert('Por favor completa todos los campos');
      return;
    }

    if (this.editingFactura) {
      this.registroService.registrar('editar', 'Facturación', `Factura actualizada para ${this.newFactura.cliente}`, { cliente: this.newFactura.cliente, total: this.newFactura.total });
    } else {
      this.facturaService.crearFactura(this.newFactura.cliente, [], this.newFactura.total);
      this.registroService.registrar('crear', 'Facturación', `Factura creada para ${this.newFactura.cliente}`, { cliente: this.newFactura.cliente, total: this.newFactura.total });
    }

    this.closeModal();
  }

  marcarPagada(factura: Factura) {
    if (confirm('¿Marcar esta factura como pagada?')) {
      this.facturaService.marcarPagada(factura._id!);
      this.registroService.registrar('editar', 'Facturación', `Factura pagada: ${factura.cliente}`, { cliente: factura.cliente, total: factura.total });
    }
  }

  eliminarFactura(factura: Factura) {
    if (confirm('¿Eliminar esta factura?')) {
      this.facturaService.eliminarFactura(factura._id!);
      this.registroService.registrar('eliminar', 'Facturación', `Factura eliminada: ${factura.cliente}`, { cliente: factura.cliente, total: factura.total });
    }
  }

  formatearFecha(fecha: Date | string): string {
    return new Date(fecha).toLocaleDateString('es-VE');
  }
}
