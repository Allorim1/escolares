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
  rif = signal('');
  rifTipo = signal('V');
  telefono = signal('');
  telefonoPrefijo = signal('0412');
  direccion = signal('');
  tipoPersona = signal<'natural' | 'juridica'>('natural');

  rifTipos = ['V', 'E', 'J', 'G', 'P'];
  telefonoPrefijos = ['0412', '0414', '0424', '0416', '0426', '0434', '0251'];
  loading = signal(false);
  error = this.authService.registerError;
  success = this.authService.registerSuccess;

  showCamera = signal(false);
  cameraType = signal<'frente' | 'atras'>('frente');
  frenteFoto = signal<string>('');
  atrasFoto = signal<string>('');
  videoElement: HTMLVideoElement | null = null;
  cameraStream: MediaStream | null = null;
  canvasElement: HTMLCanvasElement | null = null;

  whatsappNumber = '584241234567';

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

  abrirCameraFrente() {
    this.cameraType.set('frente');
    this.showCamera.set(true);
    setTimeout(() => this.iniciarCamera(), 100);
  }

  abrirCameraAtras() {
    this.cameraType.set('atras');
    this.showCamera.set(true);
    setTimeout(() => this.iniciarCamera(), 100);
  }

  async iniciarCamera() {
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      this.videoElement = document.getElementById('cameraVideo') as HTMLVideoElement;
      if (this.videoElement) {
        this.videoElement.srcObject = this.cameraStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('No se pudo acceder a la cámara');
    }
  }

  capturarFoto() {
    if (!this.videoElement) return;

    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(this.videoElement, 0, 0);
      const foto = canvas.toDataURL('image/jpeg', 0.8);

      if (this.cameraType() === 'frente') {
        this.frenteFoto.set(foto);
      } else {
        this.atrasFoto.set(foto);
      }

      this.cerrarCamera();
    }
  }

  cerrarCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    this.showCamera.set(false);
  }

  eliminarFoto(tipo: 'frente' | 'atras') {
    if (tipo === 'frente') {
      this.frenteFoto.set('');
    } else {
      this.atrasFoto.set('');
    }
  }

  enviarWhatsApp() {
    if (!this.frenteFoto() && !this.atrasFoto()) {
      alert('Toma al menos una foto de tu cédula o RIF');
      return;
    }

    const mensaje = `Hola, me acabo de registrar en Escolares y te envío las fotos de mi identificación.\n\n` +
      `Usuario: ${this.username()}\n` +
      `Email: ${this.email()}\n` +
      `Tipo: ${this.tipoPersona()}\n` +
      `Cédula/RIF: ${this.rifTipo()}-${this.rif()}`;

    const url = `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  onSubmit() {
    this.authService.registerError.set(null);
    this.authService.registerSuccess.set(false);

    const user = this.username();
    const mail = this.email();
    const pass = this.password();
    const confirm = this.confirmPassword();
    const rifValue = this.rif();
    const rifTipoValue = this.rifTipo();
    const telefonoValue = this.telefono();
    const telefonoPrefijoValue = this.telefonoPrefijo();
    const direccionValue = this.direccion();
    const tipoPersonaValue = this.tipoPersona();

    const rifCompleto = rifTipoValue + '-' + rifValue;
    const telefonoCompleto = telefonoPrefijoValue + '-' + telefonoValue;

    if (!user || !mail || !pass || !confirm || !rifValue || !telefonoValue || !direccionValue) {
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
    this.authService.register(user, mail, pass, {
      rif: rifCompleto,
      telefono: telefonoCompleto,
      direccion: direccionValue,
      tipoPersona: tipoPersonaValue,
    });
  }
}
