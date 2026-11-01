import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { EscolhaSimNao } from '../../../shared/components/escolha-sim-nao/escolha-sim-nao';
import { Input } from '../../../shared/components/input/input';
import { FormularioPreCadastro, MENSAGEM_TELEFONE, mensagemDoCampo } from '../pre-cadastro-form.util';

type Campo = keyof FormularioPreCadastro['controls']['saude']['controls'];

@Component({
  selector: 'app-etapa-saude-autorizacoes',
  imports: [ReactiveFormsModule, Input, EscolhaSimNao],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './etapas.css',
  template: `
    <div [formGroup]="grupo()">
      <app-escolha-sim-nao
        formControlName="possuiProblema"
        pergunta="A criança tem algum problema de saúde?"
        [erro]="erro('possuiProblema')"
      />
      @if (grupo().controls.possuiProblema.value) {
        <div class="field">
          <label for="pc-saude-descricao">Qual problema de saúde? <span class="obrigatorio" aria-hidden="true">*</span></label>
          <textarea
            id="pc-saude-descricao"
            rows="3"
            maxlength="1000"
            formControlName="descricao"
            [attr.aria-invalid]="erro('descricao') ? 'true' : null"
            [attr.aria-describedby]="erro('descricao') ? 'pc-saude-descricao-erro' : null"
          ></textarea>
          @if (erro('descricao'); as mensagem) {
            <p class="app-input-error" id="pc-saude-descricao-erro" role="alert">{{ mensagem }}</p>
          }
        </div>
      }

      <fieldset class="bloco">
        <legend>Em caso de adoecimento na ADRA</legend>
        <p class="dica">Quem devemos acionar se não for possível falar com os responsáveis?</p>
        <div class="form-row">
          <app-input label="Nome" formControlName="contatoEmergenciaNome" [required]="true" [maxLength]="180" [errorMessage]="erro('contatoEmergenciaNome')" />
          <app-input label="Telefone" mask="telefone" formControlName="contatoEmergenciaTelefone" [required]="true" [errorMessage]="erro('contatoEmergenciaTelefone', MENSAGEM_TELEFONE)" />
        </div>
      </fieldset>

      <app-escolha-sim-nao
        formControlName="eventosPasseios"
        pergunta="Você autoriza a criança a participar de eventos, passeios e viagens?"
        [erro]="erro('eventosPasseios')"
      />
      <app-escolha-sim-nao
        formControlName="irEmboraSozinho"
        pergunta="Você autoriza a criança a ir embora sozinha?"
        [erro]="erro('irEmboraSozinho')"
      />
      @if (grupo().controls.irEmboraSozinho.value === false) {
        <div class="field">
          <label for="pc-quem-busca">Quem virá buscar a criança? <span class="obrigatorio" aria-hidden="true">*</span></label>
          <textarea
            id="pc-quem-busca"
            rows="2"
            maxlength="500"
            placeholder="Nome e parentesco de quem pode buscar"
            formControlName="quemBusca"
            [attr.aria-invalid]="erro('quemBusca') ? 'true' : null"
            [attr.aria-describedby]="erro('quemBusca') ? 'pc-quem-busca-erro' : null"
          ></textarea>
          @if (erro('quemBusca'); as mensagem) {
            <p class="app-input-error" id="pc-quem-busca-erro" role="alert">{{ mensagem }}</p>
          }
        </div>
      }
    </div>
  `,
})
export class EtapaSaudeAutorizacoes {
  grupo = input.required<FormularioPreCadastro['controls']['saude']>();
  tentativa = input(0);

  protected readonly MENSAGEM_TELEFONE = MENSAGEM_TELEFONE;

  protected erro(campo: Campo, formato?: string): string | null {
    return mensagemDoCampo(this.grupo().controls[campo], formato);
  }
}
