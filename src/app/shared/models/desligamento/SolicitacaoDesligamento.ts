export type StatusSolicitacaoDesligamento = 'PENDENTE' | 'APROVADA' | 'RECUSADA' | 'CANCELADA';

/** GET /api/assistidos/desligamentos — pedidos em aberto e os decididos nos últimos 30 dias. */
export interface SolicitacaoDesligamentoDTO {
  solicitacaoId: number;
  assistidoId: number;
  nomeAtendido: string;
  nomeTurma: string | null;
  dataSaida: string;
  motivo: string;
  status: StatusSolicitacaoDesligamento;
  solicitadoPorNome: string;
  criadoEm: string;
  resposta: string | null;
  decididoPorNome: string | null;
  decididoEm: string | null;
}
