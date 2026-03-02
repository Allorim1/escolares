import { Component } from '@angular/core';

interface Linea {
  image: string;
  name: string;
}

@Component({
  selector: 'app-lineas',
  imports: [],
  templateUrl: './lineas.html',
  styleUrl: './lineas.css',
})
export class Lineas {
  lineas: Linea[] = [
    { image: '/lineas/BOLSOS-Y-CARTUCHERA.png', name: 'Bolsos y Cartuchera' },
    { image: '/lineas/manchas-LINEA-DE-PAPELERIA.png', name: 'Línea de Papelería' },
    { image: '/lineas/manchas-LIBEA-DE-GEOMETRIA.png', name: 'Línea de Geometría' },
    { image: '/lineas/MANCHAS-PARA-LINEA-DE-MANUALIDADES.png', name: 'Línea de Manualidades' },
    { image: '/lineas/MANCHA-PARA-LINEA-ESCOLAR.png', name: 'Línea Escolar' },
    { image: '/lineas/MANCHA-DE-HIGIENE-PERSONAL.png', name: 'Higiene Personal' },
    { image: '/lineas/MANCHA-LINEA-DE-PFICINA.png', name: 'Línea de Oficina' },
    { image: '/lineas/MANCHA-LINEA-DE-ESCRITURA-V1.png', name: 'Línea de Escritura' },
  ];
}
