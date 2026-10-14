/** GET /api/assistidos/contagem — totais das abas para o recorte de busca/turma/oficina. */
export interface AssistidoContagemDTO {
  todos: number;
  ativos: number;
  inativos: number;
  emAcompanhamento: number;
}
