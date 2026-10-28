import { NivelDisciplinar } from '../../enum/NivelDisciplinar';
import { PaginaResponse } from '../PaginaResponse';

export type OrigemRegistroDisciplinar = 'MANUAL' | 'PROGRESSAO';
export type StatusDocumentoDisciplinar = 'PENDENTE_ASSINATURA' | 'DEVOLVIDO_ASSINADO';
export type ConsequenciaDisciplinar =
  | 'ADVERTENCIA_GERADA'
  | 'SUSPENSAO_GERADA'
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
  motivoId: number;
  data: string;
  descricao: string;
  aulaId?: number | null;
  suspensaoInicio?: string | null;
  suspensaoFim?: string | null;
}

export interface RegistroDisciplinarDTO {
  registroId: number;
  assistidoId: number;
  nomeAssistido: string;
  motivoId: number | null;
  /** Nome do motivo ou o texto da progressão ("Gerada pela 3ª ocorrência"). */
  motivo: string;
  nivel: NivelDisciplinar;
  origem: OrigemRegistroDisciplinar;
  registroOrigemId: number | null;
  sequencia: number;
  dataRegistro: string;
  descricao: string;
  aulaId: number | null;
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
  incluirArquivados?: boolean;
  pagina?: number;
  tamanho?: number;
}
