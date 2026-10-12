import { StatusPresenca } from '../../enum/StatusPresenca';

/** Uma linha do histórico de frequência de um assistido — GET /api/chamadas/assistido/{id}/frequencia. */
export interface FrequenciaAulaDTO {
  aulaId: number;
  dataAula: string;
  nomeTurma: string;
  statusPresenca: StatusPresenca;
}
