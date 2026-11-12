/** GET /api/listas/evento — uma linha da lista de evento/passeio (só o Coordenador). */
export interface AtendidoListaEventoDTO {
  assistidoId: number;
  nomeCompleto: string;
  dataNascimento: string | null;
  turmaId: number;
  nomeTurma: string;
  /** Só quando pedido com `comResponsavel=true`. */
  responsavelNome: string | null;
  responsavelTelefone: string | null;
}
