import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  senha = '';
  erro = signal<string | null>(null);
  carregando = signal(false);

  async entrar(): Promise<void> {
    if (!this.email || !this.senha) {
      return;
    }

    this.erro.set(null);
    this.carregando.set(true);
    try {
      await this.authService.login(this.email, this.senha);
      this.router.navigate(['home']);
    } catch {
      this.erro.set('Nao foi possivel entrar. Verifique suas credenciais.');
    } finally {
      this.carregando.set(false);
    }
  }
}
