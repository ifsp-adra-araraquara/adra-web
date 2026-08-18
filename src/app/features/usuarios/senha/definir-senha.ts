import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuarioService } from '../../../core/usuario.service';

/** Provisorio: sai quando o convite da US-02 e a listagem da US-05 entrarem. */
@Component({
  selector: 'app-definir-senha',
  imports: [ReactiveFormsModule],
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
    novaSenha: ['', [Validators.required, Validators.minLength(8)]]
  });

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
