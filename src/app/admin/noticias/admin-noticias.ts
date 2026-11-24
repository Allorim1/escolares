import { Component, OnInit, signal, ChangeDetectorRef, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { NoticiasService, Noticia } from '../../shared/data-access/noticias.service';
import { catchError, of, timeout } from 'rxjs';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';

import { NotificationModalService } from '../../shared/ui/notification-modal/notification-modal.service';
@Component({
  selector: 'app-admin-noticias',
  standalone: true,
  imports: [FormsModule, MarkdownPipe],
  templateUrl: './admin-noticias.html',
  styleUrl: './admin-noticias.css',
})
export class AdminNoticiasComponent implements OnInit {
  private notifications = inject(NotificationModalService);
   noticias = signal<Noticia[]>([]);
   loading = signal(true);
   private readonly noticiasService = inject(NoticiasService);
   private readonly cdr = inject(ChangeDetectorRef);
   error = signal<string | null>(null);
   editingId = signal<string | null>(null);
   previewMode = false;
  nuevaNoticia: Omit<Noticia, 'id' | 'fecha'> = {
    titulo: '',
    contenido: '',
    activa: true,
    importante: false
  };

  ngOnInit(): void {
    this.loadNoticias();
  }

  insertMarkdown(type: string): void {
    const textarea = document.querySelector('textarea[name="contenido"]') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = this.nuevaNoticia.contenido;
    const before = value.substring(0, start);
    const after = value.substring(end);
    const selected = value.substring(start, end);
    
    let insertText = '';
    let cursorOffset = 0;
    
    switch(type) {
      case 'header':
        insertText = selected ? `# ${selected}` : '# ';
        cursorOffset = selected ? 0 : 2;
        break;
      case 'bold':
        insertText = selected ? `**${selected}**` : '**texto**';
        cursorOffset = selected ? -2 : -7;
        break;
      case 'italic':
        insertText = selected ? `*${selected}*` : '*texto*';
        cursorOffset = selected ? 0 : -5;
        break;
      case 'link':
        insertText = selected ? `[${selected}](url)` : '[texto](url)';
        cursorOffset = selected ? -5 : -11;
        break;
      case 'image':
        insertText = `![alt](url)`;
        cursorOffset = -5;
        break;
      case 'youtube': {
        const ytId = prompt('Ingresa el ID del video de YouTube (ej: dQw4w9WgXcQ):');
        if (ytId) {
          insertText = `youtube: ${ytId}`;
        } else {
          return;
        }
        cursorOffset = 0;
        break;
      }
      case 'list':
        insertText = `- ${selected || 'item de lista'}`;
        cursorOffset = 0;
        break;
      case 'code':
        insertText = selected ? `\`${selected}\`` : '`código`';
        cursorOffset = selected ? 0 : -7;
        break;
      case 'blockquote':
        insertText = selected ? `> ${selected}` : '> cita';
        cursorOffset = 0;
        break;
    }
    
    this.nuevaNoticia.contenido = before + insertText + after;
    setTimeout(() => {
      textarea.focus();
      const newPos = start + insertText.length + cursorOffset;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }

async loadNoticias() {
     this.loading.set(true);
     this.error.set(null);
     
     const timeoutId = setTimeout(() => {
       console.warn('News load timeout - forcing loading false');
       this.loading.set(false);
       this.cdr.detectChanges();
     }, 15000);
     
     this.noticiasService.getNoticiasAdmin().pipe(
       timeout(10000),
       catchError(err => {
         console.error('Error loading noticias:', err);
         this.error.set(err.name === 'TimeoutError' 
           ? 'Tiempo de espera agotado. Intente nuevamente.' 
           : (err.error?.error || err.message || 'Error al cargar las noticias'));
         this.cdr.detectChanges();
         return of([]);
       })
     ).subscribe({
       next: (data: Noticia[]) => {
         clearTimeout(timeoutId);
         console.log('Noticias cargadas:', data.length);
         this.noticias.set(data);
         this.loading.set(false);
         this.cdr.detectChanges();
       },
       error: (err) => {
         clearTimeout(timeoutId);
         console.error('Subscribe error:', err);
         this.loading.set(false);
         this.cdr.detectChanges();
       },
       complete: () => {
         clearTimeout(timeoutId);
         console.log('Observable completed');
         this.loading.set(false);
         this.cdr.detectChanges();
       }
     });
   }

async crearNoticia() {
      if (!this.nuevaNoticia['titulo'].trim() || !this.nuevaNoticia['contenido'].trim()) {
        return;
      }
      
      this.noticiasService.crearNoticia(this.nuevaNoticia).subscribe({
        next: (noticiaCreada: Noticia) => {
          this.noticias.update(noticias => [noticiaCreada, ...noticias]);
          this.nuevaNoticia = {
            titulo: '',
            contenido: '',
            activa: true,
            importante: false
          };
        },
        error: (err) => {
          console.error('Error creating noticia:', err);
          this.error.set('Error al crear la noticia');
        }
      });
    }

async toggleActiva(noticia: Noticia) {
      this.noticiasService.actualizarNoticia(noticia.id, { activa: !noticia.activa }).subscribe({
        next: (noticiaActualizada: Noticia) => {
          this.noticias.update(noticias => {
            const index = noticias.findIndex(n => n.id === noticia.id);
            if (index !== -1) {
              noticias[index] = noticiaActualizada;
            }
            return [...noticias];
          });
        },
        error: (err) => {
          console.error('Error updating noticia:', err);
          this.error.set('Error al actualizar la noticia');
        }
      });
    }

    async toggleImportante(noticia: Noticia) {
      this.noticiasService.actualizarNoticia(noticia.id, { importante: !noticia.importante }).subscribe({
        next: (noticiaActualizada: Noticia) => {
          this.noticias.update(noticias => {
            const index = noticias.findIndex(n => n.id === noticia.id);
            if (index !== -1) {
              noticias[index] = noticiaActualizada;
            }
            return [...noticias];
          });
        },
        error: (err) => {
          console.error('Error updating noticia:', err);
          this.error.set('Error al actualizar la noticia');
        }
      });
    }

    async iniciarEdicion(noticia: Noticia) {
      this.editingId.set(noticia.id);
      this.nuevaNoticia = {
        titulo: noticia.titulo,
        contenido: noticia.contenido,
        activa: noticia.activa,
        importante: noticia.importante
      };
    }

async guardarEdicion() {
      const editingIdValue = this.editingId();
      if (!editingIdValue || !this.nuevaNoticia['titulo'].trim() || !this.nuevaNoticia['contenido'].trim()) {
        return;
      }
     
      this.noticiasService.actualizarNoticia(editingIdValue, this.nuevaNoticia).subscribe({
        next: (noticiaActualizada) => {
          this.noticias.update(noticias => {
            const index = noticias.findIndex(n => n.id === editingIdValue);
            if (index !== -1) {
              noticias[index] = noticiaActualizada;
            }
            return [...noticias];
          });
          this.cancelarEdicion();
        },
        error: (err) => {
          console.error('Error updating noticia:', err);
          this.error.set('Error al actualizar la noticia');
        }
      });
    }

    async cancelarEdicion() {
      this.editingId.set(null);
      this.nuevaNoticia = {
        titulo: '',
        contenido: '',
        activa: true,
        importante: false
      };
    }

    async eliminarNoticia(id: string) {
      const ok = await this.notifications.confirm({ titulo: 'Confirmar acción', mensaje: '¿Estás seguro de que deseas eliminar esta noticia?', tipo: 'danger', confirmarTexto: 'Eliminar' });
    if (!ok) return;
      
      this.noticiasService.eliminarNoticia(id).subscribe({
        next: () => {
          this.noticias.update(noticias => noticias.filter(n => n.id !== id));
        },
        error: (err) => {
          console.error('Error deleting noticia:', err);
          this.error.set('Error al eliminar la noticia');
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