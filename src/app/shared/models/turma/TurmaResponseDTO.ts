import { Turno } from '../../enum/Turno';
import { DiaSemana } from '../../enum/DiaSemana';

export interface TurmaResponseDTO {
  turmaId: number;
  nomeTurma: string;
  turno: Turno;
  faixaEtariaId: number | null;
  /** Rótulo da faixa, ex.: "6–10 anos". */
  faixaEtaria: string | null;
  capacidade: number;
  ativo: boolean;
  observacoes?: string;
  /** Só vem preenchido em GET /api/turmas (listagem) — contagem em lote feita no backend. */
  quantidadeAlunos?: number | null;
  diasDaSemana?: DiaSemana[];
  /** Oficinas que atendem o grupo. */
  oficinaIds: number[];
}
