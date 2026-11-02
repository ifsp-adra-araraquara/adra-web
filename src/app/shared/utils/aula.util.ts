import { StatusAula } from '../enum/StatusAula';
import { SituacaoAula } from '../enum/SituacaoAula';

/** Data de hoje no formato ISO (YYYY-MM-DD), igual ao que a API manda em `dataAula`. */
export function hojeISO(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Deriva a situação de abertura de uma aula a partir da data e do status
 * vindos da API. Regra: aula cancelada nunca abre; aula no futuro é
 * "pendente" e não abre; aula de hoje/passada com statusAula = REALIZADA
 * está "finalizada" (já foi dada a chamada); caso contrário está
 * "disponível" para abrir.
 */
export function calcularSituacaoAula(
  dataAula: string,
  statusAula: StatusAula | string | null | undefined,
): SituacaoAula {
  if (statusAula === StatusAula.CANCELADA) {
    return SituacaoAula.CANCELADA;
  }
  if (dataAula > hojeISO()) {
    return SituacaoAula.PENDENTE;
  }
  if (statusAula === StatusAula.REALIZADA) {
    return SituacaoAula.FINALIZADA;
  }
  return SituacaoAula.DISPONIVEL;
}

export const CLASSE_SITUACAO_AULA: Record<SituacaoAula, string> = {
  [SituacaoAula.PENDENTE]: 'situacao-pendente',
  [SituacaoAula.DISPONIVEL]: 'situacao-disponivel',
  [SituacaoAula.FINALIZADA]: 'situacao-finalizada',
  [SituacaoAula.CANCELADA]: 'situacao-cancelada',
};
