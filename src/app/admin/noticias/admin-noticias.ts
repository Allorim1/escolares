import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoticiasService } from '../../shared/data-access/noticias.service';
import { Noticia } from '../../shared/data-access/noticias.service';

@Component({
  selector: 'app-admin-noticias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-noticias.html',
  styleUrl: './admin-noticias.css',
})
export class AdminNoticiasComponent {
  noticias: Noticia[] = [];
  loading = true;
  error: string | null = null;
  editingId: string | null = null;
  nuevaNoticia: Omit<Noticia, 'id' | 'fecha'> = {
    titulo: '',
    contenido: '',
    activa: true,
    importante: false
  };

  constructor(private noticiasService: NoticiasService) {}

  ngOnInit() {
    this.loadNoticias();
  }

loadNoticias() {
    this.loading = true;
    this.error = null;
    this.noticiasService.getNoticiasAdmin().subscribe({
     next: (data: Noticia[]) => {
        this.noticias = data;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading noticias:', err);
        this.error = err.error?.error || err.message || 'Error al cargar las noticias';
        this.loading = false;
      }
    });
  }

   crearNoticia() {
     if (!this.nuevaNoticia['titulo'].trim() || !this.nuevaNoticia['contenido'].trim()) {
       return;
     }
     
     this.noticiasService.crearNoticia(this.nuevaNoticia).subscribe({
       next: (noticiaCreada: Noticia) => {
         this.noticias.unshift(noticiaCreada);
         this.nuevaNoticia = {
           titulo: '',
           contenido: '',
           activa: true,
           importante: false
         };
       },
       error: (err: any) => {
         console.error('Error creating noticia:', err);
         this.error = 'Error al crear la noticia';
       }
     });
   }

   toggleActiva(noticia: Noticia) {
     this.noticiasService.actualizarNoticia(noticia.id, { activa: !noticia.activa }).subscribe({
       next: (noticiaActualizada: Noticia) => {
         const index = this.noticias.findIndex(n => n.id === noticia.id);
         if (index !== -1) {
           this.noticias[index] = noticiaActualizada;
         }
       },
       error: (err: any) => {
         console.error('Error updating noticia:', err);
         this.error = 'Error al actualizar la noticia';
       }
     });
   }

   toggleImportante(noticia: Noticia) {
     this.noticiasService.actualizarNoticia(noticia.id, { importante: !noticia.importante }).subscribe({
       next: (noticiaActualizada: Noticia) => {
         const index = this.noticias.findIndex(n => n.id === noticia.id);
         if (index !== -1) {
           this.noticias[index] = noticiaActualizada;
         }
       },
       error: (err: any) => {
         console.error('Error updating noticia:', err);
         this.error = 'Error al actualizar la noticia';
       }
     });
   }

  iniciarEdicion(noticia: Noticia) {
    this.editingId = noticia.id;
    this.nuevaNoticia = {
      titulo: noticia.titulo,
      contenido: noticia.contenido,
      activa: noticia.activa,
      importante: noticia.importante
    };
  }

   guardarEdicion() {
     if (!this.editingId || !this.nuevaNoticia['titulo'].trim() || !this.nuevaNoticia['contenido'].trim()) {
       return;
     }
    
    this.noticiasService.actualizarNoticia(this.editingId, this.nuevaNoticia).subscribe({
      next: (noticiaActualizada) => {
        const index = this.noticias.findIndex(n => n.id === this.editingId);
        if (index !== -1) {
          this.noticias[index] = noticiaActualizada;
        }
        this.cancelarEdicion();
      },
      error: (err) => {
        console.error('Error updating noticia:', err);
        this.error = 'Error al actualizar la noticia';
      }
    });
  }

  cancelarEdicion() {
    this.editingId = null;
    this.nuevaNoticia = {
      titulo: '',
      contenido: '',
      activa: true,
      importante: false
    };
  }

  eliminarNoticia(id: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta noticia?')) {
      return;
    }
    
    this.noticiasService.eliminarNoticia(id).subscribe({
      next: () => {
        this.noticias = this.noticias.filter(n => n.id !== id);
      },
      error: (err) => {
        console.error('Error deleting noticia:', err);
        this.error = 'Error al eliminar la noticia';
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