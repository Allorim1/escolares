import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading',
  standalone: true,
  template: `
    <div class="loading-overlay" [class.fullscreen]="fullscreen" [class.inline]="!fullscreen">
      <div class="spinner" [class.small]="size === 'small'" [class.large]="size === 'large'">
        <div class="circle"></div>
        <div class="circle"></div>
        <div class="circle"></div>
      </div>
      @if (message) {
        <p class="loading-message">{{ message }}</p>
      }
    </div>
  `,
  styles: [
    `
      .loading-overlay {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        padding: 2rem;
      }

      .loading-overlay.fullscreen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(255, 255, 255, 0.95);
        z-index: 9999;
      }

      .loading-overlay.inline {
        min-height: 200px;
      }

      .spinner {
        display: flex;
        gap: 8px;
      }

      .circle {
        width: 12px;
        height: 12px;
        background: #1d63c1;
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out both;
      }

      .circle:nth-child(1) {
        animation-delay: -0.32s;
      }
      .circle:nth-child(2) {
        animation-delay: -0.16s;
      }

      .spinner.small .circle {
        width: 8px;
        height: 8px;
      }

      .spinner.large .circle {
        width: 16px;
        height: 16px;
      }

      @keyframes bounce {
        0%,
        80%,
        100% {
          transform: scale(0);
        }
        40% {
          transform: scale(1);
        }
      }

      .loading-message {
        color: #666;
        font-size: 0.9rem;
        margin: 0;
      }
    `,
  ],
})
export class LoadingComponent {
  @Input() message = '';
  @Input() fullscreen = false;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
}
