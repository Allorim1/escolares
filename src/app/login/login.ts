import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../shared/data-access/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  authService = inject(AuthService);

  username = signal('');
  password = signal('');

  get error() {
    return this.authService.loginError;
  }

  onSubmit() {
    this.authService.loginError.set(null);

    const user = this.username();
    const pass = this.password();

    if (!user || !pass) {
      this.authService.loginError.set('Por favor ingresa usuario y contraseña');
      return;
    }

    this.authService.login(user, pass);
  }
}
