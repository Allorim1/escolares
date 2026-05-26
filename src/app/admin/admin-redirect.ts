import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../shared/data-access/auth.service';

@Component({
  selector: 'app-admin-redirect',
  template: '',
  standalone: true
})
export class AdminRedirectComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit() {
    const user = this.authService.user();
    if (user?.rol === 'repartidor') {
      this.router.navigate(['repartidor'], { replaceUrl: true });
    } else {
      this.router.navigate(['inicio'], { replaceUrl: true });
    }
  }
}