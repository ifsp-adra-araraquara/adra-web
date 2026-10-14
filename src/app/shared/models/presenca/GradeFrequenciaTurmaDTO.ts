import { StatusPresenca } from '../../enum/StatusPresenca';

/** Uma linha da grade de frequência da turma — ver GradeFrequenciaTurmaDTO. */
export interface GradeAlunoDTO {
  assistidoId: number;
  nomeCompleto: string;
  /** Paralelo a `GradeFrequenciaTurmaDTO.datas` (mesmo índice = mesma aula). */
  presencas: StatusPresenca[];
}

/** Grade turma × dias — GET /api/chamadas/turma/{id}/grade. Mais recente primeiro. */
export interface GradeFrequenciaTurmaDTO {
  datas: string[];
  alunos: GradeAlunoDTO[];
}
