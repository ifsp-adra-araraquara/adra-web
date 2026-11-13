/** Espelha TipoAviso da API (FT-18). */
export type TipoAviso =
  | 'SUSPENSO_HOJE'
  | 'RETORNO_COM_RESPONSAVEL'
  | 'RECOMENDACAO_ADVERTENCIA'
  | 'RECOMENDACAO_SUSPENSAO'
  | 'PERDE_PROXIMO_PASSEIO'
  | 'DOCUMENTO_A_ASSINAR'
  | 'CHAMADA_ATRASADA'
  | 'CHAMADA_DE_HOJE'
  | 'FALTAS_SEGUIDAS'
  | 'PRE_CADASTRO_PENDENTE'
  | 'CADASTRO_SEM_NASCIMENTO'
  | 'SEMANARIO_PENDENTE'
  | 'DESLIGAMENTO_SOLICITADO';

/** GET /api/avisos — `assistidoId`, `turmaId` e `data` apontam onde o aviso se resolve. */
export interface AvisoDTO {
  tipo: TipoAviso;
  titulo: string;
  detalhe: string;
  assistidoId: number | null;
  turmaId: number | null;
  data: string | null;
}
