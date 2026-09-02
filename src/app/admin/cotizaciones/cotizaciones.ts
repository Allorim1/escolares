import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CotizacionService } from '../../shared/data-access/cotizacion.service';
import { NotaEntregaService } from '../../shared/data-access/nota-entrega.service';
import { ExportarPdfService } from '../../shared/services/exportar-pdf.service';
import { ExportarPdfNotaEntregaService } from '../../shared/services/exportar-pdf-nota-entrega.service';
import { CurrencyService } from '../../shared/data-access/currency.service';
import { Cotizacion, ItemCotizacion } from '../../shared/interfaces/cotizacion.interface';
import { NotaEntrega } from '../../shared/interfaces/nota-entrega.interface';

@Component({
  selector: 'app-cotizaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cotizaciones.html',
  styleUrl: './cotizaciones.css',
})
export class Cotizaciones implements OnInit {
  cotizacionService = inject(CotizacionService);
  notaEntregaService = inject(NotaEntregaService);
  exportarPdfService = inject(ExportarPdfService);
  exportarPdfNotaEntregaService = inject(ExportarPdfNotaEntregaService);
  currencyService = inject(CurrencyService);

  @ViewChild('cotizacionModal') cotizacionModal!: ElementRef<HTMLElement>;
  @ViewChild('notaEntregaModal') notaEntregaModal!: ElementRef<HTMLElement>;

  ngOnInit() {
    this.cotizacionService.loadCotizaciones();
    this.notaEntregaService.loadNotasEntrega();
  }

  currentTab: 'cotizaciones' | 'notas-entrega' = 'cotizaciones';

  switchTab(tab: 'cotizaciones' | 'notas-entrega') {
    this.currentTab = tab;
  }

