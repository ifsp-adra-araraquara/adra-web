/**
 * Robozinho ADRA — acha períodos no texto já normalizado: "outubro",
 * "out/2025", "10/2026", "mes passado", "ultimos 3 meses", "este ano",
 * "2025", "primeiro semestre". O robô trabalha por mês (yyyy-MM).
 */
import { numeroPorExtenso } from './texto';

export type TipoPeriodo = 'mes' | 'intervalo' | 'ano';

export interface Periodo {
  de: string;
  ate: string;
  tipo: TipoPeriodo;
  rotulo: string;
}

export const MESES = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
export const MESES_ROTULO = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
/** Abreviação só vale com ano junto ("out/2025", "set 2026"), para não confundir "dez" (10) e "set". */
const ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function ym(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

export function somarMeses(valor: string, quantos: number): string {
  const [a, m] = valor.split('-').map(Number);
  const total = a * 12 + (m - 1) + quantos;
  return ym(Math.floor(total / 12), (total % 12) + 1);
}

export function mesesEntre(de: string, ate: string): number {
  const [a1, m1] = de.split('-').map(Number);
  const [a2, m2] = ate.split('-').map(Number);
  return (a2 - a1) * 12 + (m2 - m1) + 1;
}

export function rotuloMes(valor: string): string {
  const [a, m] = valor.split('-').map(Number);
  return `${MESES_ROTULO[m - 1]} de ${a}`;
}

function rotuloIntervalo(de: string, ate: string): string {
  if (de === ate) return rotuloMes(de);
  const [a1, m1] = de.split('-').map(Number);
  const [a2, m2] = ate.split('-').map(Number);
  if (m1 === 1 && m2 === 12 && a1 === a2) return `${a1}`;
  if (a1 === a2) return `${MESES_ROTULO[m1 - 1]} a ${MESES_ROTULO[m2 - 1]} de ${a1}`;
  return `${MESES_ROTULO[m1 - 1]} de ${a1} a ${MESES_ROTULO[m2 - 1]} de ${a2}`;
}

export function periodoMes(valor: string): Periodo {
  return { de: valor, ate: valor, tipo: 'mes', rotulo: rotuloMes(valor) };
}

export function periodoIntervalo(de: string, ate: string, tipo: TipoPeriodo = 'intervalo'): Periodo {
  return { de, ate, tipo, rotulo: rotuloIntervalo(de, ate) };
}

/** Ano inteiro; o ano corrente vai só até o mês atual. */
export function periodoAno(ano: number, hoje: Date): Periodo {
  const atual = ym(hoje.getFullYear(), hoje.getMonth() + 1);
  const fim = ano === hoje.getFullYear() ? atual : ym(ano, 12);
  return { de: ym(ano, 1), ate: fim, tipo: 'ano', rotulo: ano === hoje.getFullYear() ? `${ano} (até agora)` : `${ano}` };
}

/** O período equivalente imediatamente anterior (mês → mês anterior; ano → ano anterior; intervalo → mesmo tamanho antes). */
export function periodoAnterior(p: Periodo, hoje: Date): Periodo {
  if (p.tipo === 'mes') return periodoMes(somarMeses(p.de, -1));
  if (p.tipo === 'ano') {
    const ano = Number(p.de.slice(0, 4)) - 1;
    const anterior = periodoAno(ano, hoje);
    // Ano corrente parcial: compara com o mesmo trecho do ano anterior.
    if (p.rotulo.includes('até agora')) {
      return periodoIntervalo(ym(ano, 1), ym(ano, Number(p.ate.slice(5, 7))));
    }
    return anterior;
  }
  const n = mesesEntre(p.de, p.ate);
  return periodoIntervalo(somarMeses(p.de, -n), somarMeses(p.ate, -n));
}

interface Achado {
  posicao: number;
  periodo: Periodo;
}

/**
 * Períodos na ordem em que aparecem. Mês sem ano: o mais recente que já
 * começou (em novembro, "dezembro" é o do ano passado).
 */
export function extrairPeriodos(texto: string, hoje: Date): Periodo[] {
  const achados: Achado[] = [];
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;
  const atual = ym(anoAtual, mesAtual);
  const ocupado: [number, number][] = [];
  const livre = (ini: number, fim: number) => ocupado.every(([a, b]) => fim <= a || ini >= b);
  const marcar = (re: RegExp, fn: (m: RegExpExecArray) => Periodo | null) => {
    for (const m of texto.matchAll(new RegExp(re.source, 'g'))) {
      const ini = m.index ?? 0;
      const fim = ini + m[0].length;
      if (!livre(ini, fim)) continue;
      const periodo = fn(m as RegExpExecArray);
      if (periodo) {
        achados.push({ posicao: ini, periodo });
        ocupado.push([ini, fim]);
      }
    }
  };
  const anoDe = (s: string) => {
    const n = Number(s);
    return s.length === 2 ? 2000 + n : n;
  };
  const anoProvavel = (mes: number) => (mes > mesAtual ? anoAtual - 1 : anoAtual);

  // "ultimos 3 meses", "ultimos tres meses", "ultimo trimestre/semestre"
  marcar(/\bultim[oa]s? (\d{1,2}|[a-z]+) mes(es)?\b/, (m) => {
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : numeroPorExtenso(m[1]);
    if (!n || n < 1) return null;
    if (n > MAXIMO_MESES) return periodoIntervalo(somarMeses(atual, -(MAXIMO_MESES - 1)), atual);
    return periodoIntervalo(somarMeses(atual, -(n - 1)), atual);
  });
  marcar(/\bultimo trimestre\b/, () => periodoIntervalo(somarMeses(atual, -2), atual));
  marcar(/\bultimo semestre\b/, () => periodoIntervalo(somarMeses(atual, -5), atual));
  // "primeiro/segundo semestre (de 2025)"
  marcar(/\b(primeiro|1o?|segundo|2o?) semestre(?: de)?(?: (\d{4}))?\b/, (m) => {
    const ano = m[2] ? Number(m[2]) : anoAtual;
    const primeiro = /^(primeiro|1o?)$/.test(m[1]);
    const de = ym(ano, primeiro ? 1 : 7);
    let ate = ym(ano, primeiro ? 6 : 12);
    if (ate > atual) ate = atual;
    if (de > atual) return null;
    return periodoIntervalo(de, ate);
  });
  marcar(/\b(este|esse|neste|nesse|deste|desse) semestre\b/, () =>
    periodoIntervalo(ym(anoAtual, mesAtual <= 6 ? 1 : 7), atual),
  );
  // mês por extenso, com ou sem ano
  marcar(new RegExp(`\\b(${MESES.join('|')})(?:(?: de| do)? (\\d{4}|\\d{2})\\b)?`), (m) => {
    const mes = MESES.indexOf(m[1]) + 1;
    const ano = m[2] ? anoDe(m[2]) : anoProvavel(mes);
    return periodoMes(ym(ano, mes));
  });
  // abreviação só com ano: "out/2025", "set 2026", "out/25"
  marcar(new RegExp(`\\b(${ABREV.join('|')})(?:/| de | )(\\d{4}|\\d{2})\\b`), (m) =>
    periodoMes(ym(anoDe(m[2]), ABREV.indexOf(m[1]) + 1)),
  );
  // 10/2026, 10/26, 2026/10
  marcar(/\b(\d{4})\/(\d{1,2})\b/, (m) => {
    const mes = Number(m[2]);
    return mes >= 1 && mes <= 12 ? periodoMes(ym(Number(m[1]), mes)) : null;
  });
  marcar(/\b(\d{1,2})\/(\d{4}|\d{2})\b/, (m) => {
    const mes = Number(m[1]);
    return mes >= 1 && mes <= 12 ? periodoMes(ym(anoDe(m[2]), mes)) : null;
  });
  // relativos
  marcar(/\b(mes passado|ultimo mes|mes anterior)\b/, () => periodoMes(somarMeses(atual, -1)));
  marcar(/\b(este|esse|neste|nesse|deste|desse) mes\b|\bmes atual\b|\bhoje\b|\b(esta|essa|nesta|nessa) semana\b/, () =>
    periodoMes(atual),
  );
  marcar(/\b(ano passado|ultimo ano|ano anterior)\b/, () => periodoAno(anoAtual - 1, hoje));
  marcar(/\b(este|esse|neste|nesse|deste|desse) ano\b|\bano atual\b/, () =>
    periodoAno(anoAtual, hoje),
  );
  // ano solto: 2020..ano atual
  marcar(/\b(20\d{2})\b/, (m) => {
    const ano = Number(m[1]);
    return ano >= 2000 && ano <= anoAtual ? periodoAno(ano, hoje) : null;
  });

  const vistos = new Set<string>();
  return achados
    .sort((a, b) => a.posicao - b.posicao)
    .map((a) => a.periodo)
    .filter((p) => {
      const chave = `${p.de}|${p.ate}`;
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    });
}

/** Maior período de UMA consulta (igual ao MAXIMO_MESES da API). Comparações viram consultas separadas. */
export const MAXIMO_MESES = 12;

/** Achados que caem no futuro são trazidos para o presente; nada passa de {@link MAXIMO_MESES}. */
export function limitarPeriodo(p: Periodo, hoje: Date): Periodo {
  const atual = ym(hoje.getFullYear(), hoje.getMonth() + 1);
  let { de, ate } = p;
  if (ate > atual) ate = atual;
  if (de > ate) de = ate;
  if (mesesEntre(de, ate) > MAXIMO_MESES) de = somarMeses(ate, -(MAXIMO_MESES - 1));
  return de === p.de && ate === p.ate ? p : { ...p, de, ate, rotulo: rotuloIntervalo(de, ate) };
}
