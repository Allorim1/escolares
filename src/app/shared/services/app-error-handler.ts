import { ErrorHandler, Injectable } from '@angular/core';

/**
 * Cuando una petición HTTP se cancela (el usuario navega a otra pantalla mientras algo
 * seguía cargando, un componente se destruye con una suscripción pendiente, etc.), el
 * backend de HttpClient basado en `fetch()` (`withFetch()` en app.config.ts) aborta el
 * `fetch` en curso. Ese `AbortError` a veces llega como un unhandled promise rejection en
 * vez de resolverse como una simple cancelación de la suscripción, y
 * `provideBrowserGlobalErrorListeners()` lo reenvía tal cual al ErrorHandler global. No es
 * un error real -es una cancelación normal-, así que no tiene sentido imprimirlo en consola.
 */
function esAbortError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof DOMException && error.name === 'AbortError') return true;

  const err = error as { name?: string; message?: string; error?: unknown };
  if (err.name === 'AbortError') return true;
  if (typeof err.message === 'string' && /aborted/i.test(err.message)) return true;
  // HttpErrorResponse suele envolver la causa original en `.error`.
  if (err.error && esAbortError(err.error)) return true;

  return false;
}

@Injectable()
export class AppErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    if (esAbortError(error)) return;
    console.error(error);
  }
}
