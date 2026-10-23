/** Um período de um oficineiro como responsável (dataFim null = atual). */
export interface OficineiroHistoricoDTO {
  oficineiroId: number;
  nomeOficineiro: string;
  dataInicio: string;
  dataFim: string | null;
}
