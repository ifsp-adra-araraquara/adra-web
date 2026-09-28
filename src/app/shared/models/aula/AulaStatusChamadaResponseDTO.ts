import { StatusAula } from '../../enum/StatusAula';
import { StatusChamada } from '../../enum/StatusChamada';

export interface AulaStatusChamadaResponseDTO {
  aulaId: number;
  turmaId: number | null;
  nomeTurma: string | null;
  titulo: string | null;
  dataAula: string;
  horarioInicio: string | null;
  horarioFim: string | null;
  statusAula: StatusAula;
  statusChamada: StatusChamada;
}
