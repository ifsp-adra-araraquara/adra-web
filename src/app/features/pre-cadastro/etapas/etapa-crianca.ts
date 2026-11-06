import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { EnderecoForm } from '../../../shared/components/endereco-form/endereco-form';
import { Input } from '../../../shared/components/input/input';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { SEXO_LABELS, Sexo } from '../../../shared/enum/Sexo';
import { FormularioPreCadastro, mensagemDoCampo } from '../pre-cadastro-form.util';

@Component({
  selector: 'app-etapa-crianca',
  imports: [ReactiveFormsModule, Input, Select, EnderecoForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [formGroup]="grupo()">
      <app-input
        label="Nome completo do atendido"
        formControlName="nomeCompleto"
        [required]="true"
        [maxLength]="180"
        [errorMessage]="erro('nomeCompleto')"
      />
      <div class="form-row">
        <app-input
          label="Data de nascimento"
          type="date"
          formControlName="dataNascimento"
          [required]="true"
          [errorMessage]="erro('dataNascimento')"
        />
        <app-input
          label="CPF do atendido"
          mask="cpf"
          placeholder="000.000.000-00"
          formControlName="cpf"
          [required]="true"
          [errorMessage]="erro('cpf')"
        />
      </div>
      <div class="field">
        <label for="pc-sexo">Sexo <span class="obrigatorio" aria-hidden="true">*</span></label>
        <app-select
          id="pc-sexo"
          formControlName="sexo"
          placeholder="Selecione"
          [options]="sexoOptions"
          [invalido]="!!erro('sexo')"
          descritoPor="pc-sexo-erro"
        />
        @if (erro('sexo'); as mensagem) {
          <p class="app-input-error" id="pc-sexo-erro" role="alert">{{ mensagem }}</p>
        }
      </div>

      <fieldset class="bloco" [class.campo-invalido]="!!erro('endereco')">
        <legend>Endereço residencial</legend>
        <app-endereco-form formControlName="endereco" [ruaObrigatoria]="true" />
        @if (erro('endereco')) {
          <p class="app-input-error" role="alert">Informe pelo menos a rua.</p>
        }
      </fieldset>
    </div>
  `,
  styles: `
    .obrigatorio { color: var(--red-600); }
    .bloco { border: 0; padding: 0; margin: 8px 0 0; min-width: 0; }
    legend { padding: 0; margin-bottom: 8px; font-size: 14px; font-weight: 600; color: var(--gray-800); }
  `,
})
export class EtapaCrianca {
  grupo = input.required<FormularioPreCadastro['controls']['crianca']>();
  tentativa = input(0);

  protected readonly sexoOptions: SelectOption<Sexo>[] = [Sexo.FEMININO, Sexo.MASCULINO].map((sexo) => ({
    value: sexo,
    label: SEXO_LABELS[sexo],
  }));

  protected erro(campo: keyof FormularioPreCadastro['controls']['crianca']['controls']): string | null {
    return mensagemDoCampo(this.grupo().controls[campo]);
  }
}
