import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { SelectOption } from '../select/select';

/**
 * Botões de liga/desliga para escolher várias opções.
 * Uso: `<app-seletor-multiplo label="Grupos atendidos" [opcoes]="grupos" [(valores)]="form.turmaIds" />`
 */
@Component({
  selector: 'app-seletor-multiplo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="field" role="group" [attr.aria-label]="label()">
      <span class="rotulo">{{ label() }}</span>
      <div class="opcoes">
        @for (opcao of opcoes(); track opcao.value) {
          <button
            type="button"
            class="btn btn-sm"
            [class.btn-primary]="valores().includes(opcao.value)"
            [class.btn-ghost]="!valores().includes(opcao.value)"
            [attr.aria-pressed]="valores().includes(opcao.value)"
            (click)="alternar(opcao.value)"
          >
            {{ opcao.label }}
          </button>
        } @empty {
          <span class="muted">{{ textoVazio() }}</span>
        }
      </div>
    </div>
  `,
  styles: `
    .rotulo { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; color: var(--rotulo); }
    .opcoes { display: flex; gap: 8px; flex-wrap: wrap; }
  `,
})
export class SeletorMultiplo<T extends string | number = number> {
  label = input.required<string>();
  opcoes = input.required<SelectOption<T>[]>();
  textoVazio = input('Nenhuma opção disponível.');
  valores = model<T[]>([]);

  protected alternar(valor: T): void {
    this.valores.update((atuais) =>
      atuais.includes(valor) ? atuais.filter((v) => v !== valor) : [...atuais, valor],
    );
  }
}
