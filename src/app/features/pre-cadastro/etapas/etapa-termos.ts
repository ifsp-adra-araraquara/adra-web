import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { EscolhaSimNao } from '../../../shared/components/escolha-sim-nao/escolha-sim-nao';
import { TERMO_FREQUENCIA, TERMO_IMAGEM, TERMO_LGPD } from '../../../shared/utils/termos-inscricao';
import { FormularioPreCadastro, mensagemDoCampo } from '../pre-cadastro-form.util';

@Component({
  selector: 'app-etapa-termos',
  imports: [ReactiveFormsModule, EscolhaSimNao],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [formGroup]="grupo()">
      <p class="intro">
        Esta é a inscrição para as atividades da ADRA. Leva uns 10 minutos. Tenha em mãos o CPF do atendido
        e dos responsáveis.
      </p>

      @for (termo of termos; track termo.campo) {
        <section class="termo" [attr.aria-label]="termo.texto.titulo">
          <h3>{{ termo.texto.titulo }}</h3>
          <details [open]="termo.aberto">
            <summary>Ler o termo completo</summary>
            @for (paragrafo of termo.texto.paragrafos; track $index) {
              <p>{{ paragrafo }}</p>
            }
          </details>
          <app-escolha-sim-nao
            [formControlName]="termo.campo"
            [pergunta]="termo.pergunta"
            rotuloSim="Aceito"
            rotuloNao="Não aceito"
            [erro]="erro(termo.campo)"
          />
        </section>
      }
    </div>
  `,
  styles: `
    .intro { margin: 0 0 20px; font-size: 15px; line-height: 1.55; color: var(--gray-600); }
    .termo { padding: 16px; margin-bottom: 16px; border: 1px solid var(--borda); border-radius: var(--radius); }
    h3 { margin: 0 0 8px; font-size: 15px; font-weight: 600; color: var(--gray-800); }
    details { margin-bottom: 14px; font-size: 14px; line-height: 1.55; color: var(--gray-600); }
    summary { min-height: 44px; display: flex; align-items: center; cursor: pointer; font-weight: 500; color: var(--color-adra-green-600); }
    details p { margin: 0 0 8px; }
  `,
})
export class EtapaTermos {
  grupo = input.required<FormularioPreCadastro['controls']['termos']>();
  /** Muda a cada "Continuar", para a etapa redesenhar as mensagens de erro. */
  tentativa = input(0);

  protected readonly termos = [
    { campo: 'aceiteLgpd' as const, texto: TERMO_LGPD, pergunta: 'Você aceita a declaração da LGPD?', aberto: false },
    { campo: 'autorizaUsoImagem' as const, texto: TERMO_IMAGEM, pergunta: 'Você aceita o termo de cessão de imagem?', aberto: false },
    {
      campo: 'cienteFrequencia' as const,
      texto: TERMO_FREQUENCIA,
      pergunta: 'Você compreende e aceita a regra de frequência?',
      aberto: true,
    },
  ];

  protected erro(campo: 'aceiteLgpd' | 'autorizaUsoImagem' | 'cienteFrequencia'): string | null {
    const controle = this.grupo().controls[campo];
    if (campo === 'aceiteLgpd' && controle.touched && controle.value === false) {
      return 'Sem o aceite da LGPD não é possível enviar a inscrição.';
    }
    if (campo === 'cienteFrequencia' && controle.touched && controle.value === false) {
      return 'Sem confirmar a regra de frequência não é possível enviar a inscrição.';
    }
    return mensagemDoCampo(controle);
  }
}
