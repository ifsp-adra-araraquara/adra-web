import { ChangeDetectionStrategy, Component, computed, effect, input, model, signal, untracked } from '@angular/core';
import { rotuloSemana, segundaDaSemana } from '../../utils/semana.util';
import { hojeISO } from '../../utils/aula.util';
import { Icon } from '../icon/icon';

interface DiaCalendario {
  iso: string;
  dia: number;
  doMes: boolean;
  hoje: boolean;
}

interface SemanaCalendario {
  /** Segunda-feira da semana (chave do semanário). */
  segunda: string;
  dias: DiaCalendario[];
  enviada: boolean;
  rotulo: string;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function paraIso(data: Date): string {
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${m}-${d}`;
}

/** "2026-11" do dia ISO. */
function mesDe(iso: string): string {
  return iso.slice(0, 7);
}

/**
 * Calendário do mês para escolher a semana do semanário. Cada linha é uma semana (segunda a
 * domingo) e é um botão: verde se o grupo já tem semanário nela, amarela se ainda não.
 * Uso: `<app-calendario-semanas [(selecionada)]="segunda" [enviadas]="segundasEnviadas" />`
 */
@Component({
  selector: 'app-calendario-semanas',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cal" [class.desabilitado]="desabilitado()">
      <div class="cal-topo">
        <button type="button" class="cal-nav" aria-label="Mês anterior" (click)="mudarMes(-1)">
          <app-icon name="chevron-left" [size]="18" />
        </button>
        <span class="cal-mes" aria-live="polite">{{ tituloMes() }}</span>
        <button type="button" class="cal-nav" aria-label="Próximo mês" (click)="mudarMes(1)">
          <app-icon name="chevron-right" [size]="18" />
        </button>
      </div>

      <div class="cal-cabecalho" aria-hidden="true">
        @for (d of diasSemana; track d) { <span>{{ d }}</span> }
      </div>

      <div class="cal-semanas" role="group" [attr.aria-label]="'Semanas de ' + tituloMes()">
        @for (s of semanas(); track s.segunda) {
          <button
            type="button"
            class="cal-semana"
            [class.enviada]="!desabilitado() && s.enviada"
            [class.pendente]="!desabilitado() && !s.enviada"
            [class.selecionada]="s.segunda === selecionada()"
            [disabled]="desabilitado()"
            [attr.aria-pressed]="s.segunda === selecionada()"
            [attr.aria-label]="'Semana ' + s.rotulo + (desabilitado() ? '' : s.enviada ? ', semanário já enviado' : ', semanário pendente')"
            (click)="selecionada.set(s.segunda)"
          >
            @for (d of s.dias; track d.iso) {
              <span class="cal-dia" [class.fora]="!d.doMes" [class.hoje]="d.hoje">{{ d.dia }}</span>
            }
          </button>
        }
      </div>

      @if (desabilitado()) {
        <p class="cal-legenda">Escolha o grupo para ver as semanas já enviadas.</p>
      } @else {
        <p class="cal-legenda">
          <span class="marca marca-enviada" aria-hidden="true"></span> Enviado
          <span class="marca marca-pendente" aria-hidden="true"></span> Pendente
        </p>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .cal { border: 1px solid var(--gray-200); border-radius: 10px; padding: 10px; background: #fff; }
    .cal-topo { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .cal-mes { font-weight: 600; font-size: 14px; color: var(--gray-800); }
    .cal-nav {
      display: inline-flex; border: none; background: none; padding: 6px; border-radius: 6px;
      cursor: pointer; color: var(--gray-600);
    }
    .cal-nav:hover { background: var(--color-brand-soft); }
    .cal-cabecalho, .cal-semana { display: grid; grid-template-columns: repeat(7, 1fr); }
    .cal-cabecalho span {
      text-align: center; font-size: 11px; font-weight: 600; text-transform: uppercase;
      color: var(--gray-600); padding: 2px 0 6px;
    }
    .cal-semanas { display: grid; gap: 4px; }
    .cal-semana {
      border: 2px solid transparent; border-radius: 8px; padding: 6px 0; font: inherit;
      background: var(--gray-100); cursor: pointer; transition: box-shadow 0.15s, border-color 0.15s;
    }
    .cal-semana.enviada { background: var(--color-adra-green-50, #ecfdf5); color: var(--color-adra-green-800, #065f46); }
    .cal-semana.pendente { background: var(--amber-50, #fffbeb); color: var(--amber-700, #b45309); }
    .cal-semana.enviada:hover:not(:disabled) { border-color: var(--color-adra-green-200, #a7f3d0); }
    .cal-semana.pendente:hover:not(:disabled) { border-color: var(--amber-400, #fbbf24); }
    .cal-semana.selecionada.enviada { border-color: var(--color-adra-green-600, #059669); }
    .cal-semana.selecionada.pendente { border-color: var(--amber-600, #d97706); }
    .cal-semana.selecionada { box-shadow: 0 0 0 3px var(--color-brand-ring, rgba(5, 150, 105, 0.2)); font-weight: 700; }
    .cal-semana:focus-visible { outline: 2px solid var(--color-brand, #059669); outline-offset: 2px; }
    .cal-semana:disabled { cursor: not-allowed; color: var(--gray-400); }
    .cal-dia { text-align: center; font-size: 13px; line-height: 22px; }
    .cal-dia.fora { opacity: 0.4; }
    .cal-dia.hoje { text-decoration: underline; text-underline-offset: 3px; font-weight: 700; }
    .cal-legenda {
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
      margin: 10px 0 0; font-size: 12px; color: var(--gray-600);
    }
    .marca { display: inline-block; width: 12px; height: 12px; border-radius: 3px; }
    .marca-enviada { background: var(--color-adra-green-400, #34d399); }
    .marca-pendente { background: var(--amber-400, #fbbf24); margin-left: 10px; }
    .desabilitado .cal-semana { background: var(--gray-100); }
  `,
})
export class CalendarioSemanas {
  /** Segunda-feira da semana escolhida. */
  readonly selecionada = model.required<string>();
  /** Segundas-feiras das semanas que já têm semanário. */
  readonly enviadas = input<string[]>([]);
  /** Sem grupo escolhido ainda: mostra o mês sem cores e não deixa escolher. */
  readonly desabilitado = input(false);

