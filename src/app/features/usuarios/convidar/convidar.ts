import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UsuarioService } from '../../../core/usuario.service';
import { Role } from '../../../shared/enum/role.enum';
import { PERFIL_OPTIONS } from '../../../shared/enum/role-labels';
import { mensagemErro } from '../../../shared/utils/erro-http.util';
import { BrandLogo } from '../../../shared/components/brand-logo/brand-logo';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Input } from '../../../shared/components/input/input';
import { Button } from '../../../shared/components/button/button';

@Component({
  selector: 'app-convidar',
  standalone: true,
  imports: [FormsModule, RouterLink, BrandLogo, Select, Input, Button],
  templateUrl: './convidar.html'
})
export class Convidar {
  private usuarioService = inject(UsuarioService);

  nomeCompleto = '';
  email = '';
  cargoFuncao = '';
  nivelPermissao: Role | null = null;
  enviado = signal(false);
  erro = signal<string | null>(null);
  carregando = signal(false);

  nivelPermissaoOptions: SelectOption<Role>[] = PERFIL_OPTIONS;

  async convidar(): Promise<void> {
    if (!this.nomeCompleto || !this.email || !this.nivelPermissao) {
      this.erro.set('Preencha nome, e-mail e nível de permissão.');
      return;
    }

    this.erro.set(null);
    this.carregando.set(true);
    try {
      await firstValueFrom(this.usuarioService.cadastrar({
        nomeCompleto: this.nomeCompleto,
        email: this.email,
        cargoFuncao: this.cargoFuncao || null,
        nivelPermissao: this.nivelPermissao,
        telefone: null
      }));
      this.enviado.set(true);
    } catch (erro) {
      this.erro.set(mensagemErro(erro as HttpErrorResponse, 'Não foi possível cadastrar o usuário. Verifique os dados ou tente novamente.'));
    } finally {
      this.carregando.set(false);
    }
  }
}