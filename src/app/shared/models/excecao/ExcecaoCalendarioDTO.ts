import { TipoExcecaoCalendario } from '../../enum/TipoExcecaoCalendario';

export interface ExcecaoCalendarioResponseDTO {
  excecaoId: number;
  dataExcecao: string;
  tipo: TipoExcecaoCalendario;
  descricao: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

/** `dataFim` opcional: cadastra um período (um registro por dia, até 120 dias). */
export interface ExcecaoCalendarioRequestDTO {
  dataExcecao: string;
  dataFim?: string | null;
  tipo: TipoExcecaoCalendario;
  descricao?: string | null;
}
