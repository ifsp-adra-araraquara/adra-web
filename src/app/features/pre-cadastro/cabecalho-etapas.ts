import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** "Passo 2 de 6" + barra de progresso. O título da etapa fica na página (é o foco ao trocar de etapa). */
@Component({
  selector: 'app-cabecalho-etapas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="passo">Passo {{ atual() + 1 }} de {{ total() }}</p>
    <div class="barra" aria-hidden="true">
      <div class="barra__preenchida" [style.width.%]="percentual()"></div>
    </div>
  `,
  styles: `
    :host { display: block; margin-bottom: 8px; }
    .passo { margin: 0 0 8px; font-size: 13px; font-weight: 600; color: var(--color-adra-green-600); }
    .barra { height: 6px; border-radius: 3px; background: var(--gray-100); overflow: hidden; }
    .barra__preenchida { height: 100%; background: var(--color-brand); border-radius: 3px; transition: width .25s var(--ease); }
    @media (prefers-reduced-motion: reduce) { .barra__preenchida { transition: none; } }
  `,
})
export class CabecalhoEtapas {
  atual = input.required<number>();
  total = input.required<number>();

  protected readonly percentual = computed(() => ((this.atual() + 1) / this.total()) * 100);
}
