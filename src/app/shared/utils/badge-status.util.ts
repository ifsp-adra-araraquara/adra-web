import { SituacaoAula } from '../enum/SituacaoAula';
import { StatusAula } from '../enum/StatusAula';
import { StatusGeral } from '../enum/StatusGeral';
import { StatusPresenca } from '../enum/StatusPresenca';

/** Cores disponíveis para o `app-badge`, uma para cada classe `.b-*` definida em `styles.css`. */
export type BadgeVariant = 'green' | 'gray' | 'amber' | 'coral' | 'blue' | 'teal' | 'red';

export interface BadgeStatusInfo {
  label: string;
  variant: BadgeVariant;
}

/**
 * Paleta única de status usada pelo `app-badge` em todo o sistema — a ideia é que
 * qualquer tela que precise de um badge de status só precise passar o valor que já
 * vem da API (enum ou booleano `ativo`), sem redefinir cor/rótulo tela a tela.
 *
 * Os status de aula (agendada/realizada/cancelada/remarcada) já estão mapeados aqui
 * porque serão reaproveitados na US-64.
 */
const BADGE_STATUS_MAP: Record<string, BadgeStatusInfo> = {
  [StatusGeral.ATIVO]: { label: 'Ativo', variant: 'green' },
  [StatusGeral.INATIVO]: { label: 'Inativo', variant: 'gray' },

  [StatusAula.PLANEJADA]: { label: 'Agendada', variant: 'blue' },
  [StatusAula.REALIZADA]: { label: 'Realizada', variant: 'green' },
  [StatusAula.CANCELADA]: { label: 'Cancelada', variant: 'coral' },
  [StatusAula.ADIADA]: { label: 'Remarcada', variant: 'amber' },
  [StatusAula.REMARCADA]: { label: 'Remarcada', variant: 'amber' },

  [StatusPresenca.PRESENTE]: { label: 'Presente', variant: 'green' },
  [StatusPresenca.FALTA]: { label: 'Falta', variant: 'coral' },
  [StatusPresenca.FALTA_JUSTIFICADA]: { label: 'Falta justificada', variant: 'amber' },

  [SituacaoAula.PENDENTE]: { label: 'Pendente', variant: 'gray' },
  [SituacaoAula.DISPONIVEL]: { label: 'Disponível', variant: 'amber' },
  [SituacaoAula.FINALIZADA]: { label: 'Finalizada', variant: 'green' },
};

/**
 * Resolve rótulo + cor para um valor de status conhecido do sistema.
 * Aceita booleano como atalho para os campos `ativo` (oficina, turma, etc.).
 */
export function resolveBadgeStatus(
  status: string | boolean | null | undefined,
): BadgeStatusInfo | null {
  if (status === null || status === undefined) {
    return null;
  }

  const chave = typeof status === 'boolean' ? (status ? StatusGeral.ATIVO : StatusGeral.INATIVO) : status;

  return BADGE_STATUS_MAP[chave] ?? null;
}
