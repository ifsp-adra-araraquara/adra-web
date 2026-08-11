import { Component, signal } from '@angular/core';
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
  email = '';
  senha = 'MudarNoPrimeiroAcesso@2026';
  carregando = signal(false);
  erro = signal<string | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  entrar(): void {
    if (!this.email || !this.senha) {
      this.erro.set('Preencha e-mail e senha.');
      return;
    }

    this.erro.set(null);
    this.carregando.set(true);

    this.authService.login(this.email, this.senha).subscribe({
      next: () => {
        this.carregando.set(false);
        this.router.navigate(['home']);
      },
      error: (err) => {
        this.carregando.set(false);
        this.erro.set(
          err.status === 401
            ? 'E-mail ou senha inválidos.'
            : 'Não foi possível entrar. Tente novamente.'
        );
      }
    });
  }
}