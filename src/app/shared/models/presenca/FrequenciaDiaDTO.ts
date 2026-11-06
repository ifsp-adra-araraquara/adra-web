import { StatusPresenca } from '../../enum/StatusPresenca';

/** Uma chamada lançada no histórico de um atendido — GET /api/chamadas/assistido/{id}/frequencia. */
export interface FrequenciaDiaDTO {
  data: string;
  turmaId: number;
  nomeTurma: string;
  statusPresenca: StatusPresenca;
}
