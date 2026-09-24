/**
 * Nomes iguais aos da enum DayOfWeek do Java — o back desserializa
 * List<DayOfWeek> a partir do NOME (JSON string), não de número.
 * Mandar número aqui faz o Jackson usar o ordinal do enum (0-based),
 * que não bate com nada que o usuário escolheu na tela.
 */
export type DiaDaSemana =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface CriacaoAulasRequestDTO {
  turmaId: number;
  dataInicio: string;
  dataFim: string;
  diasDaSemana: DiaDaSemana[];
  horarioInicio: string;
  horarioFim: string;
  titulo?: string;
  descricao?: string;
  conteudoPrevisto?: string;
  objetivos?: string;
  recursosNecessarios?: string;
  observacoes?: string;
}
