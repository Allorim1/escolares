import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../shared/data-access/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private authService = inject(AuthService);
  private router = inject(Router);

  username = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  loading = signal(false);
  error = this.authService.registerError;
  success = this.authService.registerSuccess;

  constructor() {
    this.authService.registerError.set(null);
    this.authService.registerSuccess.set(false);

    effect(() => {
      if (this.authService.registerSuccess()) {
        this.loading.set(false);
        setTimeout(() => {
          this.authService.registerSuccess.set(false);
          this.router.navigate(['/login']);
        }, 1500);
      }
    });

    effect(() => {
      if (this.authService.registerError()) {
        this.loading.set(false);
      }
    });
  }

  onSubmit() {
    this.authService.registerError.set(null);
    this.authService.registerSuccess.set(false);

    const user = this.username();
    const mail = this.email();
    const pass = this.password();
    const confirm = this.confirmPassword();

    if (!user || !mail || !pass || !confirm) {
      this.authService.registerError.set('Todos los campos son obligatorios');
      return;
    }

    if (pass !== confirm) {
      this.authService.registerError.set('Las contraseñas no coinciden');
      return;
    }

    if (pass.length < 6) {
      this.authService.registerError.set('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    this.loading.set(true);
    this.authService.register(user, mail, pass);
  }
}
