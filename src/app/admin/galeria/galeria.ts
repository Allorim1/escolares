import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-galeria',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './galeria.html',
  styleUrl: './galeria.css',
})
export class Galeria {
  showModal = false;
  tipoActual = '';

  abrirGaleria(tipo: string) {
    this.tipoActual = tipo;
    this.showModal = true;
  }

  cerrarModal() {
    this.showModal = false;
  }
}
