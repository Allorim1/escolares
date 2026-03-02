import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../shared/data-access/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  username = signal('');
  password = signal('');
  error = signal('');
  loading = signal(false);

  onSubmit() {
    this.error.set('');
    this.loading.set(true);

    setTimeout(() => {
      const success = this.authService.login(this.username(), this.password());
      this.loading.set(false);

      if (success) {
        this.router.navigate(['/admin']);
      } else {
        this.error.set('Credenciales inválidas');
      }
    }, 500);
  }
}
