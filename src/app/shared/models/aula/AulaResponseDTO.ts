import { StatusAula } from '../../enum/StatusAula';

export interface AulaResponseDTO {
  aulaId: number;
  turmaId: number;
  titulo: string;
  descricao: string | null;
  dataAula: string;
  horarioInicio: string | null;
  horarioFim: string | null;
  conteudoPrevisto: string | null;
  conteudoMinistrado: string | null;
  objetivos: string | null;
  recursosNecessarios: string | null;
  statusAula: StatusAula;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
}