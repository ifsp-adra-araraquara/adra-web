export enum ProgramaTransferencia {
  BPC = 'BPC',
  BOLSA_FAMILIA = 'BOLSA_FAMILIA',
  PETI = 'PETI',
  BOLSA_ESCOLA = 'BOLSA_ESCOLA',
  AUXILIO_GAS = 'AUXILIO_GAS',
  ALUGUEL_SOCIAL = 'ALUGUEL_SOCIAL',
  OUTRO = 'OUTRO',
}

export const PROGRAMA_TRANSFERENCIA_LABELS: Record<ProgramaTransferencia, string> = {
  [ProgramaTransferencia.BPC]: 'BPC',
  [ProgramaTransferencia.BOLSA_FAMILIA]: 'Bolsa Família',
  [ProgramaTransferencia.PETI]: 'PETI',
  [ProgramaTransferencia.BOLSA_ESCOLA]: 'Bolsa Escola',
  [ProgramaTransferencia.AUXILIO_GAS]: 'Auxílio Gás',
  [ProgramaTransferencia.ALUGUEL_SOCIAL]: 'Aluguel Social',
  [ProgramaTransferencia.OUTRO]: 'Outro',
};
