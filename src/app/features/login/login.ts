import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AuthShell } from '../../shared/components/auth-shell/auth-shell';
import { Input } from '../../shared/components/input/input';
import { Button } from '../../shared/components/button/button';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthShell, Input, Button],
  templateUrl: './login.html'
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
    } catch {
      this.erro.set('Não foi possível entrar. Verifique suas credenciais.');
    } finally {
      this.carregando.set(false);
    }
  }
}