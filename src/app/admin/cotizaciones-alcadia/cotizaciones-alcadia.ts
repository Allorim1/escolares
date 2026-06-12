import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CotizacionService } from '../../shared/data-access/cotizacion.service';
import { ExportarPdfService } from '../../shared/services/exportar-pdf.service';
import { Cotizacion, ItemCotizacion } from '../../shared/interfaces/cotizacion.interface';

@Component({
  selector: 'app-cotizaciones-alcadia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cotizaciones-alcadia.html',
  styleUrl: './cotizaciones-alcadia.css',
})
export class CotizacionesAlcadia implements OnInit {
  cotizacionService = inject(CotizacionService);
  exportarPdfService = inject(ExportarPdfService);

  showModal = false;
  editingCotizacion: Cotizacion | null = null;

  newCotizacion: Cotizacion = {
    numeroCotizacion: '',
    fecha: new Date().toISOString().split('T')[0],
    cliente: {
      nombre: '',
      rif: '',
      direccion: '',
      telefono: '',
    },
    items: [],
    referencia: {
      numeroReferencia: '',
      validezDias: 5,
      vendedor: '',
    },
    totales: {
      netoBs: 0,
      porcentajeDescuento: 0,
      descuentoBs: 0,
      subTotalBs: 0,
      ivaPorcentaje: 16,
      ivaBs: 0,
      exentoBs: 0,
      totalBs: 0,
    },
  };

  newItem: ItemCotizacion = {
    codigo: '',
    cantidad: 1,
    descripcion: '',
    precioUnitarioBs: 0,
    montoTotalBs: 0,
  };

  ngOnInit(): void {
    // Carga automática desde el servicio
  }

  get cotizaciones() {
    return this.cotizacionService.cotizaciones();
  }

  openModal(cotizacion?: Cotizacion) {
    if (cotizacion) {
      this.editingCotizacion = cotizacion;
      this.newCotizacion = { ...cotizacion };
    } else {
      this.editingCotizacion = null;
      this.resetForm();
    }
    this.showModal = true;
  }

  generatePdfFromRow(cotizacion: Cotizacion) {
    const docDefinition = this.exportarPdfService.generarCotizacionPdf(cotizacion);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfMake = (window as any).pdfMake;
    if (pdfMake) {
      pdfMake.createPdf(docDefinition).open();
    } else {
      alert('pdfMake no está disponible');
    }
  }

  closeModal() {
    this.showModal = false;
    this.editingCotizacion = null;
    this.resetForm();
  }

  resetForm() {
    this.newCotizacion = {
      numeroCotizacion: '',
      fecha: new Date().toISOString().split('T')[0],
      cliente: {
        nombre: '',
        rif: '',
        direccion: '',
        telefono: '',
      },
      items: [],
      referencia: {
        numeroReferencia: '',
        validezDias: 5,
        vendedor: '',
      },
      totales: {
        netoBs: 0,
        porcentajeDescuento: 0,
        descuentoBs: 0,
        subTotalBs: 0,
        ivaPorcentaje: 16,
        ivaBs: 0,
        exentoBs: 0,
        totalBs: 0,
      },
    };
    this.newItem = {
      codigo: '',
      cantidad: 1,
      descripcion: '',
      precioUnitarioBs: 0,
      montoTotalBs: 0,
    };
  }

  addItem() {
    if (!this.newItem.codigo || !this.newItem.descripcion || this.newItem.cantidad <= 0 || this.newItem.precioUnitarioBs <= 0) {
      alert('Por favor completa todos los campos del artículo');
      return;
    }

    this.newItem.montoTotalBs = this.newItem.cantidad * this.newItem.precioUnitarioBs;
    this.newCotizacion.items = [...this.newCotizacion.items, { ...this.newItem }];
    
    this.calculateTotals();
    
    this.newItem = {
      codigo: '',
      cantidad: 1,
      descripcion: '',
      precioUnitarioBs: 0,
      montoTotalBs: 0,
    };
  }

  removeItem(index: number) {
    this.newCotizacion.items = this.newCotizacion.items.filter((_, i) => i !== index);
    this.calculateTotals();
  }

  calculateTotals() {
    const neto = this.newCotizacion.items.reduce((sum, item) => sum + item.montoTotalBs, 0);
    this.newCotizacion.totales.netoBs = neto;
    
    const descuento = (neto * this.newCotizacion.totales.porcentajeDescuento) / 100;
    this.newCotizacion.totales.descuentoBs = descuento;
    
    const subTotal = neto - descuento;
    this.newCotizacion.totales.subTotalBs = subTotal;
    
    const iva = (subTotal * this.newCotizacion.totales.ivaPorcentaje) / 100;
    this.newCotizacion.totales.ivaBs = iva;
    
    this.newCotizacion.totales.totalBs = subTotal + iva;
  }

  saveCotizacion() {
    if (!this.newCotizacion.numeroCotizacion || !this.newCotizacion.cliente.nombre) {
      alert('Por favor completa los campos obligatorios');
      return;
    }

    if (this.newCotizacion.items.length === 0) {
      alert('Agrega al menos un artículo a la cotización');
      return;
    }

    if (this.editingCotizacion?._id) {
      this.cotizacionService.actualizarCotizacion(this.editingCotizacion._id, this.newCotizacion);
    } else {
      this.cotizacionService.crearCotizacion(this.newCotizacion);
    }

    this.closeModal();
  }

  eliminarCotizacion(cotizacion: Cotizacion) {
    if (confirm('¿Eliminar esta cotización?')) {
      this.cotizacionService.eliminarCotizacion(cotizacion._id!);
    }
  }

  formatearFecha(fecha: Date | string): string {
    return new Date(fecha).toLocaleDateString('es-VE');
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
    }).format(value);
  }
}