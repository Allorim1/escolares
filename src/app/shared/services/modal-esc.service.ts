import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ModalEscService {
  readonly escPressed = signal<void>(undefined);

  notify() {
    this.escPressed.set(undefined);
  }
}
