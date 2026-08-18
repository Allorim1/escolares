import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExportarPdfService } from '../../shared/services/exportar-pdf.service';
import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';
import { EnterFocusNextDirective } from '../../shared/ui/enter-focus-next.directive';

type TipoConstancia = 'trabajo' | 'comercial' | 'personal' | 'recibo-pago';

interface ConstanciaTrabajo {
  nombreCompleto: string;
  cedula: string;
  cargo: string;
  fechaIngreso: string;
  fechaEmision: string;
  sueldoMensual: string;
  monedaSueldo: 'Bs.' | 'USD';
  esEgresado: boolean;
  fechaEgreso: string;
}

interface ConstanciaComercial {
  destino: string;
  titular: string;
  cedula: string;
  desdeFecha: string;
  diasCredito: string;
  cifras: string;
  tipoCifras: string;
  fecha: string;
}

interface ConstanciaPersonal {
  de: string;
  cedulaDe: string;
  direccion: string;
  aQuien: string;
  cedulaAQuien: string;
  desde: string;
  telefono: string;
  fechaEmision: string;
}

interface ReciboPago {
  nombrePagador: string;
  cedula: string;
  concepto: string;
  monto: string;
  fechaPago: string;
  tipo: 'Personal' | 'Juridica';
  pagado: string;
  nota: string;
}

@Component({
  selector: 'app-constancias',
  standalone: true,
  imports: [CommonModule, FormsModule, EnterFocusNextDirective],
  templateUrl: './constancias.html',
  styleUrl: './constancias.css',
})
export class Constancias implements OnInit {
  private exportarPdfService = inject(ExportarPdfService);
  private notificationService = inject(NotificationModalService);

  tipoSeleccionado = signal<TipoConstancia>('trabajo');
  generandoPdf = signal(false);

  trabajo = signal<ConstanciaTrabajo>({
    nombreCompleto: '',
    cedula: '',
    cargo: '',
    fechaIngreso: '',
    fechaEmision: new Date().toISOString().split('T')[0],
    sueldoMensual: '',
    monedaSueldo: 'Bs.',
    esEgresado: false,
    fechaEgreso: '',
  });

  comercial = signal<ConstanciaComercial>({
    destino: '',
    titular: '',
    cedula: '',
    desdeFecha: '',
    diasCredito: '',
    cifras: '',
    tipoCifras: '',
    fecha: new Date().toISOString().split('T')[0],
  });

  personal = signal<ConstanciaPersonal>({
    de: '',
    cedulaDe: '',
    direccion: '',
    aQuien: '',
    cedulaAQuien: '',
    desde: '',
    telefono: '',
    fechaEmision: new Date().toISOString().split('T')[0],
  });

  reciboPago = signal<ReciboPago>({
    nombrePagador: '',
    cedula: '',
    concepto: '',
    monto: '',
    fechaPago: new Date().toISOString().split('T')[0],
    tipo: 'Personal',
    pagado: '',
    nota: '',
  });

  tiposConstancia: { value: TipoConstancia; label: string; icon: string }[] = [
    { value: 'trabajo', label: 'Constancia de Trabajo', icon: '💼' },
    { value: 'comercial', label: 'Constancia Comercial', icon: '🏢' },
    { value: 'personal', label: 'Constancia Personal', icon: '👤' },
    { value: 'recibo-pago', label: 'Recibo de Pago', icon: '🧾' },
  ];

  ngOnInit() {}

  seleccionarTipo(tipo: TipoConstancia) {
    this.tipoSeleccionado.set(tipo);
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    const parts = fecha.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return fecha;
  }

