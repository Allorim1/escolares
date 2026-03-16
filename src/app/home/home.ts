import {
  Component,
  inject,
  signal,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChildren,
  QueryList,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MarcasService } from '../shared/data-access/marcas.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './home.html',
  styles: [
    `
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500&display=swap');

      .reveal-init {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.8s ease-out;
      }

      .reveal-active {
        opacity: 1;
        transform: translateY(0);
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

      .whatsapp-float:hover {
        transform: scale(1.1);
      }

      .whatsapp-float img {
        width: 35px;
        height: 35px;
      }

      .main-banner {
        width: 100%;
        height: auto;
        display: block;
      }

      .banner-carousel {
        width: 100%;
        position: relative;
        overflow: hidden;
        margin-bottom: 1rem;
      }

      .banner-slide {
        display: none;
      }

      .banner-slide.active {
        display: block;
      }

      .banner-slide img {
        width: 100%;
        height: auto;
        display: block;
      }

      .banner-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0, 0, 0, 0.5);
        color: white;
        border: none;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.5rem;
        z-index: 10;
        transition: background 0.3s;
      }

      .banner-btn:hover {
        background: rgba(0, 0, 0, 0.8);
      }

      .banner-btn.prev {
        left: 1rem;
      }

      .banner-btn.next {
        right: 1rem;
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
        width: 100%;
        max-width: 100%;
        margin-top: 2rem;
        padding: 2rem 40px;
        display: flex;
        align-items: center;
        position: relative;
        box-sizing: border-box;
      }

      .marcas-title {
        font-size: 2rem;
        color: #333;
        margin-bottom: 1.5rem;
      }

      .carousel-viewport {
        overflow: hidden;
        flex: 1;
        width: calc(200px * 4 + 24px * 3);
        margin: 0 auto;
      }

      .carousel-track {
        display: flex;
        gap: 1.5rem;
        transition: transform 0.5s ease-in-out;
      }

      .carousel-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0, 0, 0, 0.5);
        color: white;
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.5rem;
        z-index: 2;
        transition: background 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .carousel-btn:hover {
        background: rgba(0, 0, 0, 0.7);
      }

      .carousel-btn.prev {
        left: 0;
      }

      .carousel-btn.next {
        right: 0;
      }

      .marca-slide {
        flex: 0 0 200px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }

      .marca-image {
        width: 150px;
        height: 150px;
        object-fit: contain;
        border-radius: 12px;
        background: #ffffff;
        padding: 1rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        transition: transform 0.2s;
      }

      .marca-image:hover {
        transform: scale(1.05);
      }

      .marca-placeholder {
        width: 150px;
        height: 150px;
        border-radius: 12px;
        background: linear-gradient(135deg, #1d63c1 0%, #4aace7 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 3rem;
        font-weight: 700;
        color: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .marca-name {
        font-size: 1rem;
        color: #333;
        font-weight: 500;
        text-align: center;
      }

      .carousel-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0, 0, 0, 0.5);
        color: white;
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.2rem;
        z-index: 2;
        transition: background 0.2s;
      }

      .carousel-btn:hover {
        background: rgba(0, 0, 0, 0.7);
      }

      .carousel-btn.prev {
        left: 0;
      }

      .carousel-btn.next {
        right: 0;
      }

      .newsletter-section {
        font-family: 'Montserrat', sans-serif;
        width: 100%;
        max-width: 1200px;
        margin: 2rem auto;
        padding: 2.5rem;
        gap: 1.5rem;
        background: linear-gradient(135deg, #1d63c1 0%, #1565c0 100%);
        border-radius: 16px;
        text-align: center;
        box-shadow: 0 8px 24px rgba(29, 99, 193, 0.3);
      }

      .custom-input {
        width: 100%;
        padding: 12px 20px;
        background-color: transparent;
        border: 1px solid rgba(255, 255, 255, 0.98); /* Borde sutil como tu imagen */
        border-radius: 50px; /* Bordes muy redondeados */
        color: white;
        font-family: 'Montserrat', sans-serif;
        font-size: 16px;
        outline: none;

        /* Estilo específico del PLACEHOLDER */
        &::placeholder {
          color: rgba(255, 255, 255, 0.8); /* Blanco con transparencia */
          font-family: 'Montserrat', sans-serif;
          font-weight: 500;
        }
      }
      .newsletter-content h2 {
        color: white;
        font-size: 1.8rem;
        margin: 0 0 0.75rem;
      }

      .newsletter-content > p {
        color: rgba(255, 255, 255, 0.9);
        font-size: 1rem;
        margin: 0 0 1.5rem;
      }

      .newsletter-form {
        display: flex;
        gap: 0.75rem;
        max-width: 500px;
        margin: 0 auto;
      }

      .newsletter-form input {
        flex: 1;
        padding: 0.875rem 1rem;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
      }

      .newsletter-form input:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
      }

      .newsletter-form button {
        padding: 0.875rem 1.5rem;
        background: #28a745;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }

      .newsletter-form button:hover {
        background: #218838;
      }

      .newsletter-message {
        margin: 1rem 0 0;
        color: white;
        font-weight: 500;
      }

      .newsletter-message.success {
        color: #90ee90;
      }

      @media (max-width: 600px) {
        .newsletter-form {
          flex-direction: column;
        }

        .newsletter-section {
          padding: 1.5rem;
        }

        .newsletter-content h2 {
          font-size: 1.4rem;
        }
      }

      .features-section {
        background: #f8f8f8;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1.5rem;
        width: 100%;
        max-width: 1200px;
        margin: 2rem auto 0;
      }

      .feature-card {
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s;
      }

      .feature-card:hover {
        transform: translateY(-5px);
      }

      .feature-icon {
        font-size: 2.5rem;
        margin-bottom: 0.75rem;
      }

      .feature-card h3 {
        font-size: 1rem;
        color: #1d63c1;
        margin: 0 0 0.5rem;
      }

      .feature-card p {
        font-size: 0.85rem;
        color: #666;
        margin: 0;
      }

      @media (max-width: 900px) {
        .features-section {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (max-width: 500px) {
        .features-section {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export default class HomeComponent implements AfterViewInit, OnDestroy {
  private marcasService = inject(MarcasService);
  marcas = this.marcasService.marcas;
  currentIndex = 0;
  visibleCount = 4;
  bannerIndex = 0;

  @ViewChildren('revealElement') revealElements!: QueryList<ElementRef>;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  emailSuscrito = '';
  mensajeSuscrito = signal('');

  private autoScrollInterval: any;

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.revealAll(), 100);
      setTimeout(() => this.revealAll(), 300);
      setTimeout(() => this.revealAll(), 500);
      
      this.autoScrollInterval = setInterval(() => {
        this.next();
      }, 3000);
    }
  }

  ngOnDestroy() {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
    }
  }

  private revealAll() {
    if (!this.revealElements?.length) return;
    this.revealElements.forEach((el) => {
      if (el?.nativeElement) {
        el.nativeElement.classList.add('reveal-active');
      }
    });
  }

  prevBanner() {
    // Por ahora solo hay un banner, aquí iría la lógica cuando hayan más
  }

  nextBanner() {
    // Por ahora solo hay un banner, aquí iría la lógica cuando hayan más
  }

  suscribirse() {
    if (this.emailSuscrito && this.emailSuscrito.includes('@')) {
      this.mensajeSuscrito.set('¡Gracias por suscribirte!');
      this.emailSuscrito = '';
      setTimeout(() => this.mensajeSuscrito.set(''), 3000);
    } else {
      this.mensajeSuscrito.set('Por favor ingresa un correo válido');
      setTimeout(() => this.mensajeSuscrito.set(''), 3000);
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else {
      this.currentIndex = this.marcas().length - 1;
    }
  }

  next() {
    if (this.currentIndex < this.marcas().length - 1) {
      this.currentIndex++;
    } else {
      this.currentIndex = 0;
    }
  }

  pauseAutoScroll() {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
  }

  resumeAutoScroll() {
    if (!this.autoScrollInterval && isPlatformBrowser(this.platformId)) {
      this.autoScrollInterval = setInterval(() => {
        this.next();
      }, 3000);
    }
  }
}
