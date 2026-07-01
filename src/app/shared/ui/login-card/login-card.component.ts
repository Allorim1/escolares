import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-login-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-card">
      <div class="card-header">
        <h2>INICIA SESIÓN</h2>
        <p class="subtitle">Ingresa tus datos</p>
      </div>

      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
        <div class="phone-input-group">
          <div class="country-select">
            <span class="flag">🇻🇪</span>
            <span class="prefix">+58</span>
            <span class="arrow">▼</span>
          </div>

          <select formControlName="operator" class="operator-select">
            <option value="0412">0412</option>
            <option value="0414">0414</option>
            <option value="0424">0424</option>
            <option value="0416">0416</option>
            <option value="0426">0426</option>
          </select>

          <input 
            type="text" 
            formControlName="phoneNumber" 
            placeholder="Ingresa tu número c..." 
            class="phone-input"
            maxlength="7"
          />

          <button 
            type="submit" 
            [disabled]="loginForm.invalid" 
            class="submit-btn">
            Iniciar sesión
          </button>
        </div>
      </form>

      <div class="card-footer">
        <a href="#" class="forgot-password">¿Olvidaste la contraseña?</a>
        <p class="register-text">
          ¿No tienes cuenta? <a href="#" class="register-link">Regístrate aquí</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .login-card {
      background-color: #f8f9ff;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      width: 100%;
      border: 3px solid #1d63c1;
      font-family: 'Segoe UI', Roboto, sans-serif;
    }

    .card-header h2 {
      color: #002855;
      font-size: 18px;
      font-weight: 700;
      margin: 0 0 4px 0;
    }

    .subtitle {
      color: #757575;
      font-size: 13px;
      margin: 0 0 20px 0;
    }

    .phone-input-group {
      display: flex;
      align-items: center;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      background-color: #fff;
    }

    .country-select {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 12px;
      background-color: #fff;
      border-right: 1px solid #e0e0e0;
      font-size: 14px;
      color: #333;
    }

    .arrow {
      font-size: 9px;
      color: #888;
    }

    .operator-select {
      border: none;
      border-right: 1px solid #e0e0e0;
      padding: 10px;
      background-color: #fff;
      font-size: 14px;
      color: #333;
      outline: none;
      cursor: pointer;
    }

    .phone-input {
      border: none;
      padding: 10px 12px;
      flex-grow: 1;
      font-size: 14px;
      outline: none;
      color: #333;
    }

    .phone-input::placeholder {
      color: #b0b0b0;
    }

    .submit-btn {
      border: none;
      background-color: #e0e0e0;
      color: #a0a0a0;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      cursor: not-allowed;
      white-space: nowrap;
      transition: all 0.2s ease;
    }

    .submit-btn:not([disabled]) {
      background-color: #002855;
      color: #ffffff;
      cursor: pointer;
    }

    .submit-btn:not([disabled]):hover {
      background-color: #001f42;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 16px;
      font-size: 12px;
    }

    .forgot-password {
      color: #2b6cb0;
      text-decoration: none;
    }

    .forgot-password:hover {
      text-decoration: underline;
    }

    .register-text {
      color: #333;
      margin: 0;
    }

    .register-link {
      color: #002855;
      font-weight: 700;
      text-decoration: none;
    }

    .register-link:hover {
      text-decoration: underline;
    }

    /* Compact mode for small screens */
    @media (max-width: 280px) {
      .login-card {
        padding: 16px;
        border: 2px solid #1d63c1;
      }

      .card-header h2 {
        font-size: 16px;
      }

      .subtitle {
        font-size: 12px;
        margin: 0 0 16px 0;
      }

      .country-select {
        padding: 8px 10px;
        font-size: 13px;
        gap: 4px;
      }

      .operator-select {
        padding: 8px 6px;
        font-size: 13px;
      }

      .phone-input {
        padding: 8px 10px;
        font-size: 13px;
      }

      .submit-btn {
        padding: 8px 12px;
        font-size: 13px;
      }

      .card-footer {
        flex-direction: column;
        gap: 8px;
        font-size: 11px;
      }
    }
  `]
})
export class LoginCardComponent {
  loginForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.loginForm = this.fb.group({
      operator: ['0412', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{7}$/)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      console.log('Login data:', this.loginForm.value);
    }
  }
}