import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { AvisoService } from '../../../core/aviso.service';
import { AvisoDTO } from '../../../shared/models/aviso/Aviso';
import { PainelHojeDTO } from '../../../shared/models/painel/Painel';
import { NIVEIS_DISCIPLINARES, NivelDisciplinar } from '../../../shared/enum/NivelDisciplinar';
import { GRUPOS_AVISO, acaoDoAviso, agruparAvisos, rotaDoAviso } from '../../../shared/utils/aviso.util';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { Icon } from '../../../shared/components/icon/icon';

/** O que o próximo registro do nível dispara (FT-04: a 3ª de cada nível). */
const PROXIMO_PASSO: Record<NivelDisciplinar, string> = {
  [NivelDisciplinar.OCORRENCIA]: 'a próxima gera advertência',
  [NivelDisciplinar.ADVERTENCIA]: 'a próxima gera suspensão',
  [NivelDisciplinar.SUSPENSAO]: 'a próxima tira o passeio',
  [NivelDisciplinar.UNIFORME]: 'a próxima exige o responsável',
};

/** Itens por grupo no painel; a lista inteira fica no sino. */
const LIMITE_POR_GRUPO = 6;

/** FT-18 — área Avisos do painel: Controle disciplinar primeiro, depois chamada, frequência e cadastro. */
@Component({
  selector: 'app-painel-atencao',
  imports: [Avatar, Icon],
  templateUrl: './painel-atencao.html',
  styleUrls: ['./painel-base.css', './painel-atencao.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PainelAtencao {
  private readonly router = inject(Router);
  private readonly avisoService = inject(AvisoService);

  readonly hoje = input<PainelHojeDTO | null>(null);
  readonly erro = input<string | null>(null);
  readonly acao = acaoDoAviso;
  readonly corDisciplinar = GRUPOS_AVISO.find((g) => g.id === 'disciplinar')!.cor;

  private readonly grupos = computed(() => agruparAvisos(this.avisoService.avisos()));

  /** "Hoje" (suspensos e retornos) também é controle disciplinar no painel do Coordenador. */
  readonly disciplinar = computed(() =>
    this.grupos()
      .filter((g) => g.id === 'hoje' || g.id === 'disciplinar')
      .flatMap((g) => g.avisos),
  );

  readonly outrosGrupos = computed(() =>
    this.grupos()
      .filter((g) => g.id !== 'hoje' && g.id !== 'disciplinar')
      .map((g) => ({ id: g.id, titulo: g.titulo, cor: g.cor, total: g.avisos.length, itens: g.avisos.slice(0, LIMITE_POR_GRUPO) })),
  );

  readonly umPasso = computed(() => this.hoje()?.umPassoDaProgressao.itens ?? []);
  readonly total = computed(() => this.avisoService.avisos().length);

  umPassoTexto(nivel: string, registros: number): string {
    const n = NIVEIS_DISCIPLINARES[nivel as NivelDisciplinar];
    return n ? `${registros} ${n.plural.toLowerCase()} · ${PROXIMO_PASSO[nivel as NivelDisciplinar]}` : nivel;
  }

  abrir(aviso: AvisoDTO): void {
    const rota = rotaDoAviso(aviso);
    this.router.navigate(rota.comandos, { queryParams: rota.queryParams });
  }

  abrirAssistido(assistidoId: number): void {
    this.router.navigate(['/assistidos'], { queryParams: { assistidoId } });
  }

  abrirPendentes(): void {
    this.router.navigate(['/chamada'], { queryParams: { aba: 'pendentes' } });
  }
}
