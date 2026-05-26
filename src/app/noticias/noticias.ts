import { Component, AfterViewInit, OnInit } from '@angular/core';
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
export class NoticiasComponent implements OnInit, AfterViewInit {
  noticias: Noticia[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private noticiasService: NoticiasService
  ) {}

  ngOnInit() {
    this.loadNoticias();
  }

  ngAfterViewInit() {
    this.scrollToNews();
  }

  scrollToNoticia(id: string) {
    window.location.hash = id;
    this.scrollToNews();
  }

  loadNoticias() {
    this.loading = true;
    this.error = null;
    
    const timeout = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.error = 'Tiempo de espera agotado. Intente recargar la página.';
      }
    }, 10000);

    this.noticiasService.getNoticias().subscribe({
      next: (data) => {
        clearTimeout(timeout);
        this.noticias = data;
        this.loading = false;
      },
      error: (err) => {
        clearTimeout(timeout);
        console.error('Error loading noticias:', err);
        this.error = 'Error al cargar las noticias. Verifique la conexión.';
        this.loading = false;
      },
      complete: () => {
        clearTimeout(timeout);
        this.loading = false;
      }
    });
  }

  scrollToNews() {
    const hash = window.location.hash.substring(1);
    if (hash) {
      const element = document.getElementById(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlighted');
        setTimeout(() => element.classList.remove('highlighted'), 2000);
      }
    }
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