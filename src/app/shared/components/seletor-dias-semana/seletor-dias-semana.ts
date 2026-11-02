import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { DIAS_SEMANA, DiaSemana } from '../../enum/DiaSemana';

/**
 * Botões de liga/desliga para escolher dias da semana.
 * Uso: `<app-seletor-dias-semana label="Dias de chamada" [(dias)]="form.diasDaSemana" />`
 */
@Component({
  selector: 'app-seletor-dias-semana',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="field" role="group" [attr.aria-label]="label()">
      <span class="rotulo">{{ label() }}</span>
      <div class="dias">
        @for (dia of diasSemana; track dia.valor) {
          <button
            type="button"
            class="btn btn-sm"
            [class.btn-primary]="dias().includes(dia.valor)"
            [class.btn-ghost]="!dias().includes(dia.valor)"
            [attr.aria-pressed]="dias().includes(dia.valor)"
            (click)="alternar(dia.valor)"
          >
            {{ dia.rotulo }}
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    .rotulo { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; color: var(--rotulo); }
    .dias { display: flex; gap: 8px; flex-wrap: wrap; }
  `,
})
export class SeletorDiasSemana {
  label = input('Dias da semana');
  dias = model<DiaSemana[]>([]);

  protected readonly diasSemana = DIAS_SEMANA;

  protected alternar(dia: DiaSemana): void {
    this.dias.update((atuais) =>
      atuais.includes(dia) ? atuais.filter((d) => d !== dia) : [...atuais, dia],
    );
  }
}
