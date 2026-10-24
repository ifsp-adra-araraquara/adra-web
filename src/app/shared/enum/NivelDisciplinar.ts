import { BadgeVariant } from '../utils/badge-status.util';

/** Espelha `NivelDisciplinar` no back (cartazes "Disciplina ADRA" + comunicado de uniforme). */
export enum NivelDisciplinar {
  OCORRENCIA = 'OCORRENCIA',
  ADVERTENCIA = 'ADVERTENCIA',
  SUSPENSAO = 'SUSPENSAO',
  UNIFORME = 'UNIFORME',
}

export interface InfoNivelDisciplinar {
  rotulo: string;
  /** Rótulo no plural, para resumos ("3 ocorrências"). */
  plural: string;
  variant: BadgeVariant;
  /** O que acontece na 3ª, como nos cartazes. */
  consequencia: string;
}

/** Cores na mesma ordem dos cartazes: amarelo → laranja → vermelho; uniforme à parte. */
export const NIVEIS_DISCIPLINARES: Record<NivelDisciplinar, InfoNivelDisciplinar> = {
  [NivelDisciplinar.OCORRENCIA]: {
    rotulo: 'Ocorrência',
    plural: 'Ocorrências',
    variant: 'amber',
    consequencia: 'Na 3ª, gera advertência escrita para os pais assinarem.',
  },
  [NivelDisciplinar.ADVERTENCIA]: {
    rotulo: 'Advertência',
    plural: 'Advertências',
    variant: 'coral',
    consequencia: 'Na 3ª, suspensão de 3 dias.',
  },
  [NivelDisciplinar.SUSPENSAO]: {
    rotulo: 'Suspensão',
    plural: 'Suspensões',
    variant: 'red',
    consequencia: 'Na 3ª, perde o próximo passeio.',
  },
  [NivelDisciplinar.UNIFORME]: {
    rotulo: 'Uniforme',
    plural: 'Uniforme',
    variant: 'blue',
    consequencia: 'Na 3ª, só retorna acompanhado do responsável.',
  },
};

export const ORDEM_NIVEIS: NivelDisciplinar[] = [
  NivelDisciplinar.OCORRENCIA,
  NivelDisciplinar.ADVERTENCIA,
  NivelDisciplinar.SUSPENSAO,
  NivelDisciplinar.UNIFORME,
];
