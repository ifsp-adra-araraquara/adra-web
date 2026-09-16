export interface CriacaoAulasRequestDTO {
  turmaId: number;
  dataInicio: string;
  dataFim: string;
  diasDaSemana: number[];
  horarioInicio: string;
  horarioFim: string;
  titulo?: string;
  descricao?: string;
  conteudoPrevisto?: string;
  objetivos?: string;
  recursosNecessarios?: string;
  observacoes?: string;
}
