/** Período em que o link público recebe inscrições para um ano letivo. */
export interface PeriodoMatriculaDTO {
  ano: number;
  inicio: string;
  /** null = aberto até o Coordenador fechar. */
  fim: string | null;
  abertoHoje: boolean;
}

export interface PeriodoMatriculaRequestDTO {
  inicio: string;
  fim: string | null;
}

/** De que ano é a inscrição feita hoje pelo link público. */
export interface InscricaoAbertaDTO {
  ano: number;
  /** false = sem período aberto: a inscrição vale para o ano corrente. */
  periodoAberto: boolean;
}

/** Um dado da ficha ao lado do que a família enviou na rematrícula. */
export interface CampoComparadoDTO {
  rotulo: string;
  naFicha: string;
  enviado: string;
  diferente: boolean;
}

export interface ComparacaoRematriculaDTO {
  assistidoId: number;
  nomeAssistido: string;
  statusAssistido: 'ATIVO' | 'INATIVO';
  ano: number;
  jaMatriculadoNoAno: boolean;
  turmaAtualId: number | null;
  nomeTurmaAtual: string | null;
  campos: CampoComparadoDTO[];
}
