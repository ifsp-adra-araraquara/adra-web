import { TipoExcecaoCalendario } from '../enum/TipoExcecaoCalendario';

export interface FeriadoNacional {
  data: string; // YYYY-MM-DD
  nome: string;
  tipo: TipoExcecaoCalendario.FERIADO | TipoExcecaoCalendario.PONTO_FACULTATIVO;
}

function iso(ano: number, mes: number, dia: number): string {
  const d = new Date(ano, mes - 1, dia);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
function pascoa(ano: number): { mes: number; dia: number } {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return { mes, dia };
}

/**
 * Feriados nacionais (e os pontos facultativos nacionais de Carnaval e Corpus
 * Christi) de um ano. Feriados municipais/estaduais entram por "Dias sem aula".
 */
export function feriadosNacionais(ano: number): FeriadoNacional[] {
  const p = pascoa(ano);
  const relativoPascoa = (dias: number) => iso(ano, p.mes, p.dia + dias);
  const F = TipoExcecaoCalendario.FERIADO;
  const PF = TipoExcecaoCalendario.PONTO_FACULTATIVO;
  return [
    { data: iso(ano, 1, 1), nome: 'Confraternização Universal', tipo: F },
    { data: relativoPascoa(-48), nome: 'Carnaval', tipo: PF },
    { data: relativoPascoa(-47), nome: 'Carnaval', tipo: PF },
    { data: relativoPascoa(-2), nome: 'Sexta-feira Santa', tipo: F },
    { data: iso(ano, 4, 21), nome: 'Tiradentes', tipo: F },
    { data: iso(ano, 5, 1), nome: 'Dia do Trabalho', tipo: F },
    { data: relativoPascoa(60), nome: 'Corpus Christi', tipo: PF },
    { data: iso(ano, 9, 7), nome: 'Independência do Brasil', tipo: F },
    { data: iso(ano, 10, 12), nome: 'Nossa Senhora Aparecida', tipo: F },
    { data: iso(ano, 11, 2), nome: 'Finados', tipo: F },
    { data: iso(ano, 11, 15), nome: 'Proclamação da República', tipo: F },
    { data: iso(ano, 11, 20), nome: 'Dia Nacional de Zumbi e da Consciência Negra', tipo: F },
    { data: iso(ano, 12, 25), nome: 'Natal', tipo: F },
  ];
}