  showModal = false;
  modalMode: 'cotizacion' | 'nota-entrega' = 'cotizacion';
  editingCotizacion: Cotizacion | null = null;
  editingNotaEntrega: NotaEntrega | null = null;

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
    tieneIva: true,
    ivaPorcentaje: 16,
  };

  editingItemIndex: number | null = null;
  editingItem: ItemCotizacion = {
    codigo: '',
    cantidad: 1,
    descripcion: '',
    precioUnitarioBs: 0,
    montoTotalBs: 0,
    tieneIva: true,
    ivaPorcentaje: 16,
  };

  // Campos visuales (no se guardan) para mostrar/editar el precio unitario en dólares
  newItemPrecioUsd = 0;
  editingItemPrecioUsd = 0;

  onNewItemPrecioBsChange() {
    const tasa = this.currencyService.currentTasa();
    this.newItemPrecioUsd = tasa > 0 ? Math.round((this.newItem.precioUnitarioBs / tasa) * 100) / 100 : 0;
  }

  onNewItemPrecioUsdChange() {
    const tasa = this.currencyService.currentTasa();
    this.newItem.precioUnitarioBs = tasa > 0 ? Math.round(this.newItemPrecioUsd * tasa * 100) / 100 : 0;
  }

  onEditingItemPrecioBsChange() {
    const tasa = this.currencyService.currentTasa();
    this.editingItemPrecioUsd = tasa > 0 ? Math.round((this.editingItem.precioUnitarioBs / tasa) * 100) / 100 : 0;
  }

  onEditingItemPrecioUsdChange() {
    const tasa = this.currencyService.currentTasa();
    this.editingItem.precioUnitarioBs = tasa > 0 ? Math.round(this.editingItemPrecioUsd * tasa * 100) / 100 : 0;
  }

  formatCurrencyUsd(bs: number): string {
    const tasa = this.currencyService.currentTasa();
    const usd = tasa > 0 ? bs / tasa : 0;
    return this.currencyService.formatUsd(usd);
  }

  getTasaActualTexto(): string {
    return `Bs. ${this.currencyService.currentTasa().toFixed(2)} / $`;
  }

  get cotizaciones() {
    return this.cotizacionService.cotizaciones();
  }

  openModal() {
    if (this.currentTab === 'cotizaciones') {
      this.openModalCotizacion();
    } else {
      this.openModalNotaEntrega();
    }
  }

  openModalCotizacion(cotizacion?: Cotizacion) {
    this.modalMode = 'cotizacion';
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
      this.calculateTotals();
    } else {
      this.editingCotizacion = null;
      this.resetFormCotizacion();
    }
    this.showModal = true;
  }

  generatePdfFromRow(cotizacion: Cotizacion) {
    this.exportarPdfService.generarYAbrirPdf(cotizacion);
  }

  closeModal() {
    this.showModal = false;
    this.editingCotizacion = null;
    this.editingNotaEntrega = null;
    this.resetFormCotizacion();
    this.resetFormNotaEntrega();
  }

  resetFormCotizacion() {
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
      tieneIva: true,
      ivaPorcentaje: 16,
    };
    this.newItemPrecioUsd = 0;
    this.editingItemIndex = null;
    this.editingItem = {
      codigo: '',
      cantidad: 1,
      descripcion: '',
      precioUnitarioBs: 0,
      montoTotalBs: 0,
      tieneIva: true,
      ivaPorcentaje: 16,
    };
    this.editingItemPrecioUsd = 0;
  }

  resetFormNotaEntrega() {
    this.newNotaEntrega = {
      numeroNota: '',
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
      tieneIva: true,
      ivaPorcentaje: 16,
    };
    this.newItemPrecioUsd = 0;
    this.editingItemIndex = null;
    this.editingItem = {
      codigo: '',
      cantidad: 1,
      descripcion: '',
      precioUnitarioBs: 0,
      montoTotalBs: 0,
      tieneIva: true,
      ivaPorcentaje: 16,
    };
    this.editingItemPrecioUsd = 0;
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

    this.calculateTotals();

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
      tieneIva: true,
      ivaPorcentaje: 16,
    };
    this.newItemPrecioUsd = 0;
  }

  startEditItem(index: number) {
    const item = this.newCotizacion.items[index];

    if (!item) {
      return;
    }

    this.editingItemIndex = index;
    this.editingItem = { ...item };
    this.onEditingItemPrecioBsChange();

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
      tieneIva: true,
      ivaPorcentaje: 16,
    };
    this.editingItemPrecioUsd = 0;
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
    this.newCotizacion.totales.netoBs = Math.round(neto * 100) / 100;

    const descuento = (neto * this.newCotizacion.totales.porcentajeDescuento) / 100;
    this.newCotizacion.totales.descuentoBs = Math.round(descuento * 100) / 100;

    const subTotal = neto - descuento;
    this.newCotizacion.totales.subTotalBs = Math.round(subTotal * 100) / 100;

    const iva = this.newCotizacion.items.reduce((sum, item) => {
      const tieneIva = item.tieneIva ?? false;
      const itemIvaPorcentaje = item.ivaPorcentaje ?? 16;
      if (!tieneIva) return sum;
      const discountedBase = (item.montoTotalBs * (100 - this.newCotizacion.totales.porcentajeDescuento)) / 100;
      return sum + (discountedBase * itemIvaPorcentaje) / 100;
    }, 0);
    this.newCotizacion.totales.ivaBs = Math.round(iva * 100) / 100;

    this.newCotizacion.totales.totalBs = Math.round((subTotal + iva) * 100) / 100;
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

  formatearFecha(fecha: Date | string): string {
    return new Date(fecha).toLocaleDateString('es-VE');
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  // --- Nota de Entrega ---
  newNotaEntrega: NotaEntrega = {
    numeroNota: '',
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

  get notasEntrega() {
    return this.notaEntregaService.notasEntrega();
  }

  openModalNotaEntrega(nota?: NotaEntrega) {
    this.modalMode = 'nota-entrega';
    if (nota) {
      this.editingNotaEntrega = { ...nota };
      this.newNotaEntrega = {
        numeroNota: nota.numeroNota || '',
        fecha: nota.fecha || new Date().toISOString().split('T')[0],
        cliente: {
          nombre: nota.cliente?.nombre || '',
          rif: nota.cliente?.rif || '',
          direccion: nota.cliente?.direccion || '',
          telefono: nota.cliente?.telefono || '',
        },
        items: nota.items || [],
        referencia: {
          nroZona: nota.referencia?.nroZona || '',
          validezDias: nota.referencia?.validezDias || 5,
          vendedor: nota.referencia?.vendedor || '',
          numeroReferencia: nota.referencia?.numeroReferencia || ''
        },
        totales: {
          netoBs: nota.totales?.netoBs || 0,
          porcentajeDescuento: nota.totales?.porcentajeDescuento || 0,
          descuentoBs: nota.totales?.descuentoBs || 0,
          subTotalBs: nota.totales?.subTotalBs || 0,
          ivaPorcentaje: nota.totales?.ivaPorcentaje || 16,
          ivaBs: nota.totales?.ivaBs || 0,
          exentoBs: nota.totales?.exentoBs || 0,
          totalBs: nota.totales?.totalBs || 0,
        },
      };
      this.calculateTotalsNotaEntrega();
    } else {
      this.editingNotaEntrega = null;
      this.resetFormNotaEntrega();
    }
    this.showModal = true;
  }

  generatePdfNotaEntrega(nota: NotaEntrega) {
    this.exportarPdfNotaEntregaService.generarYAbrirPdf(nota);
  }

  addItemNotaEntrega() {
    if (!this.newItem.codigo || !this.newItem.descripcion || this.newItem.cantidad <= 0 || this.newItem.precioUnitarioBs <= 0) {
      alert('Por favor completa todos los campos del artículo');
      return;
    }

    this.newItem.montoTotalBs = this.newItem.cantidad * this.newItem.precioUnitarioBs;
    this.newNotaEntrega.items = [...this.newNotaEntrega.items, { ...this.newItem }];

    this.calculateTotalsNotaEntrega();

    this.newItem = {
      codigo: '',
      cantidad: 1,
      descripcion: '',
      precioUnitarioBs: 0,
      montoTotalBs: 0,
      tieneIva: true,
      ivaPorcentaje: 16,
    };
    this.newItemPrecioUsd = 0;
  }

  startEditItemNotaEntrega(index: number) {
    const item = this.newNotaEntrega.items[index];

    if (!item) {
      return;
    }

    this.editingItemIndex = index;
    this.editingItem = { ...item };
    this.onEditingItemPrecioBsChange();

    setTimeout(() => this.focusNextFieldNotaEntrega());
  }

  saveEditedItemNotaEntrega() {
    if (!this.editingItem.codigo || !this.editingItem.descripcion || this.editingItem.cantidad <= 0 || this.editingItem.precioUnitarioBs <= 0) {
      alert('Por favor completa todos los campos del artículo');
      return;
    }

    if (this.editingItemIndex === null) {
      return;
    }

    this.editingItem.montoTotalBs = this.editingItem.cantidad * this.editingItem.precioUnitarioBs;
    this.newNotaEntrega.items = this.newNotaEntrega.items.map((item, index) => index === this.editingItemIndex ? { ...this.editingItem } : item);
    this.calculateTotalsNotaEntrega();
    this.cancelEditItem();
  }

  removeItemNotaEntrega(index: number) {
    if (this.editingItemIndex === index) {
      this.cancelEditItem();
    } else if (this.editingItemIndex !== null && index < this.editingItemIndex) {
      this.editingItemIndex--;
    }

    this.newNotaEntrega.items = this.newNotaEntrega.items.filter((_, i) => i !== index);
    this.calculateTotalsNotaEntrega();
  }

  calculateTotalsNotaEntrega() {
    const neto = this.newNotaEntrega.items.reduce((sum, item) => sum + item.montoTotalBs, 0);
    this.newNotaEntrega.totales.netoBs = Math.round(neto * 100) / 100;

    const descuento = (neto * this.newNotaEntrega.totales.porcentajeDescuento) / 100;
    this.newNotaEntrega.totales.descuentoBs = Math.round(descuento * 100) / 100;

    const subTotal = neto - descuento;
    this.newNotaEntrega.totales.subTotalBs = Math.round(subTotal * 100) / 100;

    const iva = this.newNotaEntrega.items.reduce((sum, item) => {
      const tieneIva = item.tieneIva ?? false;
      const itemIvaPorcentaje = item.ivaPorcentaje ?? 16;
      if (!tieneIva) return sum;
      const discountedBase = (item.montoTotalBs * (100 - this.newNotaEntrega.totales.porcentajeDescuento)) / 100;
      return sum + (discountedBase * itemIvaPorcentaje) / 100;
    }, 0);
    this.newNotaEntrega.totales.ivaBs = Math.round(iva * 100) / 100;

    this.newNotaEntrega.totales.totalBs = Math.round((subTotal + iva) * 100) / 100;
  }

  focusNextFieldNotaEntrega() {
    const modal = this.notaEntregaModal?.nativeElement;

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

  saveNotaEntrega() {
    if (!this.newNotaEntrega.numeroNota || !this.newNotaEntrega.cliente.nombre) {
      alert('Por favor completa los campos obligatorios');
      return;
    }

    if (this.newNotaEntrega.items.length === 0) {
      alert('Agrega al menos un artículo a la nota de entrega');
      return;
    }

    this.calculateTotalsNotaEntrega();

    if (this.editingNotaEntrega?._id) {
      this.notaEntregaService.actualizarNotaEntrega(this.editingNotaEntrega._id, this.newNotaEntrega);
    } else {
      this.notaEntregaService.crearNotaEntrega(this.newNotaEntrega);
    }

    this.closeModal();
    
    setTimeout(() => {
      alert(this.editingNotaEntrega?._id ? 'Nota de entrega actualizada exitosamente' : 'Nota de entrega creada exitosamente');
    }, 100);
  }

  eliminarNotaEntrega(nota: NotaEntrega) {
    if (confirm('¿Eliminar esta nota de entrega?')) {
      this.notaEntregaService.eliminarNotaEntrega(nota._id!);
    }
  }
}