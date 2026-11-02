import { DiaSemana } from '../../enum/DiaSemana';

export type { DiaSemana };

export interface HorarioOficina {
  dias: DiaSemana[];
  /** "14:00:00" ou null quando a turma não tem horário. */
  inicio: string | null;
  turmas: number;
}

/** GET /api/oficinas/resumo — números das turmas de cada oficina para os cards. */
export interface OficinaResumoDTO {
  oficinaId: number;
  turmasAtivas: number;
  alunos: number;
  capacidade: number;
  /** O mais comum primeiro. */
  horarios: HorarioOficina[];
}
