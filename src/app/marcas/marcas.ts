import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarcasService } from '../shared/data-access/marcas.service';

@Component({
  selector: 'app-marcas',
  imports: [RouterLink],
  templateUrl: './marcas.html',
  styleUrl: './marcas.css',
})
export class Marcas {
  marcasService = inject(MarcasService);
  marcas = this.marcasService.marcas;
}
