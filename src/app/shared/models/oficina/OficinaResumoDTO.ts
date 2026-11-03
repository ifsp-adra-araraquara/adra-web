import { DiaSemana } from '../../enum/DiaSemana';

export type { DiaSemana };

export interface HorarioOficina {
  dias: DiaSemana[];
  turmas: number;
}

/** GET /api/oficinas/resumo — números dos grupos de cada oficina para os cards. */
export interface OficinaResumoDTO {
  oficinaId: number;
  turmasAtivas: number;
  alunos: number;
  capacidade: number;
  /** O mais comum primeiro. */
  horarios: HorarioOficina[];
}
