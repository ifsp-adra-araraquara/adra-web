/** GET /api/assistidos/contagem — totais das abas para o recorte de busca/turma/oficina. */
export interface AssistidoContagemDTO {
  todos: number;
  ativos: number;
  inativos: number;
  emAcompanhamento: number;
  /** Matriculados para o ano seguinte que ainda não começaram (fora das outras abas). */
  proximoAno?: number;
  /** Ano em que eles começam (null se não há nenhum). */
  anoProximo?: number | null;
}
