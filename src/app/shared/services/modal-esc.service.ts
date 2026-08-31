import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ModalEscService {
  readonly escPressed$ = new Subject<void>();

  notify() {
    this.escPressed$.next();
  }
}
