import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CotizacionService } from '../../shared/data-access/cotizacion.service';
import { ExportarPdfService } from '../../shared/services/exportar-pdf.service';
import { Cotizacion, ItemCotizacion } from '../../shared/interfaces/cotizacion.interface';

@Component({
  selector: 'app-cotizaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cotizaciones.html',
  styleUrl: './cotizaciones.css',
})
export class Cotizaciones implements OnInit {
  cotizacionService = inject(CotizacionService);
  exportarPdfService = inject(ExportarPdfService);

  @ViewChild('cotizacionModal') cotizacionModal!: ElementRef<HTMLElement>;

  ngOnInit() {
    this.cotizacionService.loadCotizaciones();
  }

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
      nroZona: ''
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

  editingItemIndex: number | null = null;
  editingItem: ItemCotizacion = {
    codigo: '',
    cantidad: 1,
    descripcion: '',
    precioUnitarioBs: 0,
    montoTotalBs: 0,
  };

  get cotizaciones() {
    return this.cotizacionService.cotizaciones();
  }

  openModal(cotizacion?: Cotizacion) {
    if (cotizacion) {
      this.editingCotizacion = { ...cotizacion };
      this.newCotizacion = {
        numeroCotizacion: cotizacion.numeroCotizacion || '',
        fecha: cotizacion.fecha || new Date().toISOString().split('T')[0],
        cliente: {
          nombre: cotizacion.cliente?.nombre || '',
          rif: cotizacion.cliente?.rif || '',
          direccion: cotizacion.cliente?.direccion || '',
          telefono: cotizacion.cliente?.telefono || '',
        },
        items: cotizacion.items || [],
        referencia: {
          nroZona: cotizacion.referencia?.nroZona || '',
          validezDias: cotizacion.referencia?.validezDias || 5,
          vendedor: cotizacion.referencia?.vendedor || '',
          numeroReferencia: cotizacion.referencia?.numeroReferencia || ''
        },
        totales: {
          netoBs: cotizacion.totales?.netoBs || 0,
          porcentajeDescuento: cotizacion.totales?.porcentajeDescuento || 0,
          descuentoBs: cotizacion.totales?.descuentoBs || 0,
          subTotalBs: cotizacion.totales?.subTotalBs || 0,
          ivaPorcentaje: cotizacion.totales?.ivaPorcentaje || 16,
          ivaBs: cotizacion.totales?.ivaBs || 0,
          exentoBs: cotizacion.totales?.exentoBs || 0,
          totalBs: cotizacion.totales?.totalBs || 0,
        },
      };
    } else {
      this.editingCotizacion = null;
      this.resetForm();
    }
    this.showModal = true;
  }

  generatePdfFromRow(cotizacion: Cotizacion) {
    this.exportarPdfService.generarYAbrirPdf(cotizacion);
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
        nroZona: ''
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
    this.editingItemIndex = null;
    this.editingItem = {
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

  startEditItem(index: number) {
    const item = this.newCotizacion.items[index];

    if (!item) {
      return;
    }

    this.editingItemIndex = index;
    this.editingItem = { ...item };

    setTimeout(() => this.focusNextField());
  }

  saveEditedItem() {
    if (!this.editingItem.codigo || !this.editingItem.descripcion || this.editingItem.cantidad <= 0 || this.editingItem.precioUnitarioBs <= 0) {
      alert('Por favor completa todos los campos del artículo');
      return;
    }

    if (this.editingItemIndex === null) {
      return;
    }

    this.editingItem.montoTotalBs = this.editingItem.cantidad * this.editingItem.precioUnitarioBs;
    this.newCotizacion.items = this.newCotizacion.items.map((item, index) => index === this.editingItemIndex ? { ...this.editingItem } : item);
    this.calculateTotals();
    this.cancelEditItem();
  }

  cancelEditItem() {
    this.editingItemIndex = null;
    this.editingItem = {
      codigo: '',
      cantidad: 1,
      descripcion: '',
      precioUnitarioBs: 0,
      montoTotalBs: 0,
    };
  }

  removeItem(index: number) {
    if (this.editingItemIndex === index) {
      this.cancelEditItem();
    } else if (this.editingItemIndex !== null && index < this.editingItemIndex) {
      this.editingItemIndex--;
    }

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

  focusNextField() {
    const modal = this.cotizacionModal?.nativeElement;

    if (!modal) {
      return;
    }

    const focusableElements = Array.from(
      modal.querySelectorAll<HTMLElement>('input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])')
    ).filter((element) => element.offsetParent !== null);

    if (focusableElements.length === 0) {
      return;
    }

    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const activeIndex = activeElement ? focusableElements.indexOf(activeElement) : -1;
    const nextIndex = activeIndex === -1 ? 0 : (activeIndex + 1) % focusableElements.length;

    focusableElements[nextIndex].focus();
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