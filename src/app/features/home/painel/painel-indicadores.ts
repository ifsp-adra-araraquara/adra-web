import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PainelMensalDTO } from '../../../shared/models/painel/Painel';
import { Icon, IconName } from '../../../shared/components/icon/icon';
import { Tom } from './painel.util';

interface Cartao {
  icone: IconName;
  /** Cor do quadrado do ícone — mesma família de cores do protótipo. */
  cor: 'verde' | 'teal' | 'azul' | 'coral';
  valor: string;
  rotulo: string;
  tendencia: { texto: string; tom: Tom; seta: '▲' | '▼' | '' } | null;
}

/**
 * FT-05 — cartões do topo, no modelo do protótipo da ADRA: ícone num
 * quadrado colorido, número grande, rótulo e a tendência do mês. A cor da
 * tendência diz se a mudança é boa (menos ocorrências é verde).
 */
@Component({
  selector: 'app-painel-indicadores',
  imports: [Icon],
  templateUrl: './painel-indicadores.html',
  styleUrls: ['./painel-base.css', './painel-indicadores.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PainelIndicadores {
  readonly mensal = input<PainelMensalDTO | null>(null);

  readonly cartoes = computed<Cartao[] | null>(() => {
    const m = this.mensal();
    if (!m) return null;
    const f = m.frequencia;
    const d = m.disciplina;
    const totalDisciplina = d.ocorrencias + d.advertencias + d.suspensoes + d.uniforme;
    return [
      {
        icone: 'users',
        cor: 'verde',
        valor: String(m.assistidos.ativos),
        rotulo: 'Assistidos ativos',
        tendencia: tendencia(m.assistidos.ativos - m.assistidos.ativosMesAnterior, ' este mês', true),
      },
      {
        icone: 'book-open',
        cor: 'teal',
        valor: String(m.oficinas.ativas),
        rotulo: 'Oficinas ativas',
        tendencia:
          m.oficinas.novas > 0
            ? { texto: `${m.oficinas.novas} ${m.oficinas.novas === 1 ? 'nova' : 'novas'}`, tom: 'bom', seta: '▲' }
            : { texto: 'nenhuma nova no mês', tom: 'neutro', seta: '' },
      },
      {
        icone: 'chart-line',
        cor: 'azul',
        valor: f.percentual != null ? `${f.percentual}%` : '—',
        rotulo: 'Frequência média',
        tendencia:
          f.percentual != null && f.percentualMesAnterior != null
            ? tendencia(f.percentual - f.percentualMesAnterior, ' p.p. vs. mês ant.', true)
            : f.percentual == null
              ? { texto: 'sem aula realizada', tom: 'neutro', seta: '' }
              : null,
      },
      {
        icone: 'alert-triangle',
        cor: 'coral',
        // Todos os níveis da escada (ocorrência, advertência, suspensão e uniforme):
        // contar só o nível "ocorrência" escondia advertências lançadas direto.
        valor: String(totalDisciplina),
        rotulo: 'Registros disciplinares no mês',
        tendencia: tendencia(totalDisciplina - m.disciplina.totalMesAnterior, ' vs. mês ant.', false),
      },
    ];
  });
}

function tendencia(diferenca: number, sufixo: string, subirEhBom: boolean): Cartao['tendencia'] {
  if (diferenca === 0) return { texto: sufixo.includes('mês ant') ? 'igual ao mês ant.' : 'sem variação', tom: 'neutro', seta: '' };
  const subiu = diferenca > 0;
  return { texto: `${Math.abs(diferenca)}${sufixo}`, tom: subiu === subirEhBom ? 'bom' : 'ruim', seta: subiu ? '▲' : '▼' };
}
