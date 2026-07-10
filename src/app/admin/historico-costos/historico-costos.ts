import { Component, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComprasHistorialService, ItemCompra, Compra, VariacionPrecio, CPP, ComparativaProveedor, InversionProveedor, Alerta, AcuerdoComercial, ReporteRotacion } from '../../shared/data-access/compras-historial.service';

@Component({
  selector: 'app-historico-costos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historico-costos.html',
  styleUrl: './historico-costos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoricoCostos implements OnInit {
  private service = new ComprasHistorialService();

  activeTab = signal<'registro' | 'variacion' | 'comparativa' | 'alertas' | 'acuerdos' | 'rotacion'>('registro');
  loading = signal(false);

  // Registro de Comras
  compras = signal<Compra[]>([]);
  compraItems = signal<Compra['items']>([]);
  showCompraModal = signal(false);
  editingCompra: Compra | null = null;
  compraForm: { proveedor: string; fecha: string; notas: string; estado: 'pendiente' | 'completada' | 'cancelada' } = { proveedor: '', fecha: '', notas: '', estado: 'pendiente' };
  savingCompra = signal(false);
  filtroProveedor = signal('');
  filtroFecha = signal('');

  // Variación de Precios
  busquedaProducto = signal('');
  variaciones = signal<VariacionPrecio[]>([]);
  cppList = signal<CPP[]>([]);
  buscarLoading = signal(false);

  // Comparativa
  comparativa = signal<ComparativaProveedor[]>([]);
  inversion = signal<InversionProveedor[]>([]);

  // Alertas
  alertas = signal<Alerta[]>([]);
  revisandoId = signal<string | null>(null);

  // Acuerdos Comerciales
  acuerdos = signal<AcuerdoComercial[]>([]);
  showAcuerdoModal = signal(false);
  editingAcuerdo: AcuerdoComercial | null = null;
  acuerdoForm: { proveedorId: string; proveedor: string; tipo: AcuerdoComercial['tipo']; descripcion: string; descuentoPorcentaje: number; montoMinimo: number; montoMaximo: number; fechaInicio: string; fechaFin: string; activo: boolean } = {
    proveedorId: '',
    proveedor: '',
    tipo: 'volumen',
    descripcion: '',
    descuentoPorcentaje: 0,
    montoMinimo: 0,
    montoMaximo: 0,
    fechaInicio: '',
    fechaFin: '',
    activo: true,
  };
  savingAcuerdo = signal(false);

  // Rotación
  rotacion = signal<ReporteRotacion[]>([]);

  readonly comprasFiltradas = computed(() => {
    let data = this.compras();
    const prov = this.filtroProveedor().trim().toLowerCase();
    const fecha = this.filtroFecha().trim();
    if (prov) {
      data = data.filter((c) => c.proveedor.toLowerCase().includes(prov));
    }
    if (fecha) {
      data = data.filter((c) => c.fecha === fecha);
    }
    return data;
  });

  ngOnInit(): void {
    this.loadCompras();
    this.loadComparativa();
    this.loadInversion();
    this.loadAlertas();
    this.loadAcuerdos();
    this.loadRotacion();
  }

  // Tabs
  setTab(tab: 'registro' | 'variacion' | 'comparativa' | 'alertas' | 'acuerdos' | 'rotacion') {
    this.activeTab.set(tab);
  }

  // Compra CRUD
  loadCompras() {
    this.loading.set(true);
    this.service.getCompras({ proveedor: this.filtroProveedor(), fecha: this.filtroFecha() }).subscribe({
      next: (data) => {
        this.compras.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCompraModal(compra?: Compra) {
    if (compra) {
      this.editingCompra = compra;
      this.compraForm = {
        proveedor: compra.proveedor,
        fecha: compra.fecha,
        notas: compra.notas || '',
        estado: compra.estado || 'pendiente',
      };
      this.compraItems.set([...compra.items]);
    } else {
      this.editingCompra = null;
      const hoy = new Date().toISOString().split('T')[0];
      this.compraForm = { proveedor: '', fecha: hoy, notas: '', estado: 'pendiente' };
      this.compraItems.set([]);
    }
    this.showCompraModal.set(true);
  }

  closeCompraModal() {
    this.showCompraModal.set(false);
    this.editingCompra = null;
    this.compraItems.set([]);
  }

  addCompraItem() {
    this.compraItems.update((items) => [
      ...items,
      { productoId: 0, nombreProducto: '', cantidad: 1, precioUnitario: 0, descuento: 0, subtotal: 0 },
    ]);
  }

  removeCompraItem(index: number) {
    this.compraItems.update((items) => items.filter((_, i) => i !== index));
  }

  updateCompraItem(index: number, field: keyof ItemCompra, value: string | number) {
    this.compraItems.update((items) => {
      const updated = [...items];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'cantidad' || field === 'precioUnitario' || field === 'descuento') {
        const item = updated[index];
        item.subtotal = item.cantidad * item.precioUnitario - item.descuento;
      }
      return updated;
    });
  }

  saveCompra() {
    if (!this.compraForm.proveedor.trim()) {
      alert('El proveedor es requerido');
      return;
    }
    const items = this.compraItems();
    if (items.length === 0) {
      alert('Agrega al menos un item');
      return;
    }
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    const payload: Omit<Compra, '_id'> = {
      numero: this.editingCompra?.numero || Date.now(),
      proveedor: this.compraForm.proveedor,
      proveedorId: this.editingCompra?.proveedorId,
      fecha: this.compraForm.fecha,
      items,
      subtotal,
      iva,
      total,
      notas: this.compraForm.notas,
      estado: this.compraForm.estado,
    };
    this.savingCompra.set(true);
    if (this.editingCompra?._id) {
      this.service.updateCompra(this.editingCompra._id, payload).subscribe({
        next: () => {
          this.savingCompra.set(false);
          this.closeCompraModal();
          this.loadCompras();
        },
        error: () => this.savingCompra.set(false),
      });
    } else {
      this.service.createCompra(payload).subscribe({
        next: () => {
          this.savingCompra.set(false);
          this.closeCompraModal();
          this.loadCompras();
        },
        error: () => this.savingCompra.set(false),
      });
    }
  }

  deleteCompra(id: string) {
    if (!confirm('¿Eliminar esta compra?')) return;
    this.service.deleteCompra(id).subscribe({
      next: () => this.loadCompras(),
    });
  }

  // Variación
  buscarVariaciones() {
    const productoId = parseInt(this.busquedaProducto());
    if (isNaN(productoId)) {
      alert('ID de producto inválido');
      return;
    }
    this.buscarLoading.set(true);
    this.service.getVariacionesPrecio(productoId).subscribe({
      next: (data) => {
        this.variaciones.set(data);
        this.buscarLoading.set(false);
      },
      error: () => this.buscarLoading.set(false),
    });
    this.service.getCPP(productoId).subscribe({
      next: (data) => this.cppList.set(data),
    });
  }

  // Comparativa
  loadComparativa() {
    this.service.getComparativaProveedores().subscribe((data) => this.comparativa.set(data));
  }

  loadInversion() {
    this.service.getInversionProveedores().subscribe((data) => this.inversion.set(data));
  }

  // Alertas
  loadAlertas() {
    this.service.getAlertas().subscribe((data) => this.alertas.set(data));
  }

  revisarAlerta(id: string) {
    this.revisandoId.set(id);
    this.service.revisarAlerta(id).subscribe({
      next: () => {
        this.revisandoId.set(null);
        this.loadAlertas();
      },
      error: () => this.revisandoId.set(null),
    });
  }

  // Acuerdos
  loadAcuerdos() {
    this.service.getAcuerdosComerciales().subscribe((data) => this.acuerdos.set(data));
  }

  openAcuerdoModal(acuerdo?: AcuerdoComercial) {
    if (acuerdo) {
      this.editingAcuerdo = acuerdo;
      this.acuerdoForm = {
        proveedorId: acuerdo.proveedorId,
        proveedor: acuerdo.proveedor,
        tipo: acuerdo.tipo,
        descripcion: acuerdo.descripcion,
        descuentoPorcentaje: acuerdo.descuentoPorcentaje,
        montoMinimo: acuerdo.montoMinimo || 0,
        montoMaximo: acuerdo.montoMaximo || 0,
        fechaInicio: acuerdo.fechaInicio,
        fechaFin: acuerdo.fechaFin,
        activo: acuerdo.activo,
      };
    } else {
      this.editingAcuerdo = null;
      this.acuerdoForm = {
        proveedorId: '',
        proveedor: '',
        tipo: 'volumen',
        descripcion: '',
        descuentoPorcentaje: 0,
        montoMinimo: 0,
        montoMaximo: 0,
        fechaInicio: '',
        fechaFin: '',
        activo: true,
      };
    }
    this.showAcuerdoModal.set(true);
  }

  closeAcuerdoModal() {
    this.showAcuerdoModal.set(false);
    this.editingAcuerdo = null;
  }

  saveAcuerdo() {
    if (!this.acuerdoForm.proveedor.trim() || !this.acuerdoForm.descripcion.trim()) {
      alert('Proveedor y descripción son requeridos');
      return;
    }
    this.savingAcuerdo.set(true);
    if (this.editingAcuerdo?._id) {
      this.service.updateAcuerdoComercial(this.editingAcuerdo._id, this.acuerdoForm).subscribe({
        next: () => {
          this.savingAcuerdo.set(false);
          this.closeAcuerdoModal();
          this.loadAcuerdos();
        },
        error: () => this.savingAcuerdo.set(false),
      });
    } else {
      this.service.createAcuerdoComercial(this.acuerdoForm).subscribe({
        next: () => {
          this.savingAcuerdo.set(false);
          this.closeAcuerdoModal();
          this.loadAcuerdos();
        },
        error: () => this.savingAcuerdo.set(false),
      });
    }
  }

  deleteAcuerdo(id: string) {
    if (!confirm('¿Eliminar este acuerdo comercial?')) return;
    this.service.deleteAcuerdoComercial(id).subscribe({
      next: () => this.loadAcuerdos(),
    });
  }

  // Rotación
  loadRotacion() {
    this.service.getReporteRotacion().subscribe((data) => this.rotacion.set(data));
  }

  // Helpers
  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  toNumber(value: string): number {
    return parseFloat(value) || 0;
  }

  formatMoneda(valor: number): string {
    return new Intl.NumberFormat('es-VE').format(valor);
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-VE');
  }

  trackByCompraId(index: number, compra: Compra) {
    return compra._id ?? index;
  }

  trackByAlertaId(index: number, alerta: Alerta) {
    return alerta._id ?? index;
  }

  trackByAcuerdoId(index: number, acuerdo: AcuerdoComercial) {
    return acuerdo._id ?? index;
  }
}
