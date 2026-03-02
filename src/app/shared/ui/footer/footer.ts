import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VisitorCounterService } from '../../data-access/visitor-counter.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  visitorService = inject(VisitorCounterService);
}
