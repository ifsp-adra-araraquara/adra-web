import { Turno } from '../../enum/Turno';

export interface TurmaResponseDTO {
  turmaId: number;
  nomeTurma: string;
  turno: Turno;
  faixaEtaria: string;
  capacidade: number;
  ativo: boolean;
  observacoes?: string;
}