import { StatusPresenca } from '../../enum/StatusPresenca';

/** O que um dia da grade mensal representa — espelha `TipoColunaGrade` no back. */
export type TipoColunaGrade = 'AULA' | 'PENDENTE' | 'FUTURA' | 'CANCELADA' | 'SEM_AULA';

export interface ColunaGradeDTO {
  data: string;
  /** null em SEM_AULA (feriado/recesso não gera aula). */
  aulaId: number | null;
  tipo: TipoColunaGrade;
  /** Só em CANCELADA/SEM_AULA — ex.: "Passeio Lupo", "Feriado". */
  rotulo: string | null;
}

export interface AlunoGradeMensalDTO {
  assistidoId: number;
  nomeCompleto: string;
  dataNascimento: string | null;
  /** Preenchidos quando o assistido foi desligado. */
  dataSaida: string | null;
  motivoSaida: string | null;
  /** Paralelo a `GradeMensalTurmaDTO.colunas`; null onde não há chamada pro aluno. */
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
