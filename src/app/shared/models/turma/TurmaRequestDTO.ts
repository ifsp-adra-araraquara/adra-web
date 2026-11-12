import { Turno } from '../../enum/Turno';
import { DiaSemana } from '../../enum/DiaSemana';

export interface TurmaRequestDTO {
  nomeTurma: string;
  turno: Turno | '';
  faixaEtariaId: number | null;
  capacidade: number | null;
  observacoes?: string;
  diasDaSemana: DiaSemana[];
  /** Oficinas que atendem o grupo. */
  oficinaIds: number[];
}