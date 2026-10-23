import { BadgeVariant } from '../utils/badge-status.util';

/** Motivo de um dia sem aula. */
export enum TipoExcecaoCalendario {
  FERIADO = 'FERIADO',
  RECESSO = 'RECESSO',
  FERIAS = 'FERIAS',
  PONTO_FACULTATIVO = 'PONTO_FACULTATIVO',
  EVENTO_PASSEIO = 'EVENTO_PASSEIO',
  OUTRO = 'OUTRO',
}

export const TIPO_EXCECAO_INFO: Record<TipoExcecaoCalendario, { label: string; variant: BadgeVariant }> = {
  [TipoExcecaoCalendario.FERIADO]: { label: 'Feriado', variant: 'red' },
  [TipoExcecaoCalendario.RECESSO]: { label: 'Recesso', variant: 'gray' },
  [TipoExcecaoCalendario.FERIAS]: { label: 'Férias', variant: 'teal' },
  [TipoExcecaoCalendario.PONTO_FACULTATIVO]: { label: 'Ponto facultativo', variant: 'amber' },
  [TipoExcecaoCalendario.EVENTO_PASSEIO]: { label: 'Evento / passeio', variant: 'blue' },
  [TipoExcecaoCalendario.OUTRO]: { label: 'Sem aula', variant: 'gray' },
};
