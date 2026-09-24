import { StatusAula } from '../../enum/StatusAula';

export interface AulaRequestDTO {
  turmaId: number;
  titulo?: string;
  descricao?: string;
  dataAula: string;
  horarioInicio?: string;
  horarioFim?: string;
  conteudoPrevisto?: string;
  conteudoMinistrado?: string;
  objetivos?: string;
  recursosNecessarios?: string;
  statusAula?: StatusAula;
  observacoes?: string;
}