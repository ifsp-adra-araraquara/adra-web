export type StatusLinhaLote = 'VALIDA' | 'CRIADA' | 'INVALIDA';

export interface ResultadoLinhaLoteDTO {
  indice: number;
  status: StatusLinhaLote;
  assistidoId: number | null;
  erros: string[];
  responsaveisExistentes: Record<string, string>;
}
