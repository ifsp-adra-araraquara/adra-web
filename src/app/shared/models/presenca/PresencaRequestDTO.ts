import { StatusPresenca } from '../../enum/StatusPresenca';

export interface PresencaRequestDTO {
  aulaId: number;
  assistidoId: number;
  statusPresenca: StatusPresenca;
  justificativaFalta?: string;
  observacaoDoDia?: string;
}