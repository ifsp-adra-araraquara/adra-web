import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { CampoComparadoDTO, ChaveCampoFicha, ComparacaoRematriculaDTO } from '../../../../shared/models/matricula/Matricula';
import { Icon } from '../../../../shared/components/icon/icon';

/**
 * Rematrícula: a ficha ao lado do que a família enviou, com as diferenças em
 * destaque. Em cada dado diferente a equipe marca se leva o enviado para a
 * ficha; responsáveis se atualizam na aba Família da ficha.
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
        @if (editavel()) {
          Marque em <b>Levar para a ficha</b> os dados que mudaram. Abaixo, em <b>Ficha do atendido</b>, dá para conferir e
          corrigir qualquer dado antes de rematricular. Responsáveis se atualizam na
          <button type="button" class="link" (click)="abrirFamilia.emit()">aba Família da ficha</button> (abre em outra aba).
        } @else {
          Responsáveis se atualizam na
          <button type="button" class="link" (click)="abrirFamilia.emit()">aba Família da ficha</button> (abre em outra aba).
        }
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
            @if (editavel()) { <th scope="col">Levar para a ficha</th> }
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
              @if (editavel()) {
                <td class="levar" data-rotulo="Levar para a ficha">
                  @if (campo.diferente && campo.chave; as chave) {
                    <label class="levar-opcao">
                      <input type="checkbox" [checked]="aplicados().has(chave)" (change)="alternar.emit(chave)" />
                      <span>{{ aplicados().has(chave) ? 'Sim' : 'Não' }}<span class="sr-only"> — {{ campo.rotulo }}</span></span>
                    </label>
                  } @else if (campo.diferente && !campo.chave) {
                    <span class="nota">Na aba Família</span>
                  }
                </td>
              }
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
    :host { display: block; }
    .bloco { margin-bottom: 16px; }
    .link {
      padding: 4px 0; border: none; background: none; cursor: pointer;
      color: var(--color-adra-green-800); font: inherit; font-weight: 600;
      text-decoration: underline; text-underline-offset: 2px;
    }
    .dica { margin: 0 0 12px; font-size: 14px; line-height: 1.5; color: var(--gray-600); }
    .resumo { display: flex; align-items: center; gap: 6px; margin: 0 0 10px; font-size: 14px; font-weight: 600; color: var(--amber-600); }
    .resumo--igual { color: var(--color-adra-green-800); }
    .comparacao { width: 100%; border-collapse: collapse; font-size: 14px; }
    .comparacao th, .comparacao td { padding: 8px 10px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--gray-200); }
    .comparacao thead th { height: auto; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .02em; color: var(--gray-600); }
    .comparacao tbody th { font-weight: 600; color: var(--gray-800); width: 30%; }
    .comparacao td { color: var(--gray-800); white-space: pre-line; overflow-wrap: anywhere; }
    .comparacao tr.diferente { background: var(--amber-50); }
    .comparacao tr.diferente th { box-shadow: inset 3px 0 0 var(--amber-400); }
    .alternar { margin-top: 10px; }
    .comparacao td.levar { white-space: nowrap; }
    .levar-opcao { display: inline-flex; align-items: center; gap: 8px; min-height: 32px; cursor: pointer; font-weight: 600; }
    .levar-opcao input { width: 18px; height: 18px; accent-color: var(--color-adra-green-800); cursor: pointer; }
    .nota { font-size: 13px; color: var(--gray-600); }
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
  /** Pode levar o enviado para a ficha (rematrícula ainda em avaliação). */
  readonly editavel = input(false);
  /** Dados marcados para ir para a ficha. */
  readonly aplicados = input<ReadonlySet<ChaveCampoFicha>>(new Set());
  readonly alternar = output<ChaveCampoFicha>();
  readonly abrirFamilia = output<void>();

  protected readonly mostrarIguais = signal(false);
  protected readonly diferentes = computed(() => this.comparacao().campos.filter((c: CampoComparadoDTO) => c.diferente));
  protected readonly iguais = computed(() => this.comparacao().campos.length - this.diferentes().length);
  protected readonly visiveis = computed(() => (this.mostrarIguais() ? this.comparacao().campos : this.diferentes()));
}
