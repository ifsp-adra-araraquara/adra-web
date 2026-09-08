import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';
import { BrandLogo } from '../../../../shared/components/brand-logo/brand-logo';
import { supabase } from '../../../../core/supabase.client';

@Component({
  selector: 'app-redefinir-senha',
  standalone: true,
  imports: [FormsModule, RouterLink, BrandLogo],
  templateUrl: './redefinir-senha.html',
  styleUrl: './redefinir-senha.css'
})
export class RedefinirSenha implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  linkValido = signal<boolean | null>(null); // null = ainda verificando
  novaSenha = '';
  confirmarSenha = '';
  erro = signal<string | null>(null);
  carregando = signal(false);
  concluido = signal(false);

  async ngOnInit(): Promise<void> {
    const { data } = await supabase.auth.getSession();
    this.linkValido.set(!!data.session);
  }

  private validarPolitica(senha: string): string | null {
    if (senha.length < 8) return 'A senha precisa ter no minimo 8 caracteres.';
    if (!/[A-Za-z]/.test(senha)) return 'A senha precisa ter ao menos uma letra.';
    if (!/[0-9]/.test(senha)) return 'A senha precisa ter ao menos um numero.';
    return null;
  }

  async redefinir(): Promise<void> {
    this.erro.set(null);

    const erroPolitica = this.validarPolitica(this.novaSenha);
    if (erroPolitica) {
      this.erro.set(erroPolitica);
      return;
    }
    if (this.novaSenha !== this.confirmarSenha) {
      this.erro.set('As senhas nao coincidem.');
      return;
    }

    this.carregando.set(true);
    try {
      await this.auth.redefinirSenha(this.novaSenha);
      this.concluido.set(true);
      setTimeout(() => this.router.navigate(['/login']), 2500);
    } catch (e) {
      this.erro.set((e as Error).message);
    } finally {
      this.carregando.set(false);
    }
  }
}