import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PreCadastroService } from '../../core/pre-cadastro.service';
import { Button } from '../../shared/components/button/button';
import { Input } from '../../shared/components/input/input';
import { mensagemErro } from '../../shared/utils/erro-http.util';

/**
 * Link público (sem login) para a família de um novo assistido ou
 * pretendente preencher. Grava num rascunho isolado — a equipe revisa e
 * confirma o cadastro de verdade depois (ver "Pré-cadastros").
 */
@Component({
  selector: 'app-pre-cadastro',
  imports: [ReactiveFormsModule, Button, Input],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pc-pagina">
      <div class="pc-cartao">
        @if (enviado()) {
          <div class="pc-sucesso" role="status">
            <h1>Recebemos seu pré-cadastro!</h1>
            <p>Nossa equipe vai entrar em contato em breve. Obrigado.</p>
          </div>
        } @else {
          <h1>Pré-cadastro — ADRA</h1>
          <p class="pc-intro">
            Preencha os dados da criança, adolescente ou pretendente. Nossa equipe revisa e entra em contato
            para dar continuidade ao cadastro.
          </p>

          @if (erro()) {
            <div class="notice notice-error" role="alert">{{ erro() }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="enviar()" class="pc-form">
            <app-input
              label="Nome completo (criança/adolescente)"
              formControlName="nomeCompleto"
              [required]="true"
              [errorMessage]="erroCampo('nomeCompleto')"
            />
            <app-input label="Data de nascimento" type="date" formControlName="dataNascimento" />
            <app-input
              label="Nome do responsável"
              formControlName="responsavelNome"
              [required]="true"
              [errorMessage]="erroCampo('responsavelNome')"
            />
            <app-input label="Telefone do responsável" mask="telefone" formControlName="responsavelTelefone" />
            <app-input label="Endereço" formControlName="endereco" />

            <div class="field">
              <label for="pc-observacao">Observação (opcional)</label>
              <textarea id="pc-observacao" rows="3" formControlName="observacao"></textarea>
            </div>

            <!-- Honeypot: invisível para gente, só robô preenche. -->
            <div class="pc-honeypot" aria-hidden="true">
              <label for="pc-site">Não preencha este campo</label>
              <input id="pc-site" type="text" formControlName="site" tabindex="-1" autocomplete="off" />
            </div>

            <app-button [loading]="enviando()" type="submit">Enviar pré-cadastro</app-button>
          </form>
        }
      </div>
    </div>
  `,
  styles: `
    .pc-pagina {
      min-height: 100dvh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 24px 16px;
      background: var(--gray-50, #f6f7f8);
    }
    .pc-cartao {
      width: 100%;
      max-width: 520px;
      background: #fff;
      border: 1px solid var(--gray-100, #ececee);
      border-radius: var(--radius-lg, 16px);
      box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.06));
      padding: 24px;
      margin-top: 24px;
    }
    h1 { font-size: 22px; margin: 0 0 8px; }
    .pc-intro { color: var(--gray-600, #4d5459); margin: 0 0 20px; font-size: 14px; }
    .pc-form { display: flex; flex-direction: column; gap: 14px; }
    .pc-honeypot { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
    .pc-sucesso { text-align: center; padding: 24px 0; }
    @media (min-width: 720px) {
      .pc-cartao { padding: 32px; margin-top: 48px; }
    }
  `,
})
export class PreCadastro {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PreCadastroService);

  readonly enviando = signal(false);
  readonly enviado = signal(false);
  readonly erro = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nomeCompleto: ['', [Validators.required, Validators.maxLength(180)]],
    dataNascimento: [''],
    responsavelNome: ['', [Validators.required, Validators.maxLength(180)]],
    responsavelTelefone: [''],
    endereco: [''],
    observacao: [''],
    site: [''],
  });

  erroCampo(campo: 'nomeCompleto' | 'responsavelNome'): string | null {
    const controle = this.form.controls[campo];
    return controle.touched && controle.errors?.['required'] ? 'Obrigatório' : null;
  }

  async enviar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.erro.set(null);
    this.enviando.set(true);
    try {
      const valor = this.form.getRawValue();
      await this.service.registrarPublico({
        nomeCompleto: valor.nomeCompleto.trim(),
        dataNascimento: valor.dataNascimento || null,
        responsavelNome: valor.responsavelNome.trim(),
        responsavelTelefone: valor.responsavelTelefone || null,
        endereco: valor.endereco || null,
        observacao: valor.observacao || null,
        site: valor.site,
      });
      this.enviado.set(true);
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível enviar. Tente novamente.'));
    } finally {
      this.enviando.set(false);
    }
  }
}
