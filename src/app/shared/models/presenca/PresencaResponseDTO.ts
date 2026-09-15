import { StatusPresenca } from '../../enum/StatusPresenca';

export interface PresencaResponseDTO {
  presencaId: number;
  aulaId: number;
  assistidoId: number;
  statusPresenca: StatusPresenca;
  justificativaFalta: string | null;
  observacaoDoDia: string | null;
  horarioRegistro: string;
}