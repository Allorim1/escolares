import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CotizacionService } from '../../shared/data-access/cotizacion.service';
import { ExportarPdfService } from '../../shared/services/exportar-pdf.service';
import { CurrencyService } from '../../shared/data-access/currency.service';
import { Cotizacion, ItemCotizacion } from '../../shared/interfaces/cotizacion.interface';

@Component({
  selector: 'app-cotizaciones',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './cotizaciones.html',
  styleUrl: './cotizaciones.css',
})
export class Cotizaciones implements OnInit {
  cotizacionService = inject(CotizacionService);
  exportarPdfService = inject(ExportarPdfService);
  currencyService = inject(CurrencyService);

  @ViewChild('cotizacionModal') cotizacionModal!: ElementRef<HTMLElement>;

  ngOnInit() {
    this.cotizacionService.loadCotizaciones();
  }

  showModal = false;
  editingCotizacion: Cotizacion | null = null;

  mostrarSeleccionMonedaPdf = false;
  pdfPendiente: Cotizacion | null = null;

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
      nroZona: '',
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
    this.newItemPrecioUsd =
      tasa > 0 ? Math.round((this.newItem.precioUnitarioBs / tasa) * 100) / 100 : 0;
  }

  onNewItemPrecioUsdChange() {
    const tasa = this.currencyService.currentTasa();
    this.newItem.precioUnitarioBs =
      tasa > 0 ? Math.round(this.newItemPrecioUsd * tasa * 100) / 100 : 0;
  }

  onEditingItemPrecioBsChange() {
    const tasa = this.currencyService.currentTasa();
    this.editingItemPrecioUsd =
      tasa > 0 ? Math.round((this.editingItem.precioUnitarioBs / tasa) * 100) / 100 : 0;
  }

  onEditingItemPrecioUsdChange() {
    const tasa = this.currencyService.currentTasa();
    this.editingItem.precioUnitarioBs =
      tasa > 0 ? Math.round(this.editingItemPrecioUsd * tasa * 100) / 100 : 0;
  }

  formatCurrencyUsd(bs: number): string {
    const tasa = this.currencyService.currentTasa();
    const usd = tasa > 0 ? bs / tasa : 0;
    const formatted = new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(usd);
    return `$ ${formatted}`;
  }

  getTasaActualTexto(): string {
    return `Bs. ${this.currencyService.currentTasa().toFixed(2)} / $`;
  }

  get cotizaciones() {
    return this.cotizacionService.cotizaciones();
  }

  openModal() {
    this.openModalCotizacion();
  }

  openModalCotizacion(cotizacion?: Cotizacion) {
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
          numeroReferencia: cotizacion.referencia?.numeroReferencia || '',
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
    this.pdfPendiente = cotizacion;
    this.mostrarSeleccionMonedaPdf = true;
  }

  generarPdfConMoneda(moneda: 'BS' | 'USD') {
    if (!this.pdfPendiente) return;
    this.exportarPdfService.generarYAbrirPdf(this.pdfPendiente, moneda);
    this.cancelarSeleccionMonedaPdf();
  }

  cancelarSeleccionMonedaPdf() {
    this.mostrarSeleccionMonedaPdf = false;
    this.pdfPendiente = null;
  }

  closeModal() {
    this.showModal = false;
    this.editingCotizacion = null;
    this.resetFormCotizacion();
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
        nroZona: '',
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
    if (
      !this.newItem.codigo ||
      !this.newItem.descripcion ||
      this.newItem.cantidad <= 0 ||
      this.newItem.precioUnitarioBs <= 0
    ) {
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
    if (
      !this.editingItem.codigo ||
      !this.editingItem.descripcion ||
      this.editingItem.cantidad <= 0 ||
      this.editingItem.precioUnitarioBs <= 0
    ) {
      alert('Por favor completa todos los campos del artículo');
      return;
    }

    if (this.editingItemIndex === null) {
      return;
    }

    this.editingItem.montoTotalBs = this.editingItem.cantidad * this.editingItem.precioUnitarioBs;
    this.newCotizacion.items = this.newCotizacion.items.map((item, index) =>
      index === this.editingItemIndex ? { ...this.editingItem } : item,
    );
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
      const discountedBase =
        (item.montoTotalBs * (100 - this.newCotizacion.totales.porcentajeDescuento)) / 100;
      return sum + (discountedBase * itemIvaPorcentaje) / 100;
    }, 0);
    this.newCotizacion.totales.ivaBs = Math.round(iva * 100) / 100;

    const exento = this.newCotizacion.items.reduce((sum, item) => {
      if (item.tieneIva ?? false) return sum;
      return (
        sum + (item.montoTotalBs * (100 - this.newCotizacion.totales.porcentajeDescuento)) / 100
      );
    }, 0);
    this.newCotizacion.totales.exentoBs = Math.round(exento * 100) / 100;

    this.newCotizacion.totales.totalBs = Math.round((subTotal + iva) * 100) / 100;
  }

  focusNextField() {
    const modal = this.cotizacionModal?.nativeElement;

    if (!modal) {
      return;
    }

    const focusableElements = Array.from(
      modal.querySelectorAll<HTMLElement>(
        'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])',
      ),
    ).filter((element) => element.offsetParent !== null);

    if (focusableElements.length === 0) {
      return;
    }

    const activeElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const activeIndex = activeElement ? focusableElements.indexOf(activeElement) : -1;
    const nextIndex = activeIndex === -1 ? 0 : (activeIndex + 1) % focusableElements.length;

    focusableElements[nextIndex].focus();
  }

  formatearFecha(fecha: Date | string): string {
    return new Date(fecha).toLocaleDateString('es-VE');
  }

  formatCurrency(value: number): string {
    const formatted = new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return `Bs. ${formatted}`;
  }
}
