import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PainelMensalDTO } from '../../../shared/models/painel/Painel';
import { Icon } from '../../../shared/components/icon/icon';
import { FREQUENCIA_MINIMA, nomeMes } from './painel.util';

/** Turmas visíveis antes de "Ver todas". */
const TURMAS_VISIVEIS = 8;

/** FT-05 — turmas da menor para a maior frequência: alunos/vagas, aulas, pendências e frequência. */
@Component({
  selector: 'app-painel-turmas',
  imports: [Icon],
  templateUrl: './painel-turmas.html',
  styleUrls: ['./painel-base.css', './painel-turmas.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PainelTurmas {
  private readonly router = inject(Router);

  readonly dados = input<PainelMensalDTO['turmas'] | null>(null);
  /** yyyy-MM — vai junto para a grade abrir no mesmo mês. */
  readonly mes = input.required<string>();
  readonly filtrado = input(false);

  readonly FREQUENCIA_MINIMA = FREQUENCIA_MINIMA;
  readonly todasTurmas = signal(false);
  readonly tituloMes = computed(() => nomeMes(this.mes()));

  readonly turmas = computed(() =>
    (this.dados() ?? []).map((t) => ({
      ...t,
      tom: t.frequencia == null ? 'sem-dado' : t.frequencia < FREQUENCIA_MINIMA ? 'abaixo' : 'ok',
    })),
  );
  readonly turmasVisiveis = computed(() =>
    this.todasTurmas() ? this.turmas() : this.turmas().slice(0, TURMAS_VISIVEIS),
  );
  readonly turmasAbaixo = computed(() => this.turmas().filter((t) => t.tom === 'abaixo').length);

  abrirTurma(turmaId: number): void {
    this.router.navigate(['/chamada/turma', turmaId, 'grade'], { queryParams: { mes: this.mes() } });
  }
}
