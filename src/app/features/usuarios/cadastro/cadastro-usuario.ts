import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuarioService } from '../../../core/usuario.service';
import { Role } from '../../../shared/enum/role.enum';
import { PERFIL_OPTIONS, ROLE_LABELS } from '../../../shared/enum/role-labels';
import { cpfValidator } from '../../../shared/validators/cpf.validator';
import { errosPorCampo } from '../../../shared/utils/erro-http.util';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Input } from '../../../shared/components/input/input';
import { Button } from '../../../shared/components/button/button';

@Component({
  selector: 'app-cadastro-usuario',
  imports: [ReactiveFormsModule, Select, Input, Button],
  templateUrl: './cadastro-usuario.html',
  styleUrl: './cadastro-usuario.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CadastroUsuario {
  private usuarioService = inject(UsuarioService);
  private fb = inject(FormBuilder);

  labels = ROLE_LABELS;

  perfilOptions: SelectOption<Role>[] = PERFIL_OPTIONS;

  salvando = signal(false);
  sucesso = signal<string | null>(null);
  erro = signal<string | null>(null);
  errosPorCampo = signal<Record<string, string>>({});

  form = this.fb.nonNullable.group({
    nomeCompleto: ['', [Validators.required, Validators.maxLength(180)]],
    email: ['', [Validators.required, Validators.email]],
    cpf: ['', [Validators.required, cpfValidator()]],
    nivelPermissao: [Role.COORD, Validators.required],
    cargoFuncao: [''],
    telefone: ['', Validators.pattern(/^$|^\d{10,11}$/)]
  });

  protected erroNome = () => this.erroDoCampo('nomeCompleto', 'Informe o nome completo.');
  protected erroEmail = () => this.erroDoCampo('email', 'Informe um e-mail válido.');
  protected erroCpf = () => this.erroDoCampo('cpf', 'Informe um CPF válido.');
  protected erroTelefone = () => this.erroDoCampo('telefone', 'DDD + número, 10 ou 11 dígitos.');

  cadastrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    this.limparMensagens();

    this.usuarioService.cadastrar(this.form.getRawValue()).subscribe({
      next: (usuario) => {
        this.sucesso.set(`${usuario.nomeCompleto} cadastrado. Ele recebera um convite para definir a senha.`);
        this.form.reset({ nivelPermissao: Role.COORD });
        this.salvando.set(false);
      },
      error: (resposta: HttpErrorResponse) => {
        this.tratarErro(resposta);
        this.salvando.set(false);
      }
    });
  }

  private erroDoCampo(
    nome: 'nomeCompleto' | 'email' | 'cpf' | 'telefone',
    mensagem: string
  ): string | null {
    if (this.form.controls[nome].touched && this.form.controls[nome].invalid) {
      return mensagem;
    }
    return this.errosPorCampo()[nome] ?? null;
  }

  private tratarErro(resposta: HttpErrorResponse): void {
    const porCampo = errosPorCampo(resposta);

    if (Object.keys(porCampo).length) {
      this.errosPorCampo.set(porCampo);
      return;
    }

    this.erro.set(resposta.error?.mensagem ?? 'Nao foi possivel cadastrar. Tente novamente.');
  }

  private limparMensagens(): void {
    this.sucesso.set(null);
    this.erro.set(null);
    this.errosPorCampo.set({});
  }
}
