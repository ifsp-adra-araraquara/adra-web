import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';
import { BrandLogo } from '../../../../shared/components/brand-logo/brand-logo';
import { SenhaForca } from '../../../../shared/components/senha-forca/senha-forca';
import { Input } from '../../../../shared/components/input/input';
import { Button } from '../../../../shared/components/button/button';
import { validarPoliticaSenha } from '../../../../shared/utils/senha-forca';
import { supabase } from '../../../../core/supabase.client';

@Component({
  selector: 'app-redefinir-senha',
  standalone: true,
  imports: [FormsModule, RouterLink, BrandLogo, SenhaForca, Input, Button],
  templateUrl: './redefinir-senha.html'
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

  async redefinir(): Promise<void> {
    this.erro.set(null);

    const erroPolitica = validarPoliticaSenha(this.novaSenha);
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
