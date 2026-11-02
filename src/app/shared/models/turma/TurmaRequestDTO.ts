import { Turno } from '../../enum/Turno';
import { DiaSemana } from '../../enum/DiaSemana';

export interface TurmaRequestDTO {
  nomeTurma: string;
  turno: Turno | '';
  faixaEtaria: string; // ⚠️ pendência do planning: formato ainda em texto livre
  capacidade: number | null;
  observacoes?: string;
  oficinaId?: number | null;
  oficineiroResponsavelId?: number | null;
  diasDaSemana: DiaSemana[];
}