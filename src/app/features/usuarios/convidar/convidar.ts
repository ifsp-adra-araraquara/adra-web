import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { BrandLogo } from '../../../shared/components/brand-logo/brand-logo';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Input } from '../../../shared/components/input/input';
import { Button } from '../../../shared/components/button/button';

@Component({
  selector: 'app-convidar',
  standalone: true,
  imports: [FormsModule, RouterLink, BrandLogo, Select, Input, Button],
  templateUrl: './convidar.html',
  styleUrl: './convidar.css'
})
export class Convidar {
  private http = inject(HttpClient);

  nomeCompleto = '';
  email = '';
  cargoFuncao = '';
  nivelPermissaoId: number | null = null;
  enviado = signal(false);
  erro = signal<string | null>(null);
  carregando = signal(false);

  nivelPermissaoOptions: SelectOption<number>[] = [
    { value: 1, label: 'Administrador' },
    { value: 2, label: 'Coordenador' },
    { value: 3, label: 'Oficineiro' },
    { value: 4, label: 'Sociopedagógico' },
    { value: 5, label: 'Profissional de Saúde' },
    { value: 6, label: 'Financeiro' }
  ];

  async convidar(): Promise<void> {
    if (!this.nomeCompleto || !this.email || !this.nivelPermissaoId) {
      this.erro.set('Preencha nome, e-mail e nível de permissão.');
      return;
    }

    this.erro.set(null);
    this.carregando.set(true);
    try {
      await this.http.post(`${environment.apiUrl}/api/usuarios`, {
        nomeCompleto: this.nomeCompleto,
        email: this.email,
        cargoFuncao: this.cargoFuncao || null,
        nivelPermissaoId: this.nivelPermissaoId
      }).toPromise();
      this.enviado.set(true);
    } catch {
      this.erro.set('Não foi possível cadastrar o usuário. Verifique os dados ou tente novamente.');
    } finally {
      this.carregando.set(false);
    }
  }
}