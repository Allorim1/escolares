import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
    
    return registros;
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
}
