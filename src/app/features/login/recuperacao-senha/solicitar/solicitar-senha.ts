import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';
import { BrandLogo } from '../../../../shared/components/brand-logo/brand-logo';

@Component({
  selector: 'app-solicitar-senha',
  standalone: true,
  imports: [FormsModule, RouterLink, BrandLogo],
  templateUrl: './solicitar-senha.html',
  styleUrl: './solicitar-senha.css'
})
export class SolicitarSenha {
  private auth = inject(AuthService);

  email = '';
  enviado = signal(false);
  erro = signal<string | null>(null);
  carregando = signal(false);

  async solicitar(): Promise<void> {
    if (!this.email) {
      this.erro.set('Informe seu e-mail institucional.');
      return;
    }

    this.erro.set(null);
    this.carregando.set(true);
    try {
      await this.auth.solicitarRecuperacaoSenha(this.email);
      this.enviado.set(true);
    } catch (e) {
      this.erro.set((e as Error).message);
    } finally {
      this.carregando.set(false);
    }
  }
}