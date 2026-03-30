import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './shared/ui/header/header';
import { Footer } from './shared/ui/footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit {
  protected readonly title = signal('escolares');
  showMaintenanceModal = signal(true);

  ngOnInit() {
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      this.dismissModal();
    }, 3000);
  }

  dismissModal() {
    this.showMaintenanceModal.set(false);
  }
}
