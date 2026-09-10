import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit';

let scriptLoadingPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve) => {
    window.onTurnstileLoad = () => resolve();
    if (document.getElementById(SCRIPT_ID)) return;
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

@Component({
  selector: 'app-turnstile',
  standalone: true,
  template: `<div #container class="turnstile-container"></div>`,
})
export class Turnstile implements OnInit, OnDestroy {
  @Input() theme: 'light' | 'dark' | 'auto' = 'auto';
  @Output() tokenChange = new EventEmitter<string>();

  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLElement>;

  private platformId = inject(PLATFORM_ID);
  private widgetId: string | undefined;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    loadTurnstileScript().then(() => {
      if (!window.turnstile) return;
      this.widgetId = window.turnstile.render(this.containerRef.nativeElement, {
        sitekey: environment.TURNSTILE_PUBLIC,
        theme: this.theme,
        callback: (token: string) => this.tokenChange.emit(token),
        'expired-callback': () => this.tokenChange.emit(''),
        'error-callback': () => this.tokenChange.emit(''),
      });
    });
  }

  reset(): void {
    if (isPlatformBrowser(this.platformId) && window.turnstile && this.widgetId) {
      window.turnstile.reset(this.widgetId);
    }
    this.tokenChange.emit('');
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId) && window.turnstile && this.widgetId) {
      window.turnstile.remove(this.widgetId);
    }
  }
}
