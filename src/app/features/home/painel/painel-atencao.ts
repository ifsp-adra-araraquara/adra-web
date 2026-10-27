import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { PainelHojeDTO } from '../../../shared/models/painel/Painel';
import { NIVEIS_DISCIPLINARES, NivelDisciplinar } from '../../../shared/enum/NivelDisciplinar';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { Icon, IconName } from '../../../shared/components/icon/icon';
import { dataCurta } from './painel.util';

/** O que o próximo registro do nível dispara (FT-04: a 3ª de cada nível). */
const PROXIMO_PASSO: Record<NivelDisciplinar, string> = {
  [NivelDisciplinar.OCORRENCIA]: 'a próxima gera advertência',
  [NivelDisciplinar.ADVERTENCIA]: 'a próxima gera suspensão',
  [NivelDisciplinar.SUSPENSAO]: 'a próxima tira o passeio',
  [NivelDisciplinar.UNIFORME]: 'a próxima exige o responsável',
};

/** FT-05 — "Precisa de atenção": faltas seguidas, chamadas atrasadas e pendências disciplinares. */
@Component({
  selector: 'app-painel-atencao',
  imports: [Avatar, Icon],
  templateUrl: './painel-atencao.html',
  styleUrls: ['./painel-base.css', './painel-atencao.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PainelAtencao {
  private readonly router = inject(Router);

  readonly hoje = input<PainelHojeDTO | null>(null);
  readonly erro = input<string | null>(null);
  readonly dataCurta = dataCurta;

  readonly pendenciasDisciplina = computed(() => {
    const d = this.hoje()?.disciplina;
    if (!d) return [];
    return [
      { valor: d.assistidosSuspensosHoje, um: 'suspenso hoje', varios: 'suspensos hoje', icone: 'flag' as IconName },
      { valor: d.retornosComResponsavelPendentes, um: 'só retorna com responsável', varios: 'só retornam com responsável', icone: 'users' as IconName },
      { valor: d.perdemProximoPasseio, um: 'perde o próximo passeio', varios: 'perdem o próximo passeio', icone: 'alert-circle' as IconName },
      { valor: d.documentosAAssinar, um: 'documento sem assinatura', varios: 'documentos sem assinatura', icone: 'file-text' as IconName },
    ]
      .filter((p) => p.valor > 0)
      .map((p) => ({ valor: p.valor, icone: p.icone, rotulo: p.valor === 1 ? p.um : p.varios }));
  });

  readonly totalAtencao = computed(() => {
    const h = this.hoje();
    if (!h) return 0;
    return (
      h.faltasSeguidas.total +
      h.chamadasPendentes.total +
      h.umPassoDaProgressao.total +
      this.pendenciasDisciplina().reduce((s, p) => s + p.valor, 0)
    );
  });

  umPassoTexto(nivel: string, registros: number): string {
    const n = NIVEIS_DISCIPLINARES[nivel as NivelDisciplinar];
    return n ? `${registros} ${n.plural.toLowerCase()} · ${PROXIMO_PASSO[nivel as NivelDisciplinar]}` : nivel;
  }

  abrirAssistido(assistidoId: number): void {
    this.router.navigate(['/assistidos'], { queryParams: { assistidoId } });
  }

  abrirAula(aulaId: number): void {
    this.router.navigate(['/chamada/aula', aulaId]);
  }

  abrirPendentes(): void {
    this.router.navigate(['/chamada'], { queryParams: { aba: 'pendentes' } });
  }

  abrirDisciplinar(): void {
    this.router.navigate(['/disciplinar']);
  }
}
