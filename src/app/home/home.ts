import {
  Component,
  inject,
  signal,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChildren,
  QueryList,
  PLATFORM_ID,
  OnInit,
  computed,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MarcasService } from '../shared/data-access/marcas.service';
import { NoticiasService, Noticia } from '../shared/data-access/noticias.service';
import { MarkdownPipe } from '../shared/pipes/markdown.pipe';
import { Router, RouterLink } from '@angular/router';
import { ProductsStateService } from '../products/data-access/products-state.service';
import { CartStateService } from '../shared/data-access/cart-state.service';
import { CurrencyService } from '../shared/data-access/currency.service';
import { Product } from '../shared/interfaces/product.interface';
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, CommonModule, MarkdownPipe, RouterLink],
  templateUrl: './home.html',
  styleUrls: ['./home.mobile-fixes.css'],
  styles: [
    `
      .reveal-init {
        opacity: 0;
        transform: translateY(24px);
        transition: opacity .6s ease-out, transform .6s ease-out;
      }

      .reveal-active,
      .reveal-init.reveal-fallback {
        opacity: 1;
        transform: translateY(0);
      }

      @media (prefers-reduced-motion: reduce) {
        .reveal-init, .reveal-active, .reveal-init.reveal-fallback {
          opacity: 1 !important;
          transform: none !important;
          transition: none !important;
          animation: none !important;
        }
        .carousel-track, .product-card, .product-image, .marca-logo-wrap, .noticia-card, .feature-card, .hero-btn, .newsletter-form button, .whatsapp-float {
          transition: none !important;
          animation: none !important;
        }
      }

      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        text-align: center;
        padding: 2rem;
      }

      .whatsapp-float {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 60px;
        height: 60px;
        background: #25d366;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        transition: transform 0.3s;
      }

      .whatsapp-float:hover { transform: scale(1.1); }
      .whatsapp-float:focus-visible { outline: 3px solid rgba(37,211,102,.45); outline-offset: 3px; }

      .whatsapp-float img {
        width: 35px;
        height: 35px;
      }

      /* Hero */
      .hero-container {
        width: 100%;
        max-width: 1240px;
        margin: 0 auto 3rem;
        padding: 0 1rem;
        box-sizing: border-box;
      }
      .hero-banner {
        position: relative;
        width: 100%;
        min-height: 360px;
        max-height: 520px;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 20px 50px rgba(23, 54, 95, 0.12);
        background: #e9f2fb;
      }
      .hero-banner .main-banner {
        width: 100%;
        height: 100%;
        min-height: 360px;
        max-height: 520px;
        object-fit: cover;
        display: block;
      }
      .hero-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        text-align: left;
        padding: clamp(1.5rem, 4vw, 3.5rem);
        background: linear-gradient(90deg, rgba(16,42,82,.72) 0%, rgba(16,42,82,.45) 42%, rgba(16,42,82,.08) 72%, rgba(16,42,82,0) 100%);
        color: #fff;
      }
      .hero-eyebrow {
        margin: 0 0 .5rem;
        font-size: .78rem;
        font-weight: 700;
        letter-spacing: .12em;
        text-transform: uppercase;
        color: rgba(255,255,255,.85);
      }
      .hero-title {
        margin: 0;
        max-width: 680px;
        font-size: clamp(2rem, 4.6vw, 3.5rem);
        line-height: 1.1;
        font-weight: 800;
        color: #fff;
        opacity: 1;
        animation: none;
        text-shadow: 0 2px 12px rgba(0,0,0,.18);
      }
      .hero-subtitle {
        margin: 1rem 0 0;
        max-width: 560px;
        font-size: clamp(.95rem, 1.6vw, 1.1rem);
        line-height: 1.6;
        color: rgba(255,255,255,.92);
      }
      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: .75rem;
        margin-top: 1.5rem;
      }
      .hero-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: .85rem 1.4rem;
        border-radius: 12px;
        font-size: .95rem;
        font-weight: 700;
        text-decoration: none;
        transition: transform .2s, box-shadow .2s, background .2s, color .2s;
      }
      .hero-btn:hover { transform: translateY(-1px); }
      .hero-btn:focus-visible { outline: 3px solid rgba(255,255,255,.7); outline-offset: 2px; }
      .hero-btn-primary { background: #fff; color: #17365f; box-shadow: 0 8px 24px rgba(0,0,0,.12); }
      .hero-btn-primary:hover { background: #f3f8ff; }
      .hero-btn-secondary { background: rgba(255,255,255,.12); color: #fff; border: 1px solid rgba(255,255,255,.45); backdrop-filter: blur(4px); }
      .hero-btn-secondary:hover { background: rgba(255,255,255,.2); }
      @media (max-width: 768px) {
        .hero-container { padding: 0 .75rem; margin-bottom: 2.25rem; }
        .hero-banner, .hero-banner .main-banner { min-height: 280px; max-height: 360px; border-radius: 18px; }
        .hero-overlay { background: linear-gradient(180deg, rgba(16,42,82,.15) 0%, rgba(16,42,82,.35) 35%, rgba(16,42,82,.72) 100%); justify-content: flex-end; }
      }
      @media (max-width: 480px) {
        .hero-container { padding: 0 .5rem; }
        .hero-banner, .hero-banner .main-banner { min-height: 320px; }
        .hero-actions { flex-direction: column; align-items: stretch; }
        .hero-btn { width: 100%; }
      }

      .carousel-dots {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        margin-bottom: 2rem;
      }

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #ccc;
        cursor: pointer;
      }

      .dot.active {
        background: #007bff;
      }

      h1 {
        font-size: 3rem;
        color: #007bff;
        margin-bottom: 1.5rem;
        opacity: 0;
        animation: fadeIn 1s ease-out forwards;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .btn-products {
        background-color: #007bff;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .btn-products:hover {
        background-color: #0056b3;
      }

      .marcas-carousel {
        width: 100%; padding: .5rem 56px; display: flex; align-items: center; position: relative; box-sizing: border-box;
      }
      .carousel-viewport { overflow: hidden; flex: 1; width: 100%; margin: 0 auto; }
      .carousel-track { display: flex; gap: 1rem; transition: transform .5s ease-in-out; }
      .marca-slide {
        flex: 0 0 200px; display: flex; flex-direction: column; align-items: center; gap: .75rem;
        text-decoration: none; cursor: pointer; padding: .25rem;
      }
      .marca-logo-wrap {
        width: 100%; height: 132px; display: flex; align-items: center; justify-content: center;
        background: #fff; border: 1px solid #e7edf4; border-radius: 16px; padding: 1.25rem; box-sizing: border-box;
        box-shadow: 0 2px 8px rgba(23,54,95,.04); transition: transform .2s, box-shadow .2s, border-color .2s;
      }
      .marca-slide:hover .marca-logo-wrap, .marca-slide:focus-visible .marca-logo-wrap { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(23,54,95,.08); border-color: #d4e2f2; }
      .marca-slide:focus-visible { outline: none; }
      .marca-slide:focus-visible .marca-logo-wrap { outline: 3px solid rgba(29,99,193,.25); outline-offset: 2px; }
      .marca-image { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; display: block; }
      .marca-placeholder {
        width: 72px; height: 72px; border-radius: 16px; background: linear-gradient(135deg, #1d63c1 0%, #4aace7 100%);
        display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 700; color: white;
      }
      .marca-name { font-size: .9rem; color: #425a75; font-weight: 600; text-align: center; line-height: 1.3; }
      .carousel-btn {
        width: 40px; height: 40px; border-radius: 50%; background: #fff; color: #17365f; border: 1px solid #dbe6f2;
        cursor: pointer; font-size: 1.4rem; line-height: 1; display: flex; align-items: center; justify-content: center;
        transition: all .2s; z-index: 10; position: absolute; box-shadow: 0 4px 12px rgba(23,54,95,.08);
      }
      .carousel-btn:hover { background: #1d63c1; color: #fff; border-color: #1d63c1; }
      .carousel-btn:focus-visible { outline: 3px solid rgba(29,99,193,.25); outline-offset: 2px; }
      .carousel-btn.prev { left: 0; }
      .carousel-btn.next { right: 0; }
      @media (max-width: 768px) {
        .marcas-carousel { padding: .5rem 44px; }
        .marca-slide { flex: 0 0 180px; }
        .marca-logo-wrap { height: 112px; padding: 1rem; }
      }
      @media (max-width: 480px) {
        .marcas-carousel { padding: .5rem 38px; }
        .carousel-track { gap: .75rem; }
        .marca-slide { flex: 0 0 160px; gap: .5rem; }
        .marca-logo-wrap { height: 96px; padding: .85rem; border-radius: 14px; }
        .marca-name { font-size: .8rem; }
        .carousel-btn { width: 34px; height: 34px; font-size: 1.2rem; }
      }


      .newsletter-section {
        width: 100%;
        max-width: 1240px;
        margin: 0 auto 3.5rem;
        padding: 0 1rem;
        box-sizing: border-box;
        font-family: 'Montserrat', sans-serif;
      }
      .newsletter-content {
        padding: clamp(1.75rem, 4vw, 3rem);
        border-radius: 24px;
        background: linear-gradient(135deg, #17365f 0%, #1d63c1 55%, #2a7bd6 100%);
        color: #fff;
        text-align: center;
        box-shadow: 0 18px 40px rgba(29, 99, 193, .22);
      }
      .newsletter-content .section-eyebrow { color: rgba(255,255,255,.75); margin: 0 0 .5rem; font-size: .72rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
      .newsletter-content h2 { margin: 0; font-size: clamp(1.6rem, 3vw, 2.3rem); line-height: 1.2; color: #fff; }
      .newsletter-copy { max-width: 640px; margin: .85rem auto 0; color: rgba(255,255,255,.88); font-size: 1rem; line-height: 1.6; }
      .newsletter-form { display: flex; gap: .75rem; max-width: 560px; margin: 1.75rem auto 0; }
      .custom-input {
        flex: 1; min-width: 0; padding: .95rem 1.1rem; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.28);
        border-radius: 12px; color: #fff; font: inherit; font-size: .95rem; outline: none; transition: border-color .2s, background .2s, box-shadow .2s;
      }
      .custom-input::placeholder { color: rgba(255,255,255,.65); }
      .custom-input:focus { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.65); box-shadow: 0 0 0 4px rgba(255,255,255,.12); }
      .newsletter-form button {
        padding: .95rem 1.5rem; border: 0; border-radius: 12px; background: #fff; color: #17365f; font: inherit; font-size: .95rem; font-weight: 700;
        cursor: pointer; transition: transform .2s, box-shadow .2s, background .2s; white-space: nowrap;
      }
      .newsletter-form button:hover { transform: translateY(-1px); background: #f3f8ff; box-shadow: 0 8px 20px rgba(0,0,0,.12); }
      .newsletter-form button:focus-visible { outline: 3px solid rgba(255,255,255,.65); outline-offset: 2px; }
      .newsletter-message {
        display: inline-flex; align-items: center; margin: 1rem 0 0; padding: .6rem 1rem; border-radius: 999px;
        background: rgba(255,255,255,.14); color: #fff; font-size: .9rem; font-weight: 600;
      }
      .newsletter-message.success { background: rgba(220,252,231,.18); color: #dcfce7; }
      .newsletter-message.info { background: rgba(254,243,199,.18); color: #fef3c7; }
      .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
      @media (max-width: 640px) {
        .newsletter-section { padding: 0 .75rem; margin-bottom: 2.75rem; }
        .newsletter-form { flex-direction: column; }
        .newsletter-form button { width: 100%; }
      }

      .features-section {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1.25rem;
        width: 100%;
        max-width: 1240px;
        margin: 0 auto 3.5rem;
        padding: 0 1rem;
        box-sizing: border-box;
      }
      .feature-card {
        background: #fff;
        padding: 1.5rem;
        border-radius: 18px;
        text-align: left;
        border: 1px solid #e7edf4;
        box-shadow: 0 2px 8px rgba(23,54,95,.04);
        transition: transform .2s, box-shadow .2s, border-color .2s;
      }
      .feature-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(23,54,95,.08); border-color: #d4e2f2; }
      .feature-icon {
        width: 52px; height: 52px; display: inline-flex; align-items: center; justify-content: center;
        margin-bottom: 1rem; border-radius: 14px; background: #eef5ff; color: #1d63c1;
      }
      .feature-icon svg { width: 26px; height: 26px; }
      .feature-card h3 { font-size: 1rem; color: #17365f; margin: 0 0 .45rem; font-weight: 700; }
      .feature-card p { font-size: .9rem; color: #5f7185; margin: 0; line-height: 1.55; }
      @media (max-width: 900px) { .features-section { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media (max-width: 560px) { .features-section { grid-template-columns: 1fr; padding: 0 .75rem; margin-bottom: 2.75rem; } .feature-card { padding: 1.25rem; } }

      @media (max-width: 768px) {
        :host { width: 100%; min-height: auto; padding: 0; align-items: stretch; justify-content: flex-start; box-sizing: border-box; text-align: left; }
        .whatsapp-float { width: 50px; height: 50px; bottom: 1rem; right: 1rem; }
        .whatsapp-float img { width: 28px; height: 28px; }
      }

      @media (max-width: 480px) {
        .whatsapp-float { width: 44px; height: 44px; bottom: 0.75rem; right: 0.75rem; }
        .whatsapp-float img { width: 24px; height: 24px; }
      }

      .noticias-section {
        width: 100%; max-width: 1240px; margin: 0 auto 3.5rem; padding: 0 1rem; box-sizing: border-box;
      }
      .noticias-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; }
      .noticia-card {
        background: #fff; padding: 1.5rem; border-radius: 18px; text-align: left; border: 1px solid #e7edf4;
        box-shadow: 0 2px 8px rgba(23,54,95,.04); transition: transform .2s, box-shadow .2s, border-color .2s;
      }
      .noticia-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(23,54,95,.08); border-color: #d4e2f2; }
      .noticia-card.importante { border-color: #cfe0f5; background: linear-gradient(180deg,#f8fbff 0%,#fff 100%); }
      .noticia-meta { display: flex; align-items: center; gap: .6rem; margin-bottom: .75rem; flex-wrap: wrap; }
      .noticia-badge { display: inline-flex; padding: .22rem .6rem; border-radius: 999px; background: #e8f2ff; color: #1d63c1; font-size: .72rem; font-weight: 700; }
      .noticia-fecha { font-size: .82rem; color: #6b7f95; margin: 0; }
      .noticia-card h3 { font-size: 1.1rem; color: #17365f; margin: 0 0 .65rem; line-height: 1.35; font-weight: 700; }
      .noticia-contenido {
        font-size: .93rem; color: #5f7185; line-height: 1.65; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
      }
      .noticia-contenido ::ng-deep p { margin: 0; }
      .noticia-contenido ::ng-deep h1, .noticia-contenido ::ng-deep h2, .noticia-contenido ::ng-deep h3,
      .noticia-contenido ::ng-deep ul, .noticia-contenido ::ng-deep ol, .noticia-contenido ::ng-deep img { display: none; }
      .noticias-empty {
        padding: 2rem; border: 1px dashed #d5e1ef; border-radius: 18px; background: #f9fbfe; text-align: center;
      }
      .noticias-empty .section-title { margin-bottom: .5rem; }
      .no-noticias { color: #6b7f95; margin: 0; font-size: .95rem; }
      @media (max-width: 768px) { .noticias-section { padding: 0 .75rem; margin-bottom: 2.75rem; } .noticias-grid { grid-template-columns: 1fr; } }

      /* Product sections */
      .home-products-section {
        width: 100%;
        max-width: 1240px;
        margin: 0 auto 3.5rem;
        padding: 0 1rem;
        box-sizing: border-box;
      }
      .section-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .section-eyebrow {
        margin: 0 0 .35rem;
        font-size: .72rem;
        font-weight: 700;
        letter-spacing: .1em;
        text-transform: uppercase;
        color: #1d63c1;
      }
      .section-title {
        margin: 0;
        font-size: clamp(1.5rem, 2.6vw, 2rem);
        line-height: 1.2;
        color: #17365f;
        font-weight: 800;
      }
      .section-link {
        flex: 0 0 auto;
        color: #1d63c1;
        font-size: .9rem;
        font-weight: 700;
        text-decoration: none;
        padding: .5rem .25rem;
        border-radius: 8px;
        transition: color .2s, background .2s;
      }
      .section-link:hover { color: #124a94; background: #eef5ff; }
      .section-link:focus-visible { outline: 3px solid rgba(29,99,193,.25); outline-offset: 2px; }
      .section-heading--center { justify-content: center; text-align: center; }
      .section-heading--center .section-eyebrow, .section-heading--center .section-title { text-align: center; }
      .home-brands-section, .features-section-wrap { width: 100%; max-width: 1240px; margin: 0 auto 3.5rem; padding: 0 1rem; box-sizing: border-box; }
      @media (max-width: 768px) { .home-brands-section, .features-section-wrap { margin-bottom: 2.75rem; padding: 0 .75rem; } }
      .products-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1.25rem;
      }
      .product-card {
        position: relative;
        display: flex;
        flex-direction: column;
        min-width: 0;
        background: #fff;
        border: 1px solid #e7edf4;
        border-radius: 16px;
        overflow: hidden;
        text-decoration: none;
        color: inherit;
        box-shadow: 0 2px 8px rgba(23,54,95,.04);
        transition: transform .2s, box-shadow .2s, border-color .2s;
      }
      .product-card:hover { transform: translateY(-4px); box-shadow: 0 14px 30px rgba(23,54,95,.1); border-color: #d4e2f2; }
      .product-card:focus-visible { outline: 3px solid rgba(29,99,193,.28); outline-offset: 2px; }
      .product-badge {
        position: absolute;
        top: .75rem;
        left: .75rem;
        z-index: 1;
        padding: .3rem .65rem;
        border-radius: 999px;
        background: #fff1eb;
        color: #c2410c;
        font-size: .72rem;
        font-weight: 700;
        letter-spacing: .01em;
      }
      .product-image-wrap { background: #f7faff; padding: 1rem; overflow: hidden; }
      .product-image {
        width: 100%;
        aspect-ratio: 1 / 1;
        object-fit: contain;
        display: block;
        mix-blend-mode: multiply;
        transition: transform .4s ease;
      }
      .product-card:hover .product-image,
      .product-card:focus-visible .product-image { transform: scale(1.05); }
      .product-info {
        display: flex;
        flex-direction: column;
        gap: .5rem;
        padding: 1rem;
        flex: 1;
      }
      .product-title {
        margin: 0;
        font-size: .92rem;
        font-weight: 600;
        line-height: 1.4;
        color: #263b56;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-height: calc(1.4em * 2);
        text-transform: capitalize;
      }
      .product-price {
        margin: auto 0 0;
        font-size: 1.05rem;
        font-weight: 800;
        color: #1d63c1;
      }
      .product-price.oferta { display: flex; flex-wrap: wrap; align-items: baseline; gap: .4rem; }
      .product-price .precio-oferta { color: #c2410c; font-size: 1.05rem; font-weight: 800; }
      .product-price .precio-original { color: #8594a7; font-size: .82rem; font-weight: 500; text-decoration: line-through; }
      @media (max-width: 1024px) { .products-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
      @media (max-width: 768px) {
        .home-products-section { margin-bottom: 2.75rem; padding: 0 .75rem; }
        .section-heading { margin-bottom: 1.1rem; }
        .products-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .85rem; }
        .product-info { padding: .85rem; }
        .product-title { font-size: .86rem; }
      }
      @media (max-width: 420px) { .products-grid { gap: .65rem; } .product-image-wrap { padding: .65rem; } }

      @media (max-width: 768px) {
        .productos-carousel {
          padding: 1rem 30px;
        }

        .productos-carousel-viewport {
          width: calc(180px * 3 + 1rem * 2);
        }

        .producto-slide {
          flex: 0 0 180px;
        }

        .producto-image {
          height: 120px;
        }

        .producto-title {
          font-size: 0.75rem;
        }
      }

      @media (max-width: 480px) {
        .productos-carousel {
          padding: 0.75rem 25px;
        }

        .productos-carousel-viewport {
          width: calc(150px * 2 + 1rem);
        }

        .producto-slide {
          flex: 0 0 150px;
        }

        .producto-image {
          height: 100px;
          padding: 0.25rem;
        }
      }
    `,
  ],
})
export default class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);

  private marcasService = inject(MarcasService);
  private noticiasService = inject(NoticiasService);
  private productsState = inject(ProductsStateService);
  private cartState = inject(CartStateService).state;
  private currencyService = inject(CurrencyService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  marcas = this.marcasService.marcas;
  mobileSearchQuery = '';
  mobileCategories = computed(() =>
    Array.from(
      new Set(
        this.productsState
          .allProducts()
          .map(({ category }) => category.trim())
          .filter(Boolean),
      ),
    ).slice(0, 8),
  );
  noticias = signal<Noticia[]>([]);
  noticiasLoaded = signal(false);
  currentIndex = 0;
  visibleCount = 4;
  marcaStep = 216;
  private readonly RECOMENDADOS_STORAGE_KEY = 'productosRecomendados';
  private readonly RECOMENDADOS_TIMESTAMP_KEY = 'productosRecomendadosTimestamp';
  private readonly RECOMENDADOS_REFRESH_INTERVAL = 2 * 60 * 60 * 1000;

  productosRecomendadosFijos = signal<Product[]>([]);

  @ViewChildren('revealElement') revealElements!: QueryList<ElementRef>;

  emailSuscrito = '';
  mensajeSuscrito = signal('');

  private autoScrollInterval: ReturnType<typeof setInterval> | null = null;
  private revealObserver: IntersectionObserver | null = null;
  private brandObserver: IntersectionObserver | null = null;
  private brandsVisible = true;
  private prefersReducedMotion = false;
  private visibilityHandler = () => this.syncBrandAutoplay();

  get duplicatedMarcas() {
    const marcasValue = this.marcas();
    const original = Array.isArray(marcasValue) ? marcasValue : [];
    return [...original, ...original, ...original, ...original];
  }

  get totalMarcas() {
    return this.duplicatedMarcas.length;
  }

  getMarcasTransform(): string {
    const step = typeof window !== 'undefined' && window.innerWidth <= 480 ? 172 : typeof window !== 'undefined' && window.innerWidth <= 768 ? 196 : 216;
    return `translateX(-${this.currentIndex * step}px)`;
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.setupRevealObserver();
      this.revealElements?.changes?.subscribe(() => { this.observeRevealElements(); this.setupBrandObserver(); });
      this.observeRevealElements();
      this.setupBrandObserver();
      document.addEventListener('visibilitychange', this.visibilityHandler);
      this.syncBrandAutoplay();
    }
  }

  ngOnDestroy(): void {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
    }
    this.revealObserver?.disconnect();
    this.brandObserver?.disconnect();
    if (isPlatformBrowser(this.platformId)) document.removeEventListener('visibilitychange', this.visibilityHandler);
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadNoticias();
      this.productsState.loadProducts();
      this.waitForDataAndReveal();
    }
  }

  searchMobileProducts(): void {
    const search = this.mobileSearchQuery.trim();
    if (!search) return;

    this.router.navigate(['/products'], { queryParams: { search } });
  }

  private waitForDataAndReveal(): void {
    const maxAttempts = 50;
    let attempts = 0;

    const checkData = () => {
      const products = this.productsState.allProducts();
      if ((Array.isArray(products) && products.length > 0) || this.noticiasLoaded()) {
        this.cdr.detectChanges();
        this.observeRevealElements();
        return true;
      }
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkData, 100);
      } else {
        this.cdr.detectChanges();
        this.observeRevealElements();
      }
      return false;
    };

    checkData();
  }

  loadNoticias() {
    this.noticiasService.getNoticias().subscribe({
      next: () => {
        this.noticias.set(this.noticiasService.activeNoticias());
        this.noticiasLoaded.set(true);
        this.cdr.detectChanges();
        this.observeRevealElements();
      },
      error: (err) => {
        console.error('Error loading noticias:', err);
        this.noticiasLoaded.set(true);
        this.cdr.detectChanges();
        this.observeRevealElements();
      },
    });
  }

  formattedFecha(fecha: string | Date): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private setupRevealObserver() {
    if (this.revealObserver || this.prefersReducedMotion) return;
    this.revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-active');
          this.revealObserver?.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  }

  private observeRevealElements() {
    setTimeout(() => {
      const elements = this.revealElements?.length
        ? this.revealElements.map((el) => el.nativeElement)
        : Array.from(document.querySelectorAll('.reveal-init:not(.reveal-active)'));
      if (this.prefersReducedMotion || !this.revealObserver) {
        elements.forEach((el) => el?.classList.add('reveal-active'));
        return;
      }
      elements.forEach((el) => { if (el && !el.classList.contains('reveal-active')) this.revealObserver!.observe(el); });
    }, 50);
  }

  suscribirse() {
    if (this.emailSuscrito && this.emailSuscrito.includes('@')) {
      this.mensajeSuscrito.set('Gracias por tu interés. Pronto habilitaremos esta suscripción.');
      this.emailSuscrito = '';
      setTimeout(() => this.mensajeSuscrito.set(''), 3000);
    } else {
      this.mensajeSuscrito.set('Por favor ingresa un correo válido');
      setTimeout(() => this.mensajeSuscrito.set(''), 3000);
    }
  }

  prev() {
    const marcasArray = this.marcas();
    if (!Array.isArray(marcasArray)) return;
    const originalLength = marcasArray.length;
    if (this.currentIndex > originalLength) {
      this.currentIndex--;
    } else {
      this.currentIndex = this.totalMarcas - this.visibleCount - 1;
    }
  }

  next() {
    const marcasArray = this.marcas();
    if (!Array.isArray(marcasArray)) return;
    const originalLength = marcasArray.length;
    if (this.currentIndex < this.totalMarcas - this.visibleCount) {
      this.currentIndex++;
    } else {
      this.currentIndex = originalLength;
    }
  }

  pauseAutoScroll() {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
  }

  resumeAutoScroll() {
    this.syncBrandAutoplay();
  }

  private syncBrandAutoplay() {
    if (!isPlatformBrowser(this.platformId)) return;
    const shouldRun = !this.prefersReducedMotion && this.brandsVisible && document.visibilityState === 'visible';
    if (shouldRun && !this.autoScrollInterval) {
      this.autoScrollInterval = setInterval(() => this.next(), 3000);
    } else if (!shouldRun && this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
  }

  private setupBrandObserver() {
    if (this.brandObserver || !isPlatformBrowser(this.platformId) || this.prefersReducedMotion) return;
    const section = document.querySelector('.home-brands-section');
    if (!section) return;
    this.brandObserver = new IntersectionObserver((entries) => {
      this.brandsVisible = !!entries[0]?.isIntersecting;
      this.syncBrandAutoplay();
    }, { threshold: 0.15 });
    this.brandObserver.observe(section);
  }

  get productosDestacados() {
    return computed(() => {
      const all = this.productsState.allProducts();
      if (!Array.isArray(all) || all.length === 0) return [];
      return [...all].sort((a, b) => (b.rating?.count || 0) - (a.rating?.count || 0)).slice(0, 10);
    });
  }

  get productosRecomendados() {
    return computed(() => {
      const stored = this.getStoredRecomendados();
      if (stored) {
        return stored;
      }
      return this.generateNewRecomendados();
    });
  }

  private getStoredRecomendados(): Product[] | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const stored = localStorage.getItem(this.RECOMENDADOS_STORAGE_KEY);
      const timestamp = localStorage.getItem(this.RECOMENDADOS_TIMESTAMP_KEY);

      if (stored && timestamp) {
        const parsedTimestamp = parseInt(timestamp, 10);
        const now = Date.now();

        if (now - parsedTimestamp < this.RECOMENDADOS_REFRESH_INTERVAL) {
          return JSON.parse(stored);
        }
      }
    } catch (e) {
      console.error('Error reading stored recomendados:', e);
    }
    return null;
  }

  private generateNewRecomendados(): Product[] {
    const all = this.productsState.allProducts();
    if (!Array.isArray(all) || all.length === 0) return [];

    const shuffled = [...all].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);

    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(this.RECOMENDADOS_STORAGE_KEY, JSON.stringify(selected));
        localStorage.setItem(this.RECOMENDADOS_TIMESTAMP_KEY, Date.now().toString());
      } catch (e) {
        console.error('Error storing recomendados:', e);
      }
    }

    return selected;
  }

  addToCart(product: Product) {
    this.cartState.add({ product, quantity: 1 });
  }

  formatPrice(priceInUsd: number): string {
    return this.currencyService.formatPrice(priceInUsd);
  }
}
