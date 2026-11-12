import { somarDias } from '../../../shared/components/navegador-data/navegador-data';

/** Domingo = 0 … Sábado = 6, como `Date.getDay()`. */
const NOMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const NOS_DIAS = [
  'aos domingos',
  'às segundas-feiras',
  'às terças-feiras',
  'às quartas-feiras',
  'às quintas-feiras',
  'às sextas-feiras',
  'aos sábados',
];

/** Dia da semana de uma data 'YYYY-MM-DD', sem passar por fuso. */
export function diaDaSemana(dataIso: string): number {
  const [ano, mes, dia] = dataIso.split('-').map(Number);
  return new Date(ano, mes - 1, dia).getDay();
}

export function nomeDoDia(dataIso: string): string {
  return NOMES[diaDaSemana(dataIso)];
}

export function ehFimDeSemana(dataIso: string): boolean {
  const d = diaDaSemana(dataIso);
  return d === 0 || d === 6;
}

function dataBrCurta(dataIso: string): string {
  return `${dataIso.slice(8, 10)}/${dataIso.slice(5, 7)}`;
}

/** "Hoje · Quarta-feira, 12/11/2026" ou "Sábado, 08/11/2026". */
export function tituloDoDia(dataIso: string, hojeIso: string): string {
  const completo = `${nomeDoDia(dataIso)}, ${dataBrCurta(dataIso)}/${dataIso.slice(0, 4)}`;
  return dataIso === hojeIso ? `Hoje · ${completo}` : completo;
}

/** Por que a lista está vazia (sem feriado nem exceção do calendário). */
export function motivoSemGrupos(dataIso: string): string {
  const d = diaDaSemana(dataIso);
  if (d === 0 || d === 6) {
    return `${NOMES[d]} não tem chamada: os grupos não funcionam aos fins de semana.`;
  }
  return `Nenhum grupo tem chamada ${NOS_DIAS[d]}. Confira os dias de chamada no cadastro do grupo.`;
}

/** Atalho para sair do fim de semana: o dia útil anterior (sexta) e o seguinte (segunda). */
export function diasUteisVizinhos(dataIso: string): { anterior: Atalho; proximo: Atalho } {
  let anterior = somarDias(dataIso, -1);
  while (ehFimDeSemana(anterior)) anterior = somarDias(anterior, -1);
  let proximo = somarDias(dataIso, 1);
  while (ehFimDeSemana(proximo)) proximo = somarDias(proximo, 1);
  return { anterior: atalho(anterior), proximo: atalho(proximo) };
}

export interface Atalho {
  data: string;
  rotulo: string;
}

function atalho(dataIso: string): Atalho {
  return { data: dataIso, rotulo: `${nomeDoDia(dataIso).replace('-feira', '')}, ${dataBrCurta(dataIso)}` };
}
