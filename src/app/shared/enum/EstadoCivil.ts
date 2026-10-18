export enum EstadoCivil {
  SOLTEIRO = 'SOLTEIRO',
  CASADO = 'CASADO',
  UNIAO_ESTAVEL = 'UNIAO_ESTAVEL',
  SEPARADO = 'SEPARADO',
  DIVORCIADO = 'DIVORCIADO',
  VIUVO = 'VIUVO',
}

export const ESTADO_CIVIL_LABELS: Record<EstadoCivil, string> = {
  [EstadoCivil.SOLTEIRO]: 'Solteiro(a)',
  [EstadoCivil.CASADO]: 'Casado(a)',
  [EstadoCivil.UNIAO_ESTAVEL]: 'União estável',
  [EstadoCivil.SEPARADO]: 'Separado(a)',
  [EstadoCivil.DIVORCIADO]: 'Divorciado(a)',
  [EstadoCivil.VIUVO]: 'Viúvo(a)',
};
