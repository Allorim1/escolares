import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-galeria',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './galeria.html',
  styleUrl: './galeria.css',
})
export class Galeria {
  subcategorias = [
    { label: 'Documentos Temporales', route: 'documentos-temporales', icon: '📄', descripcion: 'Documentos con vigencia temporal' },
    { label: 'Documentos Legales', route: 'documentos-legales', icon: '⚖️', descripcion: 'Documentos legales y permanentes' },
  ];
}