  async generarPdf() {
    const tipo = this.tipoSeleccionado();

    if (tipo === 'trabajo') {
      const datos = this.trabajo();
      if (!datos.nombreCompleto || !datos.cedula || !datos.cargo || !datos.fechaIngreso) {
        this.notificationService.error('Por favor complete todos los campos requeridos');
        return;
      }
      if (datos.esEgresado && !datos.fechaEgreso) {
        this.notificationService.error('Por favor indique la fecha de egreso');
        return;
      }
      this.generandoPdf.set(true);
      try {
        const docDefinition = await this.exportarPdfService.generarConstanciaTrabajoPdf({
          ...datos,
          cedula: datos.cedula,
          fechaIngreso: datos.fechaIngreso,
          fechaEmision: datos.fechaEmision,
          sueldoMensual: datos.sueldoMensual,
          monedaSueldo: datos.monedaSueldo,
          esEgresado: datos.esEgresado,
          fechaEgreso: datos.fechaEgreso,
        });
        this.exportarPdfService.descargarPdf(docDefinition, `constancia_trabajo_${datos.cedula.replace(/\D/g, '')}.pdf`);
        this.notificationService.success('Constancia de trabajo generada correctamente', 'Éxito');
      } catch (error) {
        console.error('Error generando PDF:', error);
        this.notificationService.error('Error al generar el PDF');
      } finally {
        this.generandoPdf.set(false);
      }
    } else if (tipo === 'comercial') {
      const datos = this.comercial();
      if (!datos.destino || !datos.titular || !datos.cedula || !datos.desdeFecha || !datos.diasCredito || !datos.cifras || !datos.tipoCifras || !datos.fecha) {
        this.notificationService.error('Por favor complete todos los campos requeridos');
        return;
      }
      this.generandoPdf.set(true);
      try {
        const docDefinition = await this.exportarPdfService.generarConstanciaComercialPdf({
          destino: datos.destino,
          titular: datos.titular,
          cedula: datos.cedula,
          desdeFecha: datos.desdeFecha,
          diasCredito: datos.diasCredito,
          cifras: datos.cifras,
          tipoCifras: datos.tipoCifras,
          fecha: datos.fecha,
        });
        this.exportarPdfService.descargarPdf(docDefinition, `constancia_comercial_${datos.titular.replace(/\s+/g, '_')}.pdf`);
        this.notificationService.success('Constancia comercial generada correctamente', 'Éxito');
      } catch (error) {
        console.error('Error generando PDF:', error);
        this.notificationService.error('Error al generar el PDF');
      } finally {
        this.generandoPdf.set(false);
      }
    } else if (tipo === 'personal') {
      const datos = this.personal();
      if (!datos.de || !datos.cedulaDe || !datos.direccion || !datos.aQuien || !datos.cedulaAQuien || !datos.desde) {
        this.notificationService.error('Por favor complete todos los campos requeridos');
        return;
      }
      this.generandoPdf.set(true);
      try {
        const docDefinition = this.exportarPdfService.generarConstanciaPersonalPdf(datos);
        this.exportarPdfService.descargarPdfPersonalBlob(datos, `constancia_personal_${datos.cedulaDe.replace(/\D/g, '')}.pdf`);
        this.notificationService.success('Constancia personal generada correctamente', 'Éxito');
      } catch (error) {
        console.error('Error generando PDF:', error);
        this.notificationService.error('Error al generar el PDF');
      } finally {
        this.generandoPdf.set(false);
      }
    } else if (tipo === 'recibo-pago') {
      const datos = this.reciboPago();
      if (!datos.concepto || !datos.monto || !datos.pagado || !datos.cedula) {
        this.notificationService.error('Por favor complete todos los campos requeridos');
        return;
      }
      if (datos.tipo === 'Personal' && !datos.nombrePagador) {
        this.notificationService.error('Por favor complete los datos del pagador');
        return;
      }
      this.generandoPdf.set(true);
      try {
        const docDefinition = await this.exportarPdfService.generarReciboPagoPdf({
          nombrePagador: datos.nombrePagador,
          cedula: datos.cedula,
          concepto: datos.concepto,
          monto: parseFloat(datos.monto) || 0,
          fechaPago: datos.fechaPago,
          tipo: datos.tipo,
          pagado: datos.pagado,
          nota: datos.nota,
        });
        this.exportarPdfService.descargarPdf(docDefinition, `recibo_pago_${datos.pagado.replace(/\s+/g, '_')}.pdf`);
        this.notificationService.success('Recibo de pago generado correctamente', 'Éxito');
      } catch (error) {
        console.error('Error generando PDF:', error);
        this.notificationService.error('Error al generar el PDF');
      } finally {
        this.generandoPdf.set(false);
      }
    }
  }

  limpiarFormulario() {
    if (this.tipoSeleccionado() === 'trabajo') {
      this.trabajo.set({
        nombreCompleto: '',
        cedula: '',
        cargo: '',
        fechaIngreso: '',
        fechaEmision: new Date().toISOString().split('T')[0],
        sueldoMensual: '',
        monedaSueldo: 'Bs.',
        esEgresado: false,
        fechaEgreso: '',
      });
    } else if (this.tipoSeleccionado() === 'comercial') {
      this.comercial.set({
        destino: '',
        titular: '',
        cedula: '',
        desdeFecha: '',
        diasCredito: '',
        cifras: '',
        tipoCifras: '',
        fecha: new Date().toISOString().split('T')[0],
      });
    } else if (this.tipoSeleccionado() === 'personal') {
      this.personal.set({
        de: '',
        cedulaDe: '',
        direccion: '',
        aQuien: '',
        cedulaAQuien: '',
        desde: '',
        telefono: '',
        fechaEmision: new Date().toISOString().split('T')[0],
      });
    } else if (this.tipoSeleccionado() === 'recibo-pago') {
      this.reciboPago.set({
        nombrePagador: '',
        cedula: '',
        concepto: '',
        monto: '',
        fechaPago: new Date().toISOString().split('T')[0],
        tipo: 'Personal',
        pagado: '',
        nota: '',
      });
    }
  }
}
