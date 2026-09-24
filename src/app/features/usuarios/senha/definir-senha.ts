import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuarioService } from '../../../core/usuario.service';
import { Input } from '../../../shared/components/input/input';
import { Button } from '../../../shared/components/button/button';
import { SenhaForca } from '../../../shared/components/senha-forca/senha-forca';

const SENHA_PATTERN = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

/** Provisorio: sai quando o convite da US-02 e a listagem da US-05 entrarem. */
@Component({
  selector: 'app-definir-senha',
  imports: [ReactiveFormsModule, Input, Button, SenhaForca],
  templateUrl: './definir-senha.html',
  styleUrl: './definir-senha.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DefinirSenha {
  private usuarioService = inject(UsuarioService);
  private fb = inject(FormBuilder);

  salvando = signal(false);
  sucesso = signal<string | null>(null);
  erro = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    novaSenha: ['', [Validators.required, Validators.pattern(SENHA_PATTERN)]]
  });

  protected erroEmail = computed(() =>
    this.form.controls.email.touched && this.form.controls.email.invalid
      ? 'Informe um e-mail válido.'
      : null
  );

  protected erroSenha = computed(() =>
    this.form.controls.novaSenha.touched && this.form.controls.novaSenha.invalid
      ? 'Mínimo 8 caracteres, com letra e número.'
      : null
  );

  definir(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    this.sucesso.set(null);
    this.erro.set(null);

    const email = this.form.getRawValue().email;

    this.usuarioService.definirSenha(this.form.getRawValue()).subscribe({
      next: () => {
        this.sucesso.set(`Senha definida para ${email}. Repasse-a e peca que seja trocada.`);
        this.form.reset();
        this.salvando.set(false);
      },
      error: (resposta: HttpErrorResponse) => {
        this.erro.set(resposta.error?.mensagem ?? 'Nao foi possivel definir a senha.');
        this.salvando.set(false);
      }
    });
  }
}
