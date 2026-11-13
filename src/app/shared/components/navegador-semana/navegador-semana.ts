import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { Icon } from '../icon/icon';
import { rotuloSemana, segundaDaSemana } from '../../utils/semana.util';
import { hojeISO } from '../../utils/aula.util';
import { somarDias } from '../navegador-data/navegador-data';

/**
 * Navegação de semana em semana: ‹ semana anterior · 09/11 a 15/11 · próxima semana ›.
 * Uso: `<app-navegador-semana [(semana)]="segunda" />` (`semana` = segunda-feira, 'YYYY-MM-DD').
 * Mesmo visual do `app-navegador-data`.
 */
@Component({
  selector: 'app-navegador-semana',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="nav-semana" role="group" [attr.aria-label]="label()">
      <button type="button" class="nav-semana__seta" aria-label="Semana anterior" title="Semana anterior" (click)="mover(-7)">
        <app-icon name="chevron-left" />
      </button>
      <span class="nav-semana__rotulo" aria-live="polite">
        {{ rotulo() }}
        @if (ehEstaSemana()) { <small>esta semana</small> }
      </span>
      <button type="button" class="nav-semana__seta" aria-label="Próxima semana" title="Próxima semana" (click)="mover(7)">
        <app-icon name="chevron-right" />
      </button>
      @if (!ehEstaSemana()) {
        <button type="button" class="nav-semana__hoje" (click)="semana.set(estaSemana)">Esta semana</button>
      }
    </div>
  `,
  styles: `
    :host { display: inline-block; }
    .nav-semana { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .nav-semana__rotulo {
      display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
      min-width: 130px; height: 44px; padding: 0 10px; border: 1px solid var(--gray-100); border-radius: 8px;
      background: #fff; font-size: 14px; font-weight: 600; color: var(--gray-800); line-height: 1.1;
    }
    .nav-semana__rotulo small { font-size: 11px; font-weight: 500; color: var(--color-adra-green-600); }
    /* Alvo de toque de 44px (mobile-first) */
    .nav-semana__seta {
      display: grid; place-items: center; width: 44px; height: 44px; flex: none;
      border: 1px solid var(--gray-100); border-radius: 8px; background: #fff; color: var(--gray-600); cursor: pointer;
    }
    .nav-semana__seta:hover { border-color: var(--color-adra-green-400); color: var(--color-adra-green-400); }
    .nav-semana__hoje {
      height: 44px; padding: 0 12px; border: none; background: none; font: inherit; font-size: 13px;
      font-weight: 600; color: var(--color-adra-green-600); cursor: pointer;
    }
    .nav-semana__seta:focus-visible, .nav-semana__hoje:focus-visible {
      outline: 2px solid var(--color-adra-green-400); outline-offset: 2px;
    }
  `,
})
export class NavegadorSemana {
  /** Segunda-feira da semana exibida. */
  readonly semana = model.required<string>();
  readonly label = input('Semana');

  protected readonly estaSemana = segundaDaSemana(hojeISO());
  protected readonly rotulo = computed(() => rotuloSemana(this.semana()));
  protected readonly ehEstaSemana = computed(() => this.semana() === this.estaSemana);

  protected mover(dias: number): void {
    this.semana.set(somarDias(this.semana(), dias));
  }
}
