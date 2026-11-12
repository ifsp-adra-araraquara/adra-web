import { NivelDisciplinar } from '../../enum/NivelDisciplinar';
import { Sexo } from '../../enum/Sexo';
import { PaginaResponse } from '../PaginaResponse';

export type OrigemRegistroDisciplinar = 'MANUAL' | 'RECOMENDACAO';
export type StatusDocumentoDisciplinar = 'PENDENTE_ASSINATURA' | 'DEVOLVIDO_ASSINADO';
export type ConsequenciaDisciplinar =
  | 'RECOMENDA_ADVERTENCIA'
  | 'RECOMENDA_SUSPENSAO'
  | 'PERDE_PROXIMO_PASSEIO'
  | 'RETORNO_COM_RESPONSAVEL';

export interface MotivoDisciplinarDTO {
  motivoId: number;
  nome: string;
  nivel: NivelDisciplinar;
  ativo: boolean;
}

export interface MotivoDisciplinarRequestDTO {
  nome: string;
  nivel: NivelDisciplinar;
  ativo?: boolean | null;
}

export interface RegistroDisciplinarRequestDTO {
  /** Ocorrência, advertência ou suspensão (e-mail da ADRA de 11/11: sem motivos pré-cadastrados). */
  nivel: NivelDisciplinar;
  /** Motivo escrito à mão, até 200 caracteres. */
  motivo: string;
  data: string;
  descricao: string;
  turmaId?: number | null;
  suspensaoInicio?: string | null;
  suspensaoFim?: string | null;
}

/** FT-22: um fato com um ou mais atendidos — um registro por atendido. */
export interface RegistroVariosRequestDTO {
  assistidoIds: number[];
  nivel: NivelDisciplinar;
  motivo: string;
  data: string;
  descricao: string;
}

export interface GerarPelaRecomendacaoRequestDTO {
  data: string;
  descricao: string;
  suspensaoInicio?: string | null;
  suspensaoFim?: string | null;
}

export interface RegistroDisciplinarDTO {
  registroId: number;
  assistidoId: number;
  nomeAssistido: string;
  /** Para o pronome do documento ("o atendido" / "a atendida"). */
  sexoAssistido: Sexo | null;
  motivoId: number | null;
  /** Nome do motivo ou, quando gerado pela recomendação, o texto "Gerada pela 3ª ocorrência". */
  motivo: string;
  nivel: NivelDisciplinar;
  origem: OrigemRegistroDisciplinar;
  registroOrigemId: number | null;
  sequencia: number;
  dataRegistro: string;
  descricao: string;
  turmaId: number | null;
  suspensaoInicio: string | null;
  suspensaoFim: string | null;
  documentoStatus: StatusDocumentoDisciplinar | null;
  documentoArquivoId: number | null;
  consequencia: ConsequenciaDisciplinar | null;
  consequenciaPendente: boolean;
  consequenciaResolvidaEm: string | null;
  consequenciaObservacao: string | null;
  consequenciaResolvidaPorNome: string | null;
  arquivado: boolean;
  arquivadoMotivo: string | null;
  arquivadoEm: string | null;
  arquivadoPorNome: string | null;
  registradoPorId: number;
  registradoPorNome: string;
  criadoEm: string;
  /** Só na consulta de um registro de suspensão (carta): dias de atividade do grupo no período. */
  suspensaoDiasDeAtividade?: number | null;
  /** Só na consulta de um registro de suspensão (carta): próximo dia de atividade depois do fim. */
  suspensaoRetorno?: string | null;
}

/** Período de suspensão em dias de atividade do grupo do atendido (reunião de 05/11). */
export interface PeriodoSuspensaoDTO {
  inicio: string;
  fim: string;
  diasDeAtividade: number;
  retorno: string;
}

/** Registro lançado + a recomendação pendente do atendido (registro que completou 3 do nível), se houver. */
export interface RegistroCriadoDTO {
  registro: RegistroDisciplinarDTO;
  recomendacao: RegistroDisciplinarDTO | null;
}

export interface ResumoDisciplinarDTO {
  ocorrenciasAtivas: number;
  advertenciasAtivas: number;
  suspensoesAtivas: number;
  uniformeAtivas: number;
  faltamParaAdvertencia: number;
  faltamParaSuspensao: number;
  faltamParaPerderPasseio: number;
  faltamParaRetornoComResponsavel: number;
  suspensoAte: string | null;
  retornoComResponsavelPendente: boolean;
  perdeProximoPasseio: boolean;
  documentosPendentes: number;
}

export interface FichaDisciplinarDTO {
  resumo: ResumoDisciplinarDTO;
  registros: RegistroDisciplinarDTO[];
}

export interface PendenciasDisciplinaresDTO {
  assistidosSuspensosHoje: number;
  retornosComResponsavelPendentes: number;
  perdemProximoPasseio: number;
  documentosAAssinar: number;
  recomendacoesAdvertencia: number;
  recomendacoesSuspensao: number;
}

export interface SinalizacaoDisciplinarDTO {
  assistidoId: number;
  suspensoAte: string | null;
  retornoComResponsavelPendente: boolean;
  perdeProximoPasseio: boolean;
}

export type PaginaRegistrosDisciplinares = PaginaResponse<RegistroDisciplinarDTO>;

export interface FiltroRegistrosDisciplinares {
  busca?: string;
  nivel?: NivelDisciplinar | null;
  somentePendencias?: boolean;
  somenteRecomendacoes?: boolean;
  incluirArquivados?: boolean;
  pagina?: number;
  tamanho?: number;
}

/** FT-24: sem nível, zera todos os níveis. */
export interface ZerarContagemRequestDTO {
  motivo: string;
  nivel: NivelDisciplinar | null;
}
