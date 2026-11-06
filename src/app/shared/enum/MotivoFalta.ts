/** FT-13: falta justificada só por Atestado ou Suspensão (reunião de 28/10 com a ADRA). */
export enum MotivoFalta {
  ATESTADO = 'ATESTADO',
  SUSPENSAO = 'SUSPENSAO',
}

export const MOTIVO_FALTA_LABELS: Record<MotivoFalta, string> = {
  [MotivoFalta.ATESTADO]: 'Atestado',
  [MotivoFalta.SUSPENSAO]: 'Suspensão',
};
