import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { jsPDF } from 'jspdf';
import { RegistroService, Registro } from '../../shared/data-access/registro.service';

@Component({
  selector: 'app-admin-registro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class AdminRegistro implements OnInit {
  registroService = inject(RegistroService);

  filtroModulo = '';
  filtroBusqueda = '';
  mostrarModal = false;
  registroSeleccionado: Registro | null = null;

  fechaDesde: string = '';
  fechaHasta: string = '';

  paginaActual = 1;
  registrosPorPagina = 20;

  ngOnInit() {
    this.registroService.loadRegistros();
  }

  get registrosFiltrados() {
    let registros = this.registroService.registros();
    
    if (this.filtroModulo) {
      registros = registros.filter(
        (r) => r.modulo.toLowerCase().includes(this.filtroModulo.toLowerCase())
      );
    }
    
    if (this.filtroBusqueda) {
      const busqueda = this.filtroBusqueda.toLowerCase();
      registros = registros.filter((r) => {
        if (r.descripcion.toLowerCase().includes(busqueda)) return true;
        if (r.usuario.toLowerCase().includes(busqueda)) return true;
        if (r.modulo.toLowerCase().includes(busqueda)) return true;
        if (r.accion.toLowerCase().includes(busqueda)) return true;
        if (r.datos && JSON.stringify(r.datos).toLowerCase().includes(busqueda)) return true;
        return false;
      });
    }

    if (this.fechaDesde) {
      const desde = new Date(this.fechaDesde);
      desde.setHours(0, 0, 0, 0);
      registros = registros.filter(r => new Date(r.fecha) >= desde);
    }

    if (this.fechaHasta) {
      const hasta = new Date(this.fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      registros = registros.filter(r => new Date(r.fecha) <= hasta);
    }
    
    return registros;
  }

  get registrosPaginados() {
    const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
    const fin = inicio + this.registrosPorPagina;
    return this.registrosFiltrados.slice(inicio, fin);
  }

  get totalPaginasRegistros() {
    return Math.ceil(this.registrosFiltrados.length / this.registrosPorPagina);
  }

  cambiarPagina(pagina: number) {
    if (pagina >= 1 && pagina <= this.totalPaginasRegistros) {
      this.paginaActual = pagina;
    }
  }

  get modulos() {
    const regs = this.registroService.registros();
    if (!regs || regs.length === 0) return [];
    const modulos = new Set(regs.map((r) => r.modulo));
    return Array.from(modulos);
  }

  verDetalle(registro: Registro) {
    this.registroSeleccionado = registro;
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.registroSeleccionado = null;
  }

  limpiarRegistros() {
    if (confirm('¿Estás seguro de que deseas eliminar todos los registros?')) {
      this.registroService.limpiarRegistros();
    }
  }

  filtrarPorModulo(modulo: string) {
    this.filtroModulo = modulo;
  }

  limpiarFiltro() {
    this.filtroModulo = '';
  }

  formatearFecha(fecha: Date | string): string {
    const date = new Date(fecha);
    return date.toLocaleString('es-VE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  generarPdfModulo(event: Event) {
    const target = event.target as HTMLSelectElement;
    const modulo = target.value;
    if (!modulo) return;

    let registros = this.registroService.registros().filter(r => r.modulo === modulo);

    if (this.fechaDesde) {
      const desde = new Date(this.fechaDesde);
      desde.setHours(0, 0, 0, 0);
      registros = registros.filter(r => new Date(r.fecha) >= desde);
    }

    if (this.fechaHasta) {
      const hasta = new Date(this.fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      registros = registros.filter(r => new Date(r.fecha) <= hasta);
    }
    if (registros.length === 0) {
      alert('No hay registros para este módulo');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(18);
    doc.setTextColor(29, 99, 193);
    doc.text(`Registro de Actividad - ${modulo}`, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Total registros: ${registros.length}`, pageWidth / 2, 34, { align: 'center' });

    let y = 45;
    const lineHeight = 7;
    const maxLinesPerPage = 26;

    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.setFillColor(230, 240, 250);
    doc.rect(14, y - 4, pageWidth - 28, 8, 'F');
    doc.setFont(undefined as any, 'bold');
    doc.text('Fecha', 16, y);
    doc.text('Acción', 50, y);
    doc.text('Descripción', 80, y);
    doc.text('Usuario', 175, y);
    
    y += lineHeight;
    doc.setFont(undefined as any, 'normal');

    registros.forEach((registro, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
        doc.setFillColor(230, 240, 250);
        doc.rect(14, y - 4, pageWidth - 28, 8, 'F');
        doc.setFont(undefined as any, 'bold');
        doc.text('Fecha', 16, y);
        doc.text('Acción', 50, y);
        doc.text('Descripción', 80, y);
        doc.text('Usuario', 175, y);
        y += lineHeight;
        doc.setFont(undefined as any, 'normal');
      }

      const fecha = this.formatearFecha(registro.fecha).substring(0, 16);
      const descripcion = registro.descripcion.substring(0, 50);
      
      doc.text(fecha, 16, y);
      doc.text(registro.accion.substring(0, 12), 50, y);
      doc.text(descripcion, 80, y);
      doc.text(registro.usuario.substring(0, 20), 175, y);
      
      y += lineHeight;
    });

    doc.save(`registros_${modulo}_${new Date().toISOString().split('T')[0]}.pdf`);
    target.value = '';
  }
}
