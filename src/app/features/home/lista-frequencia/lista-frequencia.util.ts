import { StatusPresenca } from '../../../shared/enum/StatusPresenca';
import { GradeMensalTurmaDTO } from '../../../shared/models/presenca/GradeMensalTurmaDTO';

const NOMES_MES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export interface ColunaLista {
  data: string;
  dia: number;
  semana: string;
  /** Feriado, passeio ou evento: a coluna fica marcada e não conta na frequência. */
  semChamada: string | null;
}

export interface LinhaLista {
  assistidoId: number;
  nome: string;
  /** P, F, FJ, "—" (sem chamada ou fora do grupo) ou "" (chamada ainda não feita). */
  celulas: string[];
  presencas: number;
  faltas: number;
  justificadas: number;
  /** % de presença nas chamadas feitas; null sem nenhuma. */
  frequencia: number | null;
  saida: string | null;
}

export interface ListaFrequencia {
  titulo: string;
  colunas: ColunaLista[];
  linhas: LinhaLista[];
  diasComChamada: number;
  frequenciaGeral: number | null;
  semChamada: { data: string; rotulo: string }[];
}

/** "novembro de 2026" a partir de yyyy-MM. */
export function mesPorExtenso(mes: string): string {
  const [ano, m] = mes.split('-').map(Number);
  return `${NOMES_MES[m - 1]} de ${ano}`;
}

/**
 * Lista de frequência do grupo no mês (prestação de contas): uma coluna por
 * dia de atividade, P/F/FJ por atendido, totais e % de presença. FJ conta
 * como ausência, como no painel.
 */
export function montarListaFrequencia(grade: GradeMensalTurmaDTO): ListaFrequencia {
  const colunas: ColunaLista[] = grade.colunas.map((c) => {
    const [a, m, d] = c.data.split('-').map(Number);
    return {
      data: c.data,
      dia: d,
      semana: DIAS_SEMANA[new Date(a, m - 1, d).getDay()],
      semChamada: c.tipo === 'SEM_CHAMADA' ? (c.rotulo ?? 'Sem chamada') : null,
    };
  });

  let presentesTotal = 0;
  let chamadasTotal = 0;
  const linhas = grade.alunos.map((aluno) => {
    const celulas = colunas.map((coluna, i) => {
      if (coluna.semChamada) return '—';
      if (aluno.dataSaida && coluna.data > aluno.dataSaida) return '—';
      switch (aluno.presencas[i]) {
        case StatusPresenca.PRESENTE: return 'P';
        case StatusPresenca.FALTA: return 'F';
        case StatusPresenca.FALTA_JUSTIFICADA: return 'FJ';
      }
      return grade.colunas[i].tipo === 'LANCADA' ? '—' : '';
    });
    const presencas = celulas.filter((c) => c === 'P').length;
    const faltas = celulas.filter((c) => c === 'F').length;
    const justificadas = celulas.filter((c) => c === 'FJ').length;
    const chamadas = presencas + faltas + justificadas;
    presentesTotal += presencas;
    chamadasTotal += chamadas;
    return {
      assistidoId: aluno.assistidoId,
      nome: aluno.nomeCompleto,
      celulas,
      presencas,
      faltas,
      justificadas,
      frequencia: chamadas ? Math.round((presencas * 100) / chamadas) : null,
      saida: aluno.dataSaida,
    };
  });

  return {
    titulo: `Lista de frequência — ${grade.nomeTurma} — ${mesPorExtenso(`${grade.ano}-${String(grade.mes).padStart(2, '0')}`)}`,
    colunas,
    linhas,
    diasComChamada: grade.colunas.filter((c) => c.tipo === 'LANCADA').length,
    frequenciaGeral: chamadasTotal ? Math.round((presentesTotal * 100) / chamadasTotal) : null,
    semChamada: colunas.filter((c) => c.semChamada).map((c) => ({ data: c.data, rotulo: c.semChamada! })),
  };
}
