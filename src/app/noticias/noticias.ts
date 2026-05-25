import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoticiasService } from '../shared/data-access/noticias.service';
import { Noticia } from '../shared/data-access/noticias.service';
import { MarkdownPipe } from '../shared/pipes/markdown.pipe';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-noticias',
  standalone: true,
  imports: [CommonModule, MarkdownPipe],
  templateUrl: './noticias.html',
  styleUrl: './noticias.css',
})
export class NoticiasComponent implements AfterViewInit {
  noticias: Noticia[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private noticiasService: NoticiasService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadNoticias();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.scrollToNews();
    });
  }

  loadNoticias() {
    this.loading = true;
    this.error = null;
    this.noticiasService.getNoticias().subscribe({
      next: (data) => {
        this.noticias = data;
        this.loading = false;
        setTimeout(() => this.scrollToNews());
      },
      error: (err) => {
        console.error('Error loading noticias:', err);
        this.error = 'Error al cargar las noticias';
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