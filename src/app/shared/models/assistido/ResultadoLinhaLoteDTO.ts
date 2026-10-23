export type StatusLinhaLote = 'VALIDA' | 'INVALIDA';

export interface ResultadoLinhaLoteDTO {
  indice: number;
  status: StatusLinhaLote;
  erros: string[];
  responsaveisExistentes: Record<string, string>;
}
