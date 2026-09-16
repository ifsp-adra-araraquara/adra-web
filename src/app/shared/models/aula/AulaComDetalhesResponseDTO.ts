import { StatusAula } from '../../enum/StatusAula';

export interface AulaComDetalhesResponseDTO {
  aulaId: number;
  turmaId: number | null;
  nomeTurma: string | null;
  nomeOficineiro: string | null;
  quantidadeAlunos: number | null;
  titulo: string | null;
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
