import { SituacaoAula } from '../enum/SituacaoAula';
import { StatusAula } from '../enum/StatusAula';
import { StatusGeral } from '../enum/StatusGeral';
import { StatusPresenca } from '../enum/StatusPresenca';

export type BadgeVariant = 'green' | 'gray' | 'amber' | 'coral' | 'blue' | 'teal' | 'red';

export interface BadgeStatusInfo {
  label: string;
  variant: BadgeVariant;
}

const BADGE_STATUS_MAP: Record<string, BadgeStatusInfo> = {
  [StatusGeral.ATIVO]: { label: 'Ativo', variant: 'green' },
  [StatusGeral.INATIVO]: { label: 'Inativo', variant: 'gray' },

  [StatusAula.PLANEJADA]: { label: 'Agendada', variant: 'blue' },
  [StatusAula.REALIZADA]: { label: 'Realizada', variant: 'green' },
  [StatusAula.CANCELADA]: { label: 'Cancelada', variant: 'coral' },
  [StatusAula.REMARCADA]: { label: 'Remarcada', variant: 'amber' },

  [StatusPresenca.PRESENTE]: { label: 'Presente', variant: 'green' },
  [StatusPresenca.FALTA]: { label: 'Falta', variant: 'coral' },
  [StatusPresenca.FALTA_JUSTIFICADA]: { label: 'Falta justificada', variant: 'amber' },

  [SituacaoAula.PENDENTE]: { label: 'Pendente', variant: 'gray' },
  [SituacaoAula.DISPONIVEL]: { label: 'Disponível', variant: 'amber' },
  [SituacaoAula.FINALIZADA]: { label: 'Finalizada', variant: 'green' },
  // SituacaoAula.CANCELADA e StatusAula.CANCELADA são o mesmo literal 'CANCELADA' —
  // já coberto pela entrada de StatusAula.CANCELADA acima.
};

export function resolveBadgeStatus(
  status: string | boolean | null | undefined,
): BadgeStatusInfo | null {
  if (status === null || status === undefined) {
    return null;
  }
  const chave = typeof status === 'boolean' ? (status ? StatusGeral.ATIVO : StatusGeral.INATIVO) : status;
  return BADGE_STATUS_MAP[chave] ?? null;
}