  readonly diasSemana = DIAS_SEMANA;
  /** Mês exibido ("2026-11"); começa no mês da semana escolhida. */
  readonly mes = signal(mesDe(hojeISO()));

  constructor() {
    // Ao trocar a semana por fora (ex.: modal reaberto), o calendário vai para o mês dela.
    effect(() => {
      const segunda = this.selecionada();
      untracked(() => {
        if (!this.semanas().some((s) => s.segunda === segunda)) this.mes.set(mesDe(segunda));
      });
    });
  }

  readonly tituloMes = computed(() => {
    const [ano, mes] = this.mes().split('-').map(Number);
    return `${MESES[mes - 1]} de ${ano}`;
  });

  readonly semanas = computed<SemanaCalendario[]>(() => {
    const [ano, mes] = this.mes().split('-').map(Number);
    const hoje = hojeISO();
    const enviadas = new Set(this.enviadas());
    const ultimoDia = paraIso(new Date(ano, mes, 0));
    const semanas: SemanaCalendario[] = [];

    let segunda = segundaDaSemana(paraIso(new Date(ano, mes - 1, 1)));
    while (segunda <= ultimoDia) {
      const [a, m, d] = segunda.split('-').map(Number);
      const dias = Array.from({ length: 7 }, (_, i) => {
        const data = new Date(a, m - 1, d + i);
        const iso = paraIso(data);
        return { iso, dia: data.getDate(), doMes: data.getMonth() === mes - 1, hoje: iso === hoje };
      });
      semanas.push({ segunda, dias, enviada: enviadas.has(segunda), rotulo: rotuloSemana(segunda) });
      segunda = paraIso(new Date(a, m - 1, d + 7));
    }
    return semanas;
  });

  mudarMes(delta: number): void {
    const [ano, mes] = this.mes().split('-').map(Number);
    this.mes.set(paraIso(new Date(ano, mes - 1 + delta, 1)).slice(0, 7));
  }
}
