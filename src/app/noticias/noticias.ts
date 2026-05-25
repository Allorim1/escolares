import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoticiasService } from '../shared/data-access/noticias.service';
import { Noticia } from '../shared/data-access/noticias.service';
import { MarkdownPipe } from '../shared/pipes/markdown.pipe';

@Component({
  selector: 'app-noticias',
  standalone: true,
  imports: [CommonModule, MarkdownPipe],
  templateUrl: './noticias.html',
  styleUrl: './noticias.css',
})
export class NoticiasComponent {
  noticias: Noticia[] = [];
  loading = true;
  error: string | null = null;

  constructor(private noticiasService: NoticiasService) {}

  ngOnInit() {
    this.loadNoticias();
  }

  loadNoticias() {
    this.loading = true;
    this.error = null;
    this.noticiasService.getNoticias().subscribe({
      next: (data) => {
        this.noticias = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading noticias:', err);
        this.error = 'Error al cargar las noticias';
        this.loading = false;
      }
    });
  }

   formattedFecha(fecha: string | Date): string {
     if (!fecha) return '';
     const date = new Date(fecha);
     return date.toLocaleDateString('es-VE', {
       year: 'numeric',
       month: 'long',
       day: 'numeric'
     });
   }
}