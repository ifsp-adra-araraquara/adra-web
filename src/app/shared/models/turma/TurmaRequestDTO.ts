import { Turno } from '../../enum/Turno';

export interface TurmaRequestDTO {
  nomeTurma: string;
  turno: Turno | '';
  faixaEtaria: string; // ⚠️ pendência do planning: formato ainda em texto livre
  capacidade: number | null;
  observacoes?: string;
}