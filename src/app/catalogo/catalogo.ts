import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../shared/data-access/auth.service';
import { ApiKeyStatusService } from '../shared/data-access/api-key-status.service';
import { CatalogoService, ProductoCatalogo } from './catalogo.service';

/** Sin acentos y en minúsculas, para buscar y comparar "Papelería" con "papeleria". */
const normalizar = (t: string) =>
  (t || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * Catálogo web (/catalogo): productos que sellhub marca con "Ver en web", filtrables por
 * categoría y etiquetas. De momento es una página privada: no hay enlace a ella en el
 * menú y se pide a los buscadores que no la indexen.
 */
@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo implements OnInit, OnDestroy {
  private catalogoService = inject(CatalogoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private meta = inject(Meta);
  private authService = inject(AuthService);
  private apiKeyStatusService = inject(ApiKeyStatusService);

  readonly porPagina = 24;

  cargando = signal(true);
  error = signal<string | null>(null);
  productos = signal<ProductoCatalogo[]>([]);
  tasa = signal<number | null>(null);

  busqueda = signal('');
  categoria = signal('');
  etiquetas = signal<string[]>([]);
  pagina = signal(1);
  seleccionado = signal<ProductoCatalogo | null>(null);

  /** Categorías con su cantidad de productos, en orden alfabético. */
  categorias = computed(() => this.contar(this.productos().flatMap((p) => p.categorias)));

  /** Etiquetas de los productos de la categoría elegida (o de todos). */
  etiquetasDisponibles = computed(() => {
    const cat = normalizar(this.categoria());
    const base = cat ? this.productos().filter((p) => p.categorias.some((c) => normalizar(c) === cat)) : this.productos();
    return this.contar(base.flatMap((p) => p.etiquetas));
  });

  filtrados = computed(() => {
    const cat = normalizar(this.categoria());
    const tags = this.etiquetas().map(normalizar);
    const palabras = normalizar(this.busqueda()).split(/\s+/).filter(Boolean);
    return this.productos().filter((p) => {
      if (cat && !p.categorias.some((c) => normalizar(c) === cat)) return false;
      // Con varias etiquetas elegidas basta que el producto tenga una.
      if (tags.length && !p.etiquetas.some((e) => tags.includes(normalizar(e)))) return false;
      if (palabras.length) {
        const texto = normalizar([p.nombre, p.descripcion, p.codigo, ...p.categorias, ...p.etiquetas].join(' '));
        if (!palabras.every((w) => texto.includes(w))) return false;
      }
      return true;
    });
  });

  totalPaginas = computed(() => Math.max(1, Math.ceil(this.filtrados().length / this.porPagina)));
  paginados = computed(() => {
    const inicio = (this.pagina() - 1) * this.porPagina;
    return this.filtrados().slice(inicio, inicio + this.porPagina);
  });
  hayFiltros = computed(() => !!(this.busqueda() || this.categoria() || this.etiquetas().length));

  ngOnInit(): void {
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });

    // Los filtros viajan en la URL (?categoria=...&etiqueta=...) para poder compartir una vista.
    const q = this.route.snapshot.queryParamMap;
    this.categoria.set(q.get('categoria') || '');
    this.etiquetas.set(q.getAll('etiqueta'));
    this.busqueda.set(q.get('q') || '');

    this.catalogoService.obtener().subscribe({
      next: (r) => {
        this.productos.set(r.productos || []);
        this.tasa.set(r.tasa);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el catálogo. Intenta de nuevo en unos minutos.');
        this.cargando.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.meta.removeTag("name='robots'");
  }

  mostrarPrecio(): boolean {
    return this.authService.isLoggedIn() || !this.apiKeyStatusService.preciosOcultosParaNoRegistrados();
  }

  elegirCategoria(valor: string): void {
    this.categoria.set(valor);
    // Las etiquetas que no existen en la nueva categoría se descartan.
    const disponibles = new Set(this.etiquetasDisponibles().map((e) => normalizar(e.nombre)));
    this.etiquetas.update((ts) => ts.filter((t) => disponibles.has(normalizar(t))));
    this.aplicar();
  }

  alternarEtiqueta(nombre: string): void {
    const clave = normalizar(nombre);
    this.etiquetas.update((ts) => (ts.some((t) => normalizar(t) === clave) ? ts.filter((t) => normalizar(t) !== clave) : [...ts, nombre]));
    this.aplicar();
  }

  etiquetaActiva(nombre: string): boolean {
    const clave = normalizar(nombre);
    return this.etiquetas().some((t) => normalizar(t) === clave);
  }

  buscar(texto: string): void {
    this.busqueda.set(texto);
    this.aplicar();
  }

  limpiar(): void {
    this.busqueda.set('');
    this.categoria.set('');
    this.etiquetas.set([]);
    this.aplicar();
  }

  irAPagina(n: number): void {
    this.pagina.set(Math.min(Math.max(1, n), this.totalPaginas()));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  abrir(p: ProductoCatalogo): void {
    this.seleccionado.set(p);
  }

  @HostListener('document:keydown.escape')
  cerrar(): void {
    this.seleccionado.set(null);
  }

  precioBs(p: ProductoCatalogo): number | null {
    const tasa = this.tasa();
    return p.precioUsd !== null && tasa ? p.precioUsd * tasa : null;
  }

  private aplicar(): void {
    this.pagina.set(1);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        categoria: this.categoria() || null,
        etiqueta: this.etiquetas().length ? this.etiquetas() : null,
        q: this.busqueda() || null,
      },
      replaceUrl: true,
    });
  }

  /** Nombres sin repetir (sin distinguir mayúsculas ni acentos) con cuántas veces aparecen. */
  private contar(nombres: string[]): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, { nombre: string; cantidad: number }>();
    for (const n of nombres) {
      const clave = normalizar(n);
      if (!clave) continue;
      const actual = mapa.get(clave);
      if (actual) actual.cantidad++;
      else mapa.set(clave, { nombre: n, cantidad: 1 });
    }
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }
}
