import { StatusPresenca } from '../../enum/StatusPresenca';
import { MotivoFalta } from '../../enum/MotivoFalta';

/** Um dia do histórico recente — ver PresencaResponseDTO.historicoRecente. */
export interface PresencaHistoricoDTO {
  dataAula: string;
  statusPresenca: StatusPresenca;
}

export interface PresencaResponseDTO {
  // null quando o status é PRESENTE inferido (modelo esparso — nunca vira
  // linha no banco, ver PresencaResponseDTO.presente() no back).
  presencaId: number | null;
  aulaId: number;
  assistidoId: number;
  nomeCompleto: string;
  statusPresenca: StatusPresenca;
  motivoFalta: MotivoFalta | null;
  observacao: string | null;
  // US-68: rastreabilidade de autoria de chamada
  criadoPorId: number | null;
  criadoPorNome: string | null;
  atualizadoPorId: number | null;
  atualizadoPorNome: string | null;
  criadoEm: string | null;
  atualizadoEm: string | null;
  // Só vem preenchido em GET /api/chamadas/aula/{id} — últimos dias (mais
  // recente primeiro) do aluno na turma, pra faixa de dias no roster.
  // Vazio nos outros usos deste DTO.
  historicoRecente: PresencaHistoricoDTO[];
}
