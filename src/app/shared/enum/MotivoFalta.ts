export enum MotivoFalta {
  SAUDE = 'SAUDE',
  VIAGEM = 'VIAGEM',
  TRABALHO = 'TRABALHO',
  MOTIVO_FAMILIAR = 'MOTIVO_FAMILIAR',
  OUTRO = 'OUTRO',
}

// Valores provisórios (mesma pendência do back — ver MotivoFalta.java):
// ainda a confirmar com a coordenação antes de fechar de vez.
export const MOTIVO_FALTA_LABELS: Record<MotivoFalta, string> = {
  [MotivoFalta.SAUDE]: 'Saúde',
  [MotivoFalta.VIAGEM]: 'Viagem',
  [MotivoFalta.TRABALHO]: 'Trabalho',
  [MotivoFalta.MOTIVO_FAMILIAR]: 'Motivo familiar',
  [MotivoFalta.OUTRO]: 'Outro',
};

export const MOTIVO_FALTA_OPTIONS: { value: MotivoFalta; label: string }[] = Object.values(
  MotivoFalta,
).map((v) => ({ value: v, label: MOTIVO_FALTA_LABELS[v] }));
