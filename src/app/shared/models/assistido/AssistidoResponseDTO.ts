import { StatusGeral } from '../../enum/StatusGeral'

export interface AssistidoResponseDTO {
  assistidoId: number;
  nomeCompleto: string;
  dataNascimento: string;
  cpf: string | null;
  dataEntrada: string | null;
  dataSaida: string | null;
  motivoSaida: string | null;
  necessidadesEspecificas: string | null;
  observacoes: string | null;
  status: StatusGeral;
  turmaId?: number | null;
  nomeTurma?: string | null;
  totalOcorrenciasAtivas: number;
  totalAdvertenciasAtivas: number;
  totalSuspensoes: number;
  criadoEm: string;
  atualizadoEm: string;
  /* Indicadores da listagem (GET /api/assistidos) — ausentes/null nos demais endpoints. */
  responsavelNome?: string | null;
  responsavelParentesco?: string | null;
  responsavelTelefone?: string | null;
  /** % de presença nas aulas realizadas; null quando ainda não houve aula. */
  frequenciaPercentual?: number | null;
  totalAulas?: number | null;
  faltasConsecutivas?: number | null;
  /** Ativo com frequência < 75% ou 3+ faltas seguidas (regra no backend). */
  emAcompanhamento?: boolean | null;
}