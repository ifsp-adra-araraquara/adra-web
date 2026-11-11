import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { ComparacaoRematriculaDTO } from '../../../../shared/models/matricula/Matricula';
import { Icon } from '../../../../shared/components/icon/icon';

/**
 * Rematrícula: a ficha ao lado do que a família enviou, com as diferenças em
 * destaque. Só leitura — atualizar a ficha é decisão manual da equipe.
 */
@Component({
  selector: 'app-comparacao-rematricula',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card card-pad bloco" aria-labelledby="sec-comparacao">
      <h2 id="sec-comparacao" class="form-sec-title">Rematrícula em {{ comparacao().ano }}</h2>
      <p class="dica">
        {{ comparacao().nomeAssistido }} já é atendido(a)
        @if (comparacao().statusAssistido === 'INATIVO') { (está desligado(a) e volta a ser atendido(a) com a rematrícula) }.
        A ficha <b>não é alterada</b> ao rematricular: se algum dado mudou, atualize em
        <button type="button" class="link" (click)="abrirFicha.emit()">Editar ficha</button>.
      </p>

      @if (diferentes().length) {
        <p class="resumo" role="status">
          <app-icon name="alert-triangle" [size]="16" />
          {{ diferentes().length === 1 ? '1 dado diferente da ficha' : diferentes().length + ' dados diferentes da ficha' }}
        </p>
      } @else {
        <p class="resumo resumo--igual" role="status">
          <app-icon name="check" [size]="16" /> Os dados enviados são iguais aos da ficha.
        </p>
      }

      <table class="comparacao">
        <caption class="sr-only">Dados da ficha e dados enviados pela família</caption>
        <thead>
          <tr>
            <th scope="col">Dado</th>
            <th scope="col">Na ficha</th>
            <th scope="col">Enviado agora</th>
          </tr>
        </thead>
        <tbody>
          @for (campo of visiveis(); track $index) {
            <tr [class.diferente]="campo.diferente">
              <th scope="row">
                {{ campo.rotulo }}
                @if (campo.diferente) { <span class="sr-only">(diferente)</span> }
              </th>
              <td data-rotulo="Na ficha">{{ campo.naFicha }}</td>
              <td data-rotulo="Enviado agora">{{ campo.enviado }}</td>
            </tr>
          }
        </tbody>
      </table>

      @if (iguais() > 0) {
        <button type="button" class="link alternar" [attr.aria-expanded]="mostrarIguais()" (click)="mostrarIguais.update((v) => !v)">
          {{ mostrarIguais() ? 'Esconder dados iguais' : 'Mostrar também os ' + iguais() + ' dados iguais' }}
        </button>
      }
    </section>
  `,
  styles: `
    .dica { margin: 0 0 12px; font-size: 14px; line-height: 1.5; color: var(--gray-600); }
    .resumo { display: flex; align-items: center; gap: 6px; margin: 0 0 10px; font-size: 14px; font-weight: 600; color: var(--amber-600); }
    .resumo--igual { color: var(--color-adra-green-800); }
    .comparacao { width: 100%; border-collapse: collapse; font-size: 14px; }
    .comparacao th, .comparacao td { padding: 8px 10px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--gray-200); }
    .comparacao thead th { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .02em; color: var(--gray-600); }
    .comparacao tbody th { font-weight: 600; color: var(--gray-800); width: 30%; }
    .comparacao td { color: var(--gray-800); white-space: pre-line; overflow-wrap: anywhere; }
    .comparacao tr.diferente { background: var(--amber-50); }
    .comparacao tr.diferente th { box-shadow: inset 3px 0 0 var(--amber-400); }
    .alternar { margin-top: 10px; }
    @media (max-width: 599px) {
      .comparacao thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
      .comparacao tr { display: block; padding: 8px 0; border-bottom: 1px solid var(--gray-200); }
      .comparacao th, .comparacao td { display: block; width: auto; border: none; padding: 2px 10px; }
      .comparacao tbody th { width: auto; }
      .comparacao td::before { content: attr(data-rotulo) ': '; font-weight: 600; color: var(--gray-600); }
    }
  `,
})
export class ComparacaoRematricula {
  readonly comparacao = input.required<ComparacaoRematriculaDTO>();
  readonly abrirFicha = output<void>();

  protected readonly mostrarIguais = signal(false);
  protected readonly diferentes = computed(() => this.comparacao().campos.filter((c) => c.diferente));
  protected readonly iguais = computed(() => this.comparacao().campos.length - this.diferentes().length);
  protected readonly visiveis = computed(() => (this.mostrarIguais() ? this.comparacao().campos : this.diferentes()));
}
