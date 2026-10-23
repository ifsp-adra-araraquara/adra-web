export enum Escolaridade {
  SEM_ESCOLARIDADE = 'SEM_ESCOLARIDADE',
  FUNDAMENTAL_INCOMPLETO = 'FUNDAMENTAL_INCOMPLETO',
  FUNDAMENTAL_COMPLETO = 'FUNDAMENTAL_COMPLETO',
  MEDIO_INCOMPLETO = 'MEDIO_INCOMPLETO',
  MEDIO_COMPLETO = 'MEDIO_COMPLETO',
  SUPERIOR_INCOMPLETO = 'SUPERIOR_INCOMPLETO',
  SUPERIOR_COMPLETO = 'SUPERIOR_COMPLETO',
  POS_GRADUACAO = 'POS_GRADUACAO',
}

export const ESCOLARIDADE_LABELS: Record<Escolaridade, string> = {
  [Escolaridade.SEM_ESCOLARIDADE]: 'Sem escolaridade',
  [Escolaridade.FUNDAMENTAL_INCOMPLETO]: 'Fundamental incompleto',
  [Escolaridade.FUNDAMENTAL_COMPLETO]: 'Fundamental completo',
  [Escolaridade.MEDIO_INCOMPLETO]: 'Médio incompleto',
  [Escolaridade.MEDIO_COMPLETO]: 'Médio completo',
  [Escolaridade.SUPERIOR_INCOMPLETO]: 'Superior incompleto',
  [Escolaridade.SUPERIOR_COMPLETO]: 'Superior completo',
  [Escolaridade.POS_GRADUACAO]: 'Pós-graduação',
};
