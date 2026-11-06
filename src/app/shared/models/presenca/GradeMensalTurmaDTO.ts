import { StatusPresenca } from '../../enum/StatusPresenca';

/** O que um dia da grade mensal representa — espelha `TipoColunaGrade` no back. */
export type TipoColunaGrade = 'LANCADA' | 'PENDENTE' | 'FUTURA' | 'SEM_CHAMADA';

export interface ColunaGradeDTO {
  data: string;
  tipo: TipoColunaGrade;
  /** Só em SEM_CHAMADA — ex.: "Passeio Lupo", "Feriado nacional". */
  rotulo: string | null;
}

export interface AlunoGradeMensalDTO {
  assistidoId: number;
  nomeCompleto: string;
  dataNascimento: string | null;
  /** Preenchidos quando o assistido foi desligado. */
  dataSaida: string | null;
  motivoSaida: string | null;
  /** Paralelo a `GradeMensalTurmaDTO.colunas`; null onde não há chamada para o atendido. */
  presencas: (StatusPresenca | null)[];
}

/** Grade turma × dias de um mês, formato da planilha — GET /api/chamadas/turma/{id}/grade?mes=yyyy-MM. */
export interface GradeMensalTurmaDTO {
  turmaId: number;
  nomeTurma: string;
  ano: number;
  mes: number;
  colunas: ColunaGradeDTO[];
  alunos: AlunoGradeMensalDTO[];
}
