/** Constantes e formatação compartilhadas pelos blocos do Painel do Coordenador (FT-05). */

/** Frequência mínima (LDB art. 24, VI) — mesmo limiar do back (IndicadorFrequencia). */
export const FREQUENCIA_MINIMA = 75;

export const NOMES_MES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
export const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export type Tom = 'bom' | 'ruim' | 'neutro';

export interface Variacao {
  texto: string;
  tom: Tom;
  seta: '↑' | '↓' | '';
}

/** "outubro de 2026" a partir de yyyy-MM. */
export function nomeMes(yyyyMm: string): string {
  const [ano, m] = yyyyMm.split('-').map(Number);
  return `${NOMES_MES[m - 1]} de ${ano}`;
}

/**
 * Variação contra o mês anterior ao `mes` (yyyy-MM): "↑ 6 vs set". A cor
 * diz se a mudança é boa — subir é bom para presença, ruim para disciplina.
 */
export function variacao(diferenca: number, mes: string, unidade: string, subirEhBom: boolean): Variacao {
  const m = Number(mes.slice(5, 7));
  const anterior = MES_CURTO[(m + 10) % 12];
  if (diferenca === 0) return { texto: `igual a ${anterior}`, tom: 'neutro', seta: '' };
  const subiu = diferenca > 0;
  return {
    texto: `${Math.abs(diferenca)}${unidade} vs ${anterior}`,
    tom: subiu === subirEhBom ? 'bom' : 'ruim',
    seta: subiu ? '↑' : '↓',
  };
}

export function dataCurta(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}
