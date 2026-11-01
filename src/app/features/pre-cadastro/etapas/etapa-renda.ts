import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { EscolhaSimNao } from '../../../shared/components/escolha-sim-nao/escolha-sim-nao';
import { Input } from '../../../shared/components/input/input';
import { PROGRAMA_TRANSFERENCIA_LABELS, ProgramaTransferencia } from '../../../shared/enum/ProgramaTransferencia';
import { FormularioPreCadastro, mensagemDoCampo } from '../pre-cadastro-form.util';

@Component({
  selector: 'app-etapa-renda',
  imports: [ReactiveFormsModule, Input, EscolhaSimNao],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './etapas.css',
  template: `
    <div [formGroup]="grupo()">
      <app-escolha-sim-nao
        formControlName="recebe"
        pergunta="A família recebe algum programa de transferência de renda?"
        [erro]="erro('recebe')"
      />

      @if (grupo().controls.recebe.value) {
        <fieldset class="bloco" [class.campo-invalido]="!!erro('programas')">
          <legend>Qual programa? <span class="obrigatorio" aria-hidden="true">*</span></legend>
          <p class="dica">Pode marcar mais de um. Bolsa Alimentação ou outro: marque "Outro" e escreva o nome.</p>
          <div class="chips">
            @for (programa of programas; track programa.valor) {
              <label class="chip" [class.chip--marcado]="marcado(programa.valor)">
                <input
                  type="checkbox"
                  [checked]="marcado(programa.valor)"
                  [attr.aria-invalid]="erro('programas') ? 'true' : null"
                  (change)="alternar(programa.valor, $any($event.target).checked)"
                />
                {{ programa.label }}
              </label>
            }
          </div>
          @if (erro('programas')) {
            <p class="app-input-error" role="alert">Marque pelo menos um programa.</p>
          }
          @if (marcado(OUTRO)) {
            <app-input label="Qual outro programa?" formControlName="outro" [required]="true" [maxLength]="120" [errorMessage]="erro('outro')" />
          }
        </fieldset>
      }

      <app-input
        label="NIS / CadÚnico (opcional)"
        placeholder="Só os números"
        [maxLength]="11"
        formControlName="nis"
        [errorMessage]="erro('nis', 'O NIS tem 11 dígitos')"
      />
    </div>
  `,
  styles: `
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .chip {
      position: relative; display: inline-flex; align-items: center; min-height: 44px; padding: 8px 14px;
      border: 1.5px solid var(--campo-borda); border-radius: 22px; font-size: 14px; color: var(--gray-800); cursor: pointer;
    }
    .chip input { position: absolute; opacity: 0; inset: 0; margin: 0; cursor: pointer; }
    .chip:has(input:focus-visible) { outline: 3px solid var(--color-brand-ring); outline-offset: 2px; }
    .chip--marcado { border-color: var(--color-brand); background: var(--color-brand-soft); color: var(--color-adra-green-800); font-weight: 500; }
  `,
})
export class EtapaRenda {
  grupo = input.required<FormularioPreCadastro['controls']['renda']>();
  tentativa = input(0);

  protected readonly OUTRO = ProgramaTransferencia.OUTRO;
  protected readonly programas = Object.values(ProgramaTransferencia).map((valor) => ({
    valor,
    label: PROGRAMA_TRANSFERENCIA_LABELS[valor],
  }));

  protected erro(campo: keyof FormularioPreCadastro['controls']['renda']['controls'], formato?: string): string | null {
    return mensagemDoCampo(this.grupo().controls[campo], formato);
  }

  protected marcado(programa: ProgramaTransferencia): boolean {
    return this.grupo().controls.programas.value.includes(programa);
  }

  protected alternar(programa: ProgramaTransferencia, marcar: boolean): void {
    const controle = this.grupo().controls.programas;
    const atuais = controle.value;
    controle.setValue(marcar ? [...atuais, programa] : atuais.filter((p) => p !== programa));
    controle.markAsTouched();
  }
}
