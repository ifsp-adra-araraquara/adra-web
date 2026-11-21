/**
 * ADRAbot — uma função por intenção: busca os números (só GET) e monta a
 * resposta, a interpretação, os próximos passos e o relatório em PDF.
 * Nada é inventado: sem dado, a resposta diz que não há dado.
 */
import { Role } from '../../../shared/enum/role.enum';
import { StatusChamada } from '../../../shared/enum/StatusChamada';
import { StatusPresenca } from '../../../shared/enum/StatusPresenca';
import { ajudaPorIntencao } from '../motor/ajuda';
import { INTENCOES_DADOS, intencaoPorId } from '../motor/catalogo';
import {
  MAXIMO_MESES,
  MESES_ROTULO,
  Periodo,
  mesesEntre,
  periodoAno,
  periodoAnterior,
  periodoIntervalo,
  periodoMes,
  rotuloMes,
  somarMeses,
  ym,
} from '../motor/periodo';
import { Entidades, Intencao, Lacunas } from '../motor/tipos';
import { AtendidoRoboDTO, FrequenciaLinha, RoboDados } from '../dados/robo-dados.service';
import {
  Acao,
  Barra,
  CRITERIO_FREQUENCIA,
  DIAS_SEMANA,
  Relatorio,
  Resposta,
  Tabela,
  barrasDeContagem,
  capitalizar,
  dataBr,
  moeda,
  num,
  pct,
  percentual,
  plural,
  rotulo,
  variacao,
} from './resposta';

export interface Contexto {
  lacunas: Lacunas;
  perfil: Role;
  hoje: Date;
  dados: RoboDados;
  entidades: Entidades;
}

type Executor = (ctx: Contexto) => Promise<Resposta>;

/* ======================= Ajudantes ======================= */

const PDF: Acao = { tipo: 'pdf', rotulo: 'Gerar PDF' };

function mesAtual(hoje: Date): string {
  return ym(hoje.getFullYear(), hoje.getMonth() + 1);
}

function periodoOuMesAtual(ctx: Contexto): Periodo {
  return ctx.lacunas.periodos[0] ?? periodoMes(mesAtual(ctx.hoje));
}

/** "Considerei novembro de 2026" quando a pessoa não disse o período. */
function notaDePeriodo(ctx: Contexto, p: Periodo): string | null {
  return ctx.lacunas.periodos.length ? null : `Considerei ${p.rotulo}. Para outro período, é só dizer (ex.: "e em setembro?").`;
}

function pode(ctx: Contexto, id: string): boolean {
  return !!intencaoPorId(id)?.perfis.includes(ctx.perfil);
}

function perguntar(ctx: Contexto, id: string, rotuloAcao?: string, lacunas?: Lacunas): Acao | null {
  const i = intencaoPorId(id);
  if (!i || !i.perfis.includes(ctx.perfil)) return null;
  return { tipo: 'executar', rotulo: rotuloAcao ?? i.titulo, intencaoId: id, lacunas };
}

function acoes(...lista: (Acao | null | undefined | false)[]): Acao[] {
  return lista.filter((a): a is Acao => !!a).slice(0, 4);
}

function comLacunas(ctx: Contexto, mudar: Partial<Lacunas>): Lacunas {
  return { ...ctx.lacunas, ...mudar };
}

interface Soma {
  chamadas: number;
  esperados: number;
  faltas: number;
  justificadas: number;
}

function somar(linhas: FrequenciaLinha[]): Soma & { percentual: number | null } {
  const s = linhas.reduce<Soma>(
    (acc, l) => ({
      chamadas: acc.chamadas + l.chamadas,
      esperados: acc.esperados + l.esperados,
      faltas: acc.faltas + l.faltas,
      justificadas: acc.justificadas + l.justificadas,
    }),
    { chamadas: 0, esperados: 0, faltas: 0, justificadas: 0 },
  );
  return { ...s, percentual: percentual(s.esperados, s.faltas + s.justificadas) };
}

interface PorGrupo extends Soma {
  turmaId: number;
  nome: string;
  oficinas: string | null;
  percentual: number | null;
}

function porGrupo(linhas: FrequenciaLinha[]): PorGrupo[] {
  const mapa = new Map<number, FrequenciaLinha[]>();
  for (const l of linhas) mapa.set(l.turmaId, [...(mapa.get(l.turmaId) ?? []), l]);
  return [...mapa.values()]
    .map((ls) => ({ turmaId: ls[0].turmaId, nome: ls[0].nomeTurma, oficinas: ls[0].oficinas, ...somar(ls) }))
    .sort((a, b) => (a.percentual ?? 101) - (b.percentual ?? 101) || a.nome.localeCompare(b.nome, 'pt-BR'));
}

function tabelaFrequencia(grupos: PorGrupo[]): Tabela {
  return {
    colunas: ['Grupo', 'Oficinas', 'Chamadas', 'Esperados', 'Faltas', 'FJ', 'Frequência'],
    numericas: [2, 3, 4, 5, 6],
    linhas: grupos.map((g) => [g.nome, g.oficinas ?? '—', num(g.chamadas), num(g.esperados), num(g.faltas), num(g.justificadas), pct(g.percentual)]),
  };
}

function barrasFrequencia(itens: { nome: string; percentual: number | null }[], destacarMenor = true): Barra[] {
  const menor = Math.min(...itens.map((i) => i.percentual ?? 101));
  return itens.map((i) => ({
    rotulo: i.nome,
    valor: i.percentual ?? 0,
    texto: pct(i.percentual),
    destaque: destacarMenor && i.percentual === menor && itens.length > 1,
  }));
}

function relatorio(titulo: string, subtitulo: string, r: Resposta, tabelas: Tabela[], extra: Partial<Relatorio> = {}): Relatorio {
  return {
    titulo,
    subtitulo,
    resumo: [...r.texto, ...(r.interpretacao ?? [])],
    tabelas,
    criterio: r.criterio,
    ...extra,
  };
}

async function acharAtendido(ctx: Contexto, intencaoId: string): Promise<{ atendido: AtendidoRoboDTO } | { resposta: Resposta }> {
  const nome = ctx.lacunas.nome ?? '';
  const achados = await ctx.dados.buscarAtendidos(nome);
  if (!achados.length) {
    return {
      resposta: {
        texto: [`Não encontrei atendido ativo com o nome **${nome}**.`],
        interpretacao: ['Confira a grafia ou digite o nome e o sobrenome.'],
        acoes: acoes(perguntar(ctx, 'freq.grupo', 'Frequência dos grupos'), { tipo: 'menu', rotulo: 'O que eu sei responder' }),
        humor: 'confuso',
      },
    };
  }
  const exato = achados.find((a) => a.nome.toLowerCase() === nome.toLowerCase());
  if (achados.length === 1 || exato) return { atendido: exato ?? achados[0] };
  return {
    resposta: {
      texto: [`Achei ${plural(achados.length, 'atendido', 'atendidos')} com **${nome}**. De quem você está falando?`],
      acoes: achados.slice(0, 4).map((a) => ({
        tipo: 'executar',
        rotulo: a.grupo ? `${a.nome} (${a.grupo})` : a.nome,
        intencaoId,
        lacunas: comLacunas(ctx, { nome: a.nome }),
      })),
    },
  };
}

/* ======================= Frequência ======================= */

const freqGrupo: Executor = async (ctx) => {
  const { lacunas } = ctx;
  if (lacunas.comparar || lacunas.periodos.length >= 2) return freqEvolucao(ctx);
  const p = periodoOuMesAtual(ctx);
  const anterior = periodoAnterior(p, ctx.hoje);
  // Período + o anterior numa consulta só, se couber em 12 meses; senão, só o período.
  const busca = mesesEntre(anterior.de, p.ate) <= MAXIMO_MESES ? anterior.de : p.de;
  const dto = await ctx.dados.frequencia(busca, p.ate);
  const doPeriodo = dto.linhas.filter((l) => l.mes >= p.de && l.mes <= p.ate);
  const doAnterior = dto.linhas.filter((l) => l.mes >= anterior.de && l.mes <= anterior.ate);
  const grupos = porGrupo(doPeriodo);
  const nota = notaDePeriodo(ctx, p);

  if (lacunas.grupo) {
    const g = lacunas.grupo;
    const doGrupo = grupos.find((x) => x.turmaId === g.id);
    if (!doGrupo) {
      return {
        texto: [`Não há chamada lançada para o **${g.nome}** em **${p.rotulo}**.`],
        interpretacao: nota ? [nota] : [],
        acoes: acoes(
          perguntar(ctx, 'freq.grupo', `Frequência de ${periodoAnterior(p, ctx.hoje).rotulo}`, comLacunas(ctx, { periodos: [anterior] })),
          { tipo: 'navegar', rotulo: 'Abrir Chamada', rota: '/chamada' },
          { tipo: 'menu', rotulo: 'Outra pergunta' },
        ),
      };
    }
    const ant = somar(doAnterior.filter((l) => l.turmaId === g.id)).percentual;
    const geral = somar(doPeriodo).percentual;
    const posicao = grupos.findIndex((x) => x.turmaId === g.id);
    const interp = [
      variacao(doGrupo.percentual, ant, anterior.rotulo),
      grupos.length > 1
        ? posicao === 0
          ? `É a menor entre os ${grupos.length} grupos com chamada.`
          : posicao === grupos.length - 1
            ? `É a maior entre os ${grupos.length} grupos com chamada.`
            : `A média geral foi ${pct(geral)}.`
        : null,
      `${plural(doGrupo.faltas, 'falta', 'faltas')} e ${plural(doGrupo.justificadas, 'falta justificada', 'faltas justificadas')} em ${plural(doGrupo.chamadas, 'chamada', 'chamadas')}.`,
      nota,
    ].filter((x): x is string => !!x);
    const r: Resposta = {
      texto: [`A frequência do **${g.nome}** em **${p.rotulo}** foi de **${pct(doGrupo.percentual)}**.`],
      interpretacao: interp,
      criterio: CRITERIO_FREQUENCIA,
      acoes: acoes(
        PDF,
        perguntar(ctx, 'freq.evolucao', `Comparar com ${anterior.rotulo}`, comLacunas(ctx, { comparar: true, periodos: [p] })),
        perguntar(ctx, 'freq.faltas.seguidas', 'Quem está faltando seguido?', comLacunas(ctx, {})),
        ctx.perfil === Role.OFICINEIRO
          ? perguntar(ctx, 'freq.dia.semana', 'Faltas por dia da semana', comLacunas(ctx, {}))
          : { tipo: 'navegar', rotulo: 'Abrir a grade do mês', rota: `/chamada/turma/${g.id}/grade`, query: { mes: p.ate } },
      ),
    };
    r.relatorio = relatorio(`Frequência — ${g.nome}`, capitalizar(p.rotulo), r, [tabelaFrequencia([doGrupo])]);
    return r;
  }

  if (!grupos.length) {
    return {
      texto: [`Não há chamada lançada em **${p.rotulo}**.`],
      interpretacao: nota ? [nota] : [],
      acoes: acoes(
        perguntar(ctx, 'freq.grupo', `Frequência de ${anterior.rotulo}`, comLacunas(ctx, { periodos: [anterior] })),
        { tipo: 'navegar', rotulo: 'Abrir Chamada', rota: '/chamada' },
      ),
    };
  }
  const geral = somar(doPeriodo);
  const ant = somar(doAnterior).percentual;
  const pior = grupos[0];
  const melhor = grupos[grupos.length - 1];
  const r: Resposta = {
    texto: [`A frequência geral em **${p.rotulo}** foi de **${pct(geral.percentual)}**.`],
    interpretacao: [
      variacao(geral.percentual, ant, anterior.rotulo),
      grupos.length > 1 ? `A menor foi do **${pior.nome}** (${pct(pior.percentual)}) e a maior, do **${melhor.nome}** (${pct(melhor.percentual)}).` : null,
      `${plural(geral.faltas, 'falta', 'faltas')} e ${plural(geral.justificadas, 'justificada', 'justificadas')} em ${plural(geral.chamadas, 'chamada lançada', 'chamadas lançadas')}.`,
      nota,
    ].filter((x): x is string => !!x),
    barras: barrasFrequencia(grupos.map((g) => ({ nome: g.nome, percentual: g.percentual }))).slice(0, 8),
    criterio: CRITERIO_FREQUENCIA,
    acoes: acoes(
      PDF,
      perguntar(ctx, 'freq.evolucao', `Comparar com ${anterior.rotulo}`, comLacunas(ctx, { comparar: true, periodos: [p] })),
      perguntar(ctx, 'freq.faltas.seguidas', 'Quem está faltando seguido?'),
      perguntar(ctx, 'freq.oficinas', 'Por oficina', comLacunas(ctx, {})),
    ),
  };
  r.relatorio = relatorio('Frequência dos grupos', capitalizar(p.rotulo), r, [tabelaFrequencia(grupos)], { paisagem: true });
  return r;
};

const freqEvolucao: Executor = async (ctx) => {
  const { lacunas, hoje } = ctx;
  let periodos: Periodo[];
  if (lacunas.periodos.length >= 2) periodos = lacunas.periodos.slice(0, 2);
  else if (lacunas.periodos.length === 1 && lacunas.comparar) periodos = [periodoAnterior(lacunas.periodos[0], hoje), lacunas.periodos[0]];
  else if (lacunas.periodos.length === 1 && lacunas.periodos[0].tipo !== 'mes') periodos = [];
  else if (lacunas.comparar) {
    const atual = periodoMes(mesAtual(hoje));
    periodos = [periodoAnterior(atual, hoje), atual];
  } else periodos = [];

  const grupo = lacunas.grupo;
  const filtrar = (ls: FrequenciaLinha[]) => (grupo ? ls.filter((l) => l.turmaId === grupo.id) : ls);
  const sobre = grupo ? `do **${grupo.nome}**` : 'geral';

  // Comparação de dois períodos
  if (periodos.length === 2) {
    // Juntos cabem em uma consulta (≤ 12 meses)? Uma só. Senão, uma por período (cada uma ≤ 12 meses).
    const ordenados = [...periodos].sort((a, b) => a.de.localeCompare(b.de));
    const ate = ordenados[1].ate > ordenados[0].ate ? ordenados[1].ate : ordenados[0].ate;
    const juntos = mesesEntre(ordenados[0].de, ate) <= MAXIMO_MESES;
    const linhas = filtrar(
      juntos
        ? (await ctx.dados.frequencia(ordenados[0].de, ate)).linhas
        : [
            ...(await ctx.dados.frequencia(ordenados[0].de, ordenados[0].ate)).linhas,
            ...(await ctx.dados.frequencia(ordenados[1].de, ordenados[1].ate)).linhas,
          ],
    );
    const [a, b] = periodos.map((p) => ({ p, s: somar(linhas.filter((l) => l.mes >= p.de && l.mes <= p.ate)) }));
    const d = a.s.percentual != null && b.s.percentual != null ? b.s.percentual - a.s.percentual : null;
    const r: Resposta = {
      texto: [
        `Frequência ${sobre}: **${pct(a.s.percentual)}** em ${a.p.rotulo} e **${pct(b.s.percentual)}** em ${b.p.rotulo}.`,
      ],
      interpretacao: [
        d == null ? 'Um dos períodos não tem chamada lançada, então não dá para comparar.' : d === 0 ? 'Ficou igual.' : `${d > 0 ? 'Subiu' : 'Caiu'} ${plural(Math.abs(d), 'ponto', 'pontos')}.`,
        `Faltas: ${num(a.s.faltas)} → ${num(b.s.faltas)}. Justificadas: ${num(a.s.justificadas)} → ${num(b.s.justificadas)}.`,
      ],
      barras: barrasFrequencia([
        { nome: capitalizar(a.p.rotulo), percentual: a.s.percentual },
        { nome: capitalizar(b.p.rotulo), percentual: b.s.percentual },
      ], false),
      criterio: CRITERIO_FREQUENCIA,
      acoes: acoes(PDF, perguntar(ctx, 'freq.evolucao', 'Últimos 6 meses', comLacunas(ctx, { periodos: [], comparar: false })), perguntar(ctx, 'freq.comparar.grupos', 'Comparar grupos', comLacunas(ctx, { periodos: [b.p], comparar: false, grupo: undefined }))),
    };
    const tabelas: Tabela[] = [{
      colunas: ['Período', 'Chamadas', 'Esperados', 'Faltas', 'FJ', 'Frequência'],
      numericas: [1, 2, 3, 4, 5],
      linhas: [a, b].map((x) => [capitalizar(x.p.rotulo), num(x.s.chamadas), num(x.s.esperados), num(x.s.faltas), num(x.s.justificadas), pct(x.s.percentual)]),
    }];
    if (!grupo) {
      const ga = porGrupo(linhas.filter((l) => l.mes >= a.p.de && l.mes <= a.p.ate));
      const gb = porGrupo(linhas.filter((l) => l.mes >= b.p.de && l.mes <= b.p.ate));
      const nomes = [...new Set([...ga, ...gb].map((g) => g.nome))].sort((x, y) => x.localeCompare(y, 'pt-BR'));
      tabelas.push({
        titulo: 'Por grupo',
        colunas: ['Grupo', capitalizar(a.p.rotulo), capitalizar(b.p.rotulo), 'Diferença'],
        numericas: [1, 2, 3],
        linhas: nomes.map((n) => {
          const x = ga.find((g) => g.nome === n)?.percentual ?? null;
          const y = gb.find((g) => g.nome === n)?.percentual ?? null;
          return [n, pct(x), pct(y), x != null && y != null ? `${y - x > 0 ? '+' : ''}${y - x}` : '—'];
        }),
      });
    }
    r.relatorio = relatorio(`Comparativo de frequência${grupo ? ` — ${grupo.nome}` : ''}`, `${capitalizar(a.p.rotulo)} × ${b.p.rotulo}`, r, tabelas);
    return r;
  }

  // Série mês a mês
  const alvo = lacunas.periodos[0] && lacunas.periodos[0].tipo !== 'mes' ? lacunas.periodos[0] : periodoIntervalo(somarMeses(mesAtual(hoje), -5), mesAtual(hoje));
  const dto = await ctx.dados.frequencia(alvo.de, alvo.ate);
  const linhas = filtrar(dto.linhas);
  const meses: string[] = [];
  for (let m = alvo.de; m <= alvo.ate; m = somarMeses(m, 1)) meses.push(m);
  const serie = meses.map((m) => ({ m, s: somar(linhas.filter((l) => l.mes === m)) }));
  const comDado = serie.filter((x) => x.s.percentual != null);
  const primeiro = comDado[0];
  const ultimo = comDado[comDado.length - 1];
  const melhor = [...comDado].sort((x, y) => (y.s.percentual ?? 0) - (x.s.percentual ?? 0))[0];
  const pior = [...comDado].sort((x, y) => (x.s.percentual ?? 0) - (y.s.percentual ?? 0))[0];
  const r: Resposta = {
    texto: comDado.length
      ? [`Frequência ${sobre} de ${alvo.rotulo}: de **${pct(primeiro.s.percentual)}** em ${rotuloMes(primeiro.m)} para **${pct(ultimo.s.percentual)}** em ${rotuloMes(ultimo.m)}.`]
      : [`Não há chamada lançada ${grupo ? `para o **${grupo.nome}** ` : ''}em ${alvo.rotulo}.`],
    interpretacao: comDado.length > 1 ? [`Melhor mês: ${rotuloMes(melhor.m)} (${pct(melhor.s.percentual)}). Pior: ${rotuloMes(pior.m)} (${pct(pior.s.percentual)}).`] : [],
    barras: serie.map((x) => ({
      rotulo: capitalizar(MESES_ROTULO[Number(x.m.slice(5, 7)) - 1].slice(0, 3)) + `/${x.m.slice(2, 4)}`,
      valor: x.s.percentual ?? 0,
      texto: pct(x.s.percentual),
      destaque: x === pior && comDado.length > 1,
    })),
    criterio: CRITERIO_FREQUENCIA,
    acoes: acoes(PDF, perguntar(ctx, 'freq.comparar.grupos', 'Comparar grupos', comLacunas(ctx, { periodos: [periodoMes(mesAtual(hoje))], comparar: false, grupo: undefined })), perguntar(ctx, 'freq.faltas.seguidas', 'Quem está faltando seguido?')),
  };
  r.relatorio = relatorio(`Frequência mês a mês${grupo ? ` — ${grupo.nome}` : ''}`, capitalizar(alvo.rotulo), r, [{
    colunas: ['Mês', 'Chamadas', 'Esperados', 'Faltas', 'FJ', 'Frequência'],
    numericas: [1, 2, 3, 4, 5],
    linhas: serie.map((x) => [capitalizar(rotuloMes(x.m)), num(x.s.chamadas), num(x.s.esperados), num(x.s.faltas), num(x.s.justificadas), pct(x.s.percentual)]),
  }]);
  return r;
};

const freqCompararGrupos: Executor = async (ctx) => {
  if (ctx.lacunas.periodos.length >= 2) return freqEvolucao(ctx);
  return freqGrupo(comCtx(ctx, { grupo: undefined, comparar: false }));
};

function comCtx(ctx: Contexto, mudar: Partial<Lacunas>): Contexto {
  return { ...ctx, lacunas: comLacunas(ctx, mudar) };
}

const freqOficinas: Executor = async (ctx) => {
  const p = periodoOuMesAtual(ctx);
  const dto = await ctx.dados.frequencia(p.de, p.ate);
  const porOficina = new Map<string, FrequenciaLinha[]>();
  for (const l of dto.linhas) {
    for (const nome of (l.oficinas ?? 'Sem oficina').split(', ')) porOficina.set(nome, [...(porOficina.get(nome) ?? []), l]);
  }
  const oficinas = [...porOficina.entries()]
    .map(([nome, ls]) => ({ nome, ...somar(ls) }))
    .sort((a, b) => (a.percentual ?? 101) - (b.percentual ?? 101));
  const nota = notaDePeriodo(ctx, p);
  const alvo = ctx.lacunas.oficina;
  if (alvo) {
    const o = oficinas.find((x) => x.nome === alvo.nome);
    const r: Resposta = o
      ? {
          texto: [`A frequência da oficina **${alvo.nome}** em **${p.rotulo}** foi de **${pct(o.percentual)}**.`],
          interpretacao: [`${plural(o.faltas, 'falta', 'faltas')} e ${plural(o.justificadas, 'justificada', 'justificadas')} em ${plural(o.chamadas, 'chamada', 'chamadas')}.`, ...(nota ? [nota] : [])],
          criterio: CRITERIO_FREQUENCIA,
          acoes: acoes(PDF, perguntar(ctx, 'freq.oficinas', 'Ranking das oficinas', comLacunas(ctx, { oficina: undefined }))),
        }
      : { texto: [`Não há chamada lançada nos grupos da oficina **${alvo.nome}** em **${p.rotulo}**.`], acoes: acoes(perguntar(ctx, 'freq.oficinas', 'Ranking das oficinas', comLacunas(ctx, { oficina: undefined }))) };
    if (o) r.relatorio = relatorio(`Frequência — oficina ${alvo.nome}`, capitalizar(p.rotulo), r, [tabelaFrequencia(porGrupo(dto.linhas.filter((l) => (l.oficinas ?? '').split(', ').includes(alvo.nome))))]);
    return r;
  }
  if (!oficinas.length) return { texto: [`Não há chamada lançada em **${p.rotulo}**.`], acoes: acoes({ tipo: 'menu', rotulo: 'Outra pergunta' }) };
  const r: Resposta = {
    texto: [`Em **${p.rotulo}**, a oficina com menor frequência foi **${oficinas[0].nome}** (${pct(oficinas[0].percentual)}) e a com maior, **${oficinas[oficinas.length - 1].nome}** (${pct(oficinas[oficinas.length - 1].percentual)}).`],
    interpretacao: nota ? [nota] : [],
    barras: barrasFrequencia(oficinas).slice(0, 8),
    criterio: CRITERIO_FREQUENCIA + ' Um grupo atendido por duas oficinas conta nas duas.',
    acoes: acoes(PDF, perguntar(ctx, 'freq.comparar.grupos', 'Comparar grupos', comLacunas(ctx, {})), perguntar(ctx, 'freq.dia.semana', 'Por dia da semana', comLacunas(ctx, {}))),
  };
  r.relatorio = relatorio('Frequência por oficina', capitalizar(p.rotulo), r, [{
    colunas: ['Oficina', 'Chamadas', 'Esperados', 'Faltas', 'FJ', 'Frequência'],
    numericas: [1, 2, 3, 4, 5],
    linhas: oficinas.map((o) => [o.nome, num(o.chamadas), num(o.esperados), num(o.faltas), num(o.justificadas), pct(o.percentual)]),
  }]);
  return r;
};

const freqDiaSemana: Executor = async (ctx) => {
  const atual = mesAtual(ctx.hoje);
  const p = ctx.lacunas.periodos[0] ?? periodoIntervalo(somarMeses(atual, -2), atual);
  const dto = await ctx.dados.frequenciaPorDiaDaSemana(p.de, p.ate, ctx.lacunas.grupo?.id);
  const dias = dto.dias.filter((d) => d.percentual != null);
  const sobre = ctx.lacunas.grupo ? ` do **${ctx.lacunas.grupo.nome}**` : '';
  if (!dias.length) return { texto: [`Não há chamada lançada${sobre} em ${p.rotulo}.`], acoes: acoes({ tipo: 'menu', rotulo: 'Outra pergunta' }) };
  const pior = [...dias].sort((a, b) => (a.percentual ?? 0) - (b.percentual ?? 0))[0];
  const melhor = [...dias].sort((a, b) => (b.percentual ?? 0) - (a.percentual ?? 0))[0];
  const r: Resposta = {
    texto: [`O dia com menor frequência${sobre} em ${p.rotulo} é **${DIAS_SEMANA[pior.diaSemana]}** (${pct(pior.percentual)}).`],
    interpretacao: [
      dias.length > 1 ? `O melhor é ${DIAS_SEMANA[melhor.diaSemana]} (${pct(melhor.percentual)}).` : null,
      notaDePeriodo(ctx, p),
    ].filter((x): x is string => !!x),
    barras: dto.dias.map((d) => ({
      rotulo: capitalizar(DIAS_SEMANA[d.diaSemana].replace('-feira', '')),
      valor: d.percentual ?? 0,
      texto: pct(d.percentual),
      destaque: d === pior,
    })),
    criterio: CRITERIO_FREQUENCIA,
    acoes: acoes(PDF, perguntar(ctx, 'freq.faltas.seguidas', 'Quem está faltando seguido?'), perguntar(ctx, 'freq.grupo', 'Frequência dos grupos', comLacunas(ctx, { periodos: [] }))),
  };
  r.relatorio = relatorio(`Frequência por dia da semana${ctx.lacunas.grupo ? ` — ${ctx.lacunas.grupo.nome}` : ''}`, capitalizar(p.rotulo), r, [{
    colunas: ['Dia', 'Chamadas', 'Esperados', 'Ausências', 'Frequência'],
    numericas: [1, 2, 3, 4],
    linhas: dto.dias.map((d) => [capitalizar(DIAS_SEMANA[d.diaSemana]), num(d.chamadas), num(d.esperados), num(d.ausencias), pct(d.percentual)]),
  }]);
  return r;
};

const freqFaltasSeguidas: Executor = async (ctx) => {
  const minimo = ctx.lacunas.numero && ctx.lacunas.numero >= 2 && ctx.lacunas.numero <= 20 ? ctx.lacunas.numero : undefined;
  const dto = await ctx.dados.faltasSeguidas(minimo);
  const grupo = ctx.lacunas.grupo;
  const itens = grupo ? dto.itens.filter((i) => i.turmaId === grupo.id) : dto.itens;
  const total = grupo ? itens.length : dto.total;
  const onde = grupo ? ` no **${grupo.nome}**` : '';
  if (!itens.length) {
    return {
      texto: [`Ninguém${onde} está com ${dto.limiar} faltas seguidas ou mais nas chamadas recentes. 🎉`],
      interpretacao: ['Contei as chamadas lançadas nos últimos 45 dias; FJ quebra a sequência.'],
      acoes: acoes(perguntar(ctx, 'freq.grupo', 'Frequência dos grupos'), perguntar(ctx, 'freq.dia.semana', 'Faltas por dia da semana')),
    };
  }
  const r: Resposta = {
    texto: [`**${plural(total, 'atendido está', 'atendidos estão')}**${onde} com **${dto.limiar} faltas seguidas ou mais**.`],
    lista: itens.slice(0, 8).map((i) => `${i.nome}${i.turma && !grupo ? ` (${i.turma})` : ''}: ${plural(i.faltas, 'falta', 'faltas')}, a última em ${dataBr(i.ultimaChamada, true)}`),
    interpretacao: [
      itens.length > 8 ? `E mais ${num(itens.length - 8)} no PDF.` : null,
      'Vale um contato com a família. Contei as chamadas dos últimos 45 dias; falta justificada (FJ) quebra a sequência.',
    ].filter((x): x is string => !!x),
    acoes: acoes(PDF, ctx.perfil === Role.COORD ? { tipo: 'navegar', rotulo: 'Ver no Painel', rota: '/painel' } : { tipo: 'navegar', rotulo: 'Abrir Chamada', rota: '/chamada' }, perguntar(ctx, 'freq.dia.semana', 'Faltas por dia da semana')),
  };
  r.relatorio = relatorio('Atendidos com faltas seguidas', `${dto.limiar} ou mais faltas seguidas · chamadas desde ${dataBr(dto.desde)}${grupo ? ` · ${grupo.nome}` : ''}`, r, [{
    colunas: ['Atendido', 'Grupo', 'Faltas seguidas', 'Última chamada'],
    numericas: [2],
    linhas: itens.map((i) => [i.nome, i.turma ?? '—', num(i.faltas), dataBr(i.ultimaChamada)]),
  }]);
  return r;
};

const freqAtendido: Executor = async (ctx) => {
  const achado = await acharAtendido(ctx, 'freq.atendido');
  if ('resposta' in achado) return achado.resposta;
  const a = achado.atendido;
  const p = ctx.lacunas.periodos[0] ?? periodoAno(ctx.hoje.getFullYear(), ctx.hoje);
  const dias = (await ctx.dados.frequenciaDoAtendido(a.assistidoId)).filter((d) => d.data.slice(0, 7) >= p.de && d.data.slice(0, 7) <= p.ate);
  if (!dias.length) return { texto: [`Não há chamada lançada para **${a.nome}** em ${p.rotulo}.`], acoes: acoes({ tipo: 'menu', rotulo: 'Outra pergunta' }) };
  const presencas = dias.filter((d) => d.statusPresenca === StatusPresenca.PRESENTE).length;
  const faltas = dias.filter((d) => d.statusPresenca === StatusPresenca.FALTA).length;
  const fj = dias.filter((d) => d.statusPresenca === StatusPresenca.FALTA_JUSTIFICADA).length;
  const freq = percentual(dias.length, faltas + fj);
  const ultimasFaltas = dias.filter((d) => d.statusPresenca !== StatusPresenca.PRESENTE).slice(-5);
  const r: Resposta = {
    texto: [`A frequência de **${a.nome}**${a.grupo ? ` (${a.grupo})` : ''} em ${p.rotulo} foi de **${pct(freq)}**.`],
    interpretacao: [
      `${plural(presencas, 'presença', 'presenças')}, ${plural(faltas, 'falta', 'faltas')} e ${plural(fj, 'falta justificada', 'faltas justificadas')} em ${plural(dias.length, 'chamada', 'chamadas')}.`,
      ultimasFaltas.length ? `Últimas ausências: ${ultimasFaltas.map((d) => `${dataBr(d.data, true)}${d.statusPresenca === StatusPresenca.FALTA_JUSTIFICADA ? ' (FJ)' : ''}`).join(', ')}.` : null,
      notaDePeriodo(ctx, p),
    ].filter((x): x is string => !!x),
    criterio: CRITERIO_FREQUENCIA,
    acoes: acoes(PDF, perguntar(ctx, 'disc.atendido', 'Histórico disciplinar', comLacunas(ctx, { nome: a.nome })), perguntar(ctx, 'freq.faltas.seguidas', 'Quem está faltando seguido?')),
  };
  r.relatorio = relatorio(`Frequência — ${a.nome}`, `${capitalizar(p.rotulo)}${a.grupo ? ` · ${a.grupo}` : ''}`, r, [{
    colunas: ['Data', 'Grupo', 'Situação'],
    linhas: dias.map((d) => [dataBr(d.data), d.nomeTurma, d.statusPresenca === StatusPresenca.PRESENTE ? 'P' : d.statusPresenca === StatusPresenca.FALTA ? 'F' : 'FJ']),
  }]);
  return r;
};

const freqChamadasPendentes: Executor = async (ctx) => {
  const ontem = new Date(ctx.hoje);
  ontem.setDate(ontem.getDate() - 1);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const p = ctx.lacunas.periodos[0];
  const inicio = p ? `${p.de}-01` : iso(new Date(ctx.hoje.getFullYear(), ctx.hoje.getMonth(), 1));
  let fim = p ? iso(new Date(Number(p.ate.slice(0, 4)), Number(p.ate.slice(5, 7)), 0)) : iso(ontem);
  if (fim > iso(ontem)) fim = iso(ontem);
  if (inicio > fim) return { texto: ['Ainda não há dia passado neste período para cobrar chamada.'], acoes: acoes({ tipo: 'navegar', rotulo: 'Abrir Chamada', rota: '/chamada' }) };
  const pendentes = (await ctx.dados.statusChamadas(inicio, fim))
    .filter((s) => s.status === StatusChamada.PENDENTE)
    .filter((s) => !ctx.lacunas.grupo || s.turmaId === ctx.lacunas.grupo.id);
  const quando = `de ${dataBr(inicio, true)} a ${dataBr(fim, true)}`;
  if (!pendentes.length) return { texto: [`Todas as chamadas ${quando} foram lançadas. ✅`], acoes: acoes(perguntar(ctx, 'freq.grupo', 'Frequência dos grupos'), { tipo: 'menu', rotulo: 'Outra pergunta' }) };
  const r: Resposta = {
    texto: [`**${plural(pendentes.length, 'chamada não foi lançada', 'chamadas não foram lançadas')}** ${quando}.`],
    lista: pendentes.slice(0, 8).map((s) => `${dataBr(s.data, true)} · ${s.nomeTurma}`),
    interpretacao: pendentes.length > 8 ? [`E mais ${num(pendentes.length - 8)} no PDF.`] : [],
    acoes: acoes(PDF, { tipo: 'navegar', rotulo: 'Situação das chamadas', rota: '/chamada/status' }, { tipo: 'navegar', rotulo: 'Abrir Chamada', rota: '/chamada' }),
  };
  r.relatorio = relatorio('Chamadas não lançadas', capitalizar(quando), r, [{ colunas: ['Data', 'Grupo'], linhas: pendentes.map((s) => [dataBr(s.data), s.nomeTurma]) }]);
  return r;
};

/* ======================= Atendidos ======================= */

const atendTotal: Executor = async (ctx) => {
  const dto = await ctx.dados.distribuicao('GRUPO');
  const r: Resposta = {
    texto: [`Hoje são **${plural(dto.ativos, 'atendido ativo', 'atendidos ativos')}**.`],
    barras: barrasDeContagem(dto.itens, dto.ativos),
    interpretacao: dto.itens.length > 8 ? ['No PDF vão todos os grupos.'] : [],
    acoes: acoes(PDF, perguntar(ctx, 'atend.distribuicao', 'Por faixa etária', comLacunas(ctx, { dimensao: 'FAIXA_ETARIA' })), perguntar(ctx, 'atend.movimento', 'Entradas e saídas do ano'), perguntar(ctx, 'grupo.vagas', 'Quais grupos têm vaga?')),
  };
  r.relatorio = relatorio('Atendidos ativos por grupo', `Em ${dataBr(new Date().toISOString())}`, r, [{ colunas: ['Grupo', 'Atendidos'], numericas: [1], linhas: dto.itens.map((i) => [i.rotulo, num(i.total)]) }]);
  return r;
};

const NOME_DIMENSAO: Record<string, [string, string]> = {
  FAIXA_ETARIA: ['faixa etária', 'Faixa etária'],
  IDADE: ['idade', 'Idade'],
  SEXO: ['sexo', 'Sexo'],
  GRUPO: ['grupo', 'Grupo'],
  OFICINA: ['oficina', 'Oficina'],
  BAIRRO: ['bairro', 'Bairro'],
  TURNO_ESCOLA: ['turno da escola', 'Turno da escola'],
};

const atendDistribuicao: Executor = async (ctx) => {
  const dimensao = ctx.lacunas.dimensao ?? 'FAIXA_ETARIA';
  const dto = await ctx.dados.distribuicao(dimensao);
  const [nome, Nome] = NOME_DIMENSAO[dimensao];
  const primeiro = dto.itens[0];
  const ordenados = dimensao === 'FAIXA_ETARIA' || dimensao === 'IDADE' ? dto.itens : [...dto.itens].sort((a, b) => b.total - a.total);
  const r: Resposta = {
    texto: [`Dos **${plural(dto.ativos, 'atendido ativo', 'atendidos ativos')}**, por ${nome}:`],
    barras: barrasDeContagem(ordenados, dto.ativos, dimensao === 'BAIRRO' ? 8 : 12),
    interpretacao: [
      primeiro && dimensao !== 'FAIXA_ETARIA' && dimensao !== 'IDADE' ? `O maior grupo é **${rotulo(primeiro.rotulo)}** (${num(primeiro.total)}).` : null,
      dto.itens.length > 8 && dimensao === 'BAIRRO' ? `São ${num(dto.itens.length)} bairros; o PDF traz todos.` : null,
    ].filter((x): x is string => !!x),
    acoes: acoes(
      PDF,
      ...(['FAIXA_ETARIA', 'SEXO', 'BAIRRO', 'TURNO_ESCOLA'] as const)
        .filter((d) => d !== dimensao)
        .slice(0, 3)
        .map((d) => perguntar(ctx, 'atend.distribuicao', `Por ${NOME_DIMENSAO[d][0]}`, comLacunas(ctx, { dimensao: d }))),
    ),
  };
  r.relatorio = relatorio(`Atendidos por ${nome}`, `Ativos em ${dataBr(new Date().toISOString())}`, r, [{
    colunas: [Nome, 'Atendidos', '%'],
    numericas: [1, 2],
    linhas: ordenados.map((i) => [rotulo(i.rotulo), num(i.total), dto.ativos ? `${Math.round((i.total * 100) / dto.ativos)}%` : '—']),
  }]);
  return r;
};

function anosDoPedido(ctx: Contexto): number[] {
  const anos = ctx.lacunas.periodos.map((p) => Number(p.de.slice(0, 4)));
  const unicos = [...new Set(anos)].filter((a) => a <= ctx.hoje.getFullYear());
  if (unicos.length >= 2) return unicos.slice(0, 2).sort();
  const ano = unicos[0] ?? ctx.hoje.getFullYear();
  return ctx.lacunas.comparar ? [ano - 1, ano] : [ano];
}

const atendMovimento: Executor = async (ctx) => {
  const anos = anosDoPedido(ctx);
  const dados = await Promise.all(anos.map((a) => ctx.dados.movimento(a)));
  const parcial = (a: number) => (a === ctx.hoje.getFullYear() ? ' (até agora)' : '');
  if (dados.length === 2) {
    const [x, y] = dados;
    const r: Resposta = {
      texto: [`Entradas: **${num(x.entradas)}** em ${x.ano}${parcial(x.ano)} e **${num(y.entradas)}** em ${y.ano}${parcial(y.ano)}. Saídas: **${num(x.saidas)}** e **${num(y.saidas)}**.`],
      interpretacao: [`Ativos no fim de cada período: ${num(x.ativosFim)} e ${num(y.ativosFim)}.`],
      acoes: acoes(PDF, perguntar(ctx, 'atend.movimento', `Motivos de saída em ${y.ano}`, comLacunas(ctx, { periodos: [periodoAno(y.ano, ctx.hoje)], comparar: false }))),
    };
    r.relatorio = relatorio('Entradas e saídas de atendidos', `${x.ano} × ${y.ano}`, r, [{
      colunas: ['Mês', `Entradas ${x.ano}`, `Saídas ${x.ano}`, `Entradas ${y.ano}`, `Saídas ${y.ano}`],
      numericas: [1, 2, 3, 4],
      linhas: x.meses.map((m, i) => [capitalizar(MESES_ROTULO[m.mes - 1]), num(m.entradas), num(m.saidas), num(y.meses[i].entradas), num(y.meses[i].saidas)]),
    }]);
    return r;
  }
  const m = dados[0];
  const r: Resposta = {
    texto: [`Em **${m.ano}${parcial(m.ano)}** entraram **${num(m.entradas)}** e saíram **${num(m.saidas)}** atendidos.`],
    interpretacao: [`Começamos o ano com ${num(m.ativosInicio)} ativos; ${m.ano === ctx.hoje.getFullYear() ? 'hoje são' : 'terminamos com'} ${num(m.ativosFim)}.`],
    lista: m.motivos.length ? m.motivos.slice(0, 5).map((c) => `${capitalizar(c.rotulo)}: ${num(c.total)}`) : undefined,
    acoes: acoes(PDF, perguntar(ctx, 'atend.movimento', `Comparar com ${m.ano - 1}`, comLacunas(ctx, { periodos: [periodoAno(m.ano, ctx.hoje)], comparar: true })), perguntar(ctx, 'atend.total', 'Quantos atendidos hoje?')),
  };
  if (m.motivos.length) r.texto.push('Motivos de saída mais comuns:');
  r.relatorio = relatorio('Entradas e saídas de atendidos', `${m.ano}${parcial(m.ano)}`, r, [
    { colunas: ['Mês', 'Entradas', 'Saídas'], numericas: [1, 2], linhas: m.meses.map((x) => [capitalizar(MESES_ROTULO[x.mes - 1]), num(x.entradas), num(x.saidas)]) },
    ...(m.motivos.length ? [{ titulo: 'Motivos de saída', colunas: ['Motivo', 'Atendidos'], numericas: [1], linhas: m.motivos.map((c) => [capitalizar(c.rotulo), num(c.total)]) }] : []),
  ]);
  return r;
};

const atendAniversario: Executor = async (ctx) => {
  const p = ctx.lacunas.periodos[0];
  const mes = p ? Number(p.de.slice(5, 7)) : ctx.hoje.getMonth() + 1;
  let lista = await ctx.dados.aniversariantes(mes);
  if (ctx.lacunas.grupo) lista = lista.filter((a) => a.grupo === ctx.lacunas.grupo!.nome);
  const nomeMes = MESES_ROTULO[mes - 1];
  const onde = ctx.lacunas.grupo ? ` do **${ctx.lacunas.grupo.nome}**` : '';
  if (!lista.length) return { texto: [`Ninguém${onde} faz aniversário em ${nomeMes}.`], acoes: acoes(perguntar(ctx, 'atend.aniversario', `Aniversariantes de ${MESES_ROTULO[mes % 12]}`, comLacunas(ctx, { periodos: [periodoMes(ym(ctx.hoje.getFullYear(), (mes % 12) + 1))] }))) };
  const r: Resposta = {
    texto: [`**${plural(lista.length, 'aniversariante', 'aniversariantes')}**${onde} em ${nomeMes}: 🎂`],
    lista: lista.slice(0, 10).map((a) => `${dataBr(a.data, true)} · ${a.nome}${a.grupo && !ctx.lacunas.grupo ? ` (${a.grupo})` : ''}, ${a.detalhe}`),
    interpretacao: lista.length > 10 ? [`E mais ${num(lista.length - 10)} no PDF.`] : [],
    acoes: acoes(PDF, perguntar(ctx, 'atend.aniversario', `E em ${MESES_ROTULO[mes % 12]}?`, comLacunas(ctx, { periodos: [periodoMes(ym(mes === 12 ? ctx.hoje.getFullYear() + 1 : ctx.hoje.getFullYear(), (mes % 12) + 1))] }))),
  };
  r.relatorio = relatorio(`Aniversariantes de ${nomeMes}`, ctx.lacunas.grupo?.nome ?? 'Todos os grupos', r, [{ colunas: ['Dia', 'Atendido', 'Grupo', 'Idade'], linhas: lista.map((a) => [dataBr(a.data, true), a.nome, a.grupo ?? '—', a.detalhe ?? '']) }]);
  return r;
};

/* ======================= Perfil social (só agregados) ======================= */

const CRITERIO_SOCIAL = 'Atendidos ativos hoje, pelos dados da ficha de cadastro social. Só totais: o dado de cada pessoa fica na ficha dela.';

const socialProgramas: Executor = async (ctx) => {
  const s = await ctx.dados.social();
  const r: Resposta = {
    texto: [`**${num(s.recebemPrograma)}** dos ${num(s.ativos)} atendidos ativos (${s.ativos ? Math.round((s.recebemPrograma * 100) / s.ativos) : 0}%) vêm de famílias que recebem programa de transferência de renda.`],
    barras: barrasDeContagem(s.programas, s.ativos),
    interpretacao: [`${num(s.comNis)} têm NIS/CadÚnico informado. Uma família pode receber mais de um programa.`],
    criterio: CRITERIO_SOCIAL,
    acoes: acoes(PDF, perguntar(ctx, 'social.renda', 'Faixas de renda'), perguntar(ctx, 'social.completo', 'Relatório completo para prestação de contas')),
  };
  r.relatorio = relatorio('Programas de transferência de renda', `Atendidos ativos em ${dataBr(new Date().toISOString())}`, r, [{ colunas: ['Programa', 'Atendidos'], numericas: [1], linhas: s.programas.map((c) => [rotulo(c.rotulo), num(c.total)]) }]);
  return r;
};

const socialRenda: Executor = async (ctx) => {
  const s = await ctx.dados.social();
  const maior = [...s.faixasRenda].sort((a, b) => b.total - a.total)[0];
  const r: Resposta = {
    texto: s.rendaInformada
      ? [`Das **${num(s.rendaInformada)}** famílias com renda informada, a faixa mais comum é **${maior?.rotulo ?? '—'}** (${num(maior?.total ?? 0)}).`]
      : ['Nenhum atendido ativo tem a renda familiar preenchida na ficha.'],
    barras: barrasDeContagem(s.faixasRenda, s.rendaInformada),
    interpretacao: [`${num(s.ativos - s.rendaInformada)} sem renda informada. Renda familiar = soma de quem mora na casa (${moeda(1000)} = mil reais).`],
    criterio: CRITERIO_SOCIAL,
    acoes: acoes(PDF, perguntar(ctx, 'social.programas', 'Programas sociais'), perguntar(ctx, 'social.completo', 'Relatório completo para prestação de contas')),
  };
  r.relatorio = relatorio('Renda familiar dos atendidos', `Atendidos ativos em ${dataBr(new Date().toISOString())}`, r, [{ colunas: ['Faixa de renda familiar', 'Famílias'], numericas: [1], linhas: s.faixasRenda.map((c) => [c.rotulo, num(c.total)]) }]);
  return r;
};

const socialSaude: Executor = async (ctx) => {
  const s = await ctx.dados.social();
  const r: Resposta = {
    texto: [`Dos **${num(s.ativos)}** atendidos ativos: **${num(s.pcd)}** PCD, **${num(s.necessidadesEspecificas)}** com necessidades específicas registradas e **${num(s.problemaSaude)}** com problema de saúde informado.`],
    criterio: CRITERIO_SOCIAL,
    acoes: acoes(PDF, perguntar(ctx, 'social.programas', 'Programas sociais'), perguntar(ctx, 'social.completo', 'Relatório completo')),
  };
  r.relatorio = relatorio('Saúde e acessibilidade dos atendidos', `Atendidos ativos em ${dataBr(new Date().toISOString())}`, r, [{
    colunas: ['Indicador', 'Atendidos'],
    numericas: [1],
    linhas: [['PCD', num(s.pcd)], ['Necessidades específicas', num(s.necessidadesEspecificas)], ['Problema de saúde informado', num(s.problemaSaude)]],
  }]);
  return r;
};

const socialCompleto: Executor = async (ctx) => {
  const ano = ctx.hoje.getFullYear();
  const atual = mesAtual(ctx.hoje);
  const [s, mov, faixas, sexo, freq] = await Promise.all([
    ctx.dados.social(),
    ctx.dados.movimento(ano),
    ctx.dados.distribuicao('FAIXA_ETARIA'),
    ctx.dados.distribuicao('SEXO'),
    ctx.dados.frequencia(ym(ano, 1), atual),
  ]);
  const geral = somar(freq.linhas);
  const r: Resposta = {
    texto: [
      `Resumo de **${ano}** até agora: **${num(s.ativos)}** atendidos ativos, **${num(mov.entradas)}** entradas e **${num(mov.saidas)}** saídas; frequência média de **${pct(geral.percentual)}**.`,
      `**${num(s.recebemPrograma)}** de famílias com programa de transferência de renda, **${num(s.pcd)}** PCD.`,
    ],
    interpretacao: ['O PDF sai com faixa etária, sexo, renda, programas, frequência mês a mês e linha de assinatura.'],
    criterio: CRITERIO_SOCIAL + ' ' + CRITERIO_FREQUENCIA,
    acoes: acoes(PDF, perguntar(ctx, 'atend.movimento', 'Entradas e saídas'), perguntar(ctx, 'freq.evolucao', 'Frequência mês a mês', comLacunas(ctx, { periodos: [periodoAno(ano, ctx.hoje)], comparar: false }))),
  };
  const meses: string[] = [];
  for (let m = ym(ano, 1); m <= atual; m = somarMeses(m, 1)) meses.push(m);
  r.relatorio = relatorio(`Relatório de atendimento ${ano}`, `Prestação de contas · dados até ${dataBr(new Date().toISOString())}`, r, [
    { titulo: 'Atendidos', colunas: ['Indicador', 'Total'], numericas: [1], linhas: [['Ativos hoje', num(s.ativos)], ['Ativos em 1º de janeiro', num(mov.ativosInicio)], ['Entradas no ano', num(mov.entradas)], ['Saídas no ano', num(mov.saidas)]] },
    { titulo: 'Faixa etária', colunas: ['Faixa', 'Atendidos'], numericas: [1], linhas: faixas.itens.map((c) => [c.rotulo, num(c.total)]) },
    { titulo: 'Sexo', colunas: ['Sexo', 'Atendidos'], numericas: [1], linhas: sexo.itens.map((c) => [rotulo(c.rotulo), num(c.total)]) },
    { titulo: 'Programas de transferência de renda', colunas: ['Programa', 'Atendidos'], numericas: [1], linhas: [['Recebem algum programa', num(s.recebemPrograma)], ...s.programas.map((c) => [rotulo(c.rotulo), num(c.total)])] },
    { titulo: 'Renda familiar', colunas: ['Faixa', 'Famílias'], numericas: [1], linhas: [...s.faixasRenda.map((c) => [c.rotulo, num(c.total)]), ['Não informada', num(s.ativos - s.rendaInformada)]] },
    { titulo: 'Saúde e acessibilidade', colunas: ['Indicador', 'Atendidos'], numericas: [1], linhas: [['PCD', num(s.pcd)], ['Necessidades específicas', num(s.necessidadesEspecificas)], ['Problema de saúde', num(s.problemaSaude)], ['Estudam no contraturno', num(s.estudaContraturno)]] },
    { titulo: 'Frequência mês a mês', colunas: ['Mês', 'Chamadas', 'Frequência'], numericas: [1, 2], linhas: meses.map((m) => { const x = somar(freq.linhas.filter((l) => l.mes === m)); return [capitalizar(rotuloMes(m)), num(x.chamadas), pct(x.percentual)]; }) },
  ], { assinatura: true });
  return r;
};

/* ======================= Grupos e oficinas ======================= */

const grupoVagas: Executor = async (ctx) => {
  const grupos = (await ctx.dados.grupos()).filter((g) => g.ativo && g.capacidade > 0);
  const comVaga = (g: (typeof grupos)[number]) => g.capacidade - (g.quantidadeAlunos ?? 0);
  if (ctx.lacunas.grupo) {
    const g = grupos.find((x) => x.turmaId === ctx.lacunas.grupo!.id);
    if (!g) return { texto: [`O **${ctx.lacunas.grupo.nome}** não tem capacidade cadastrada.`], acoes: acoes({ tipo: 'navegar', rotulo: 'Abrir Grupos', rota: '/turmas' }) };
    const v = comVaga(g);
    return {
      texto: [v > 0 ? `O **${g.nomeTurma}** tem **${plural(v, 'vaga', 'vagas')}** (${num(g.quantidadeAlunos ?? 0)} de ${num(g.capacidade)}).` : `O **${g.nomeTurma}** está **lotado** (${num(g.quantidadeAlunos ?? 0)} de ${num(g.capacidade)}).`],
      acoes: acoes(perguntar(ctx, 'grupo.vagas', 'Todos os grupos', comLacunas(ctx, { grupo: undefined })), { tipo: 'navegar', rotulo: 'Abrir Grupos', rota: '/turmas' }),
    };
  }
  const ordenados = [...grupos].sort((a, b) => comVaga(b) - comVaga(a));
  const livres = ordenados.filter((g) => comVaga(g) > 0);
  const r: Resposta = {
    texto: [livres.length ? `**${plural(livres.length, 'grupo tem', 'grupos têm')} vaga**, somando ${plural(livres.reduce((s, g) => s + comVaga(g), 0), 'vaga', 'vagas')}.` : 'Todos os grupos estão lotados.'],
    barras: ordenados.slice(0, 8).map((g) => ({
      rotulo: g.nomeTurma,
      valor: Math.min(100, Math.round(((g.quantidadeAlunos ?? 0) * 100) / g.capacidade)),
      texto: comVaga(g) > 0 ? `${plural(comVaga(g), 'vaga', 'vagas')}` : 'lotado',
      destaque: comVaga(g) <= 0,
    })),
    criterio: 'Barra = ocupação (atendidos ÷ capacidade). Grupos sem capacidade cadastrada ficam de fora.',
    acoes: acoes(PDF, perguntar(ctx, 'pend.precadastros', 'Pré-cadastros para avaliar'), { tipo: 'navegar', rotulo: 'Abrir Grupos', rota: '/turmas' }),
  };
  r.relatorio = relatorio('Vagas nos grupos', `Em ${dataBr(new Date().toISOString())}`, r, [{
    colunas: ['Grupo', 'Faixa etária', 'Atendidos', 'Capacidade', 'Vagas'],
    numericas: [2, 3, 4],
    linhas: ordenados.map((g) => [g.nomeTurma, g.faixaEtaria ?? '—', num(g.quantidadeAlunos ?? 0), num(g.capacidade), num(Math.max(0, comVaga(g)))]),
  }]);
  return r;
};

const grupoLista: Executor = async (ctx) => {
  const { grupos, oficinas } = ctx.entidades;
  return {
    texto: [`${ctx.perfil === Role.OFICINEIRO ? 'Seus' : 'São'} **${plural(grupos.length, 'grupo', 'grupos')}** e **${plural(oficinas.length, 'oficina', 'oficinas')}** ativos.`],
    lista: [
      ...grupos.slice(0, 10).map((g) => `Grupo ${g.nome}${g.detalhe ? ` · ${g.detalhe}` : ''}`),
      ...oficinas.slice(0, 6).map((o) => `Oficina ${o.nome}${o.detalhe ? ` · ${o.detalhe}` : ''}`),
    ],
    acoes: acoes(perguntar(ctx, 'freq.grupo', 'Frequência dos grupos'), perguntar(ctx, 'grupo.vagas', 'Quais têm vaga?'), { tipo: 'menu', rotulo: 'Outra pergunta' }),
  };
};

const oficinaResponsavel: Executor = async (ctx) => {
  const { oficinas } = ctx.entidades;
  const alvo = ctx.lacunas.oficina;
  if (alvo) {
    const o = oficinas.find((x) => x.id === alvo.id);
    return {
      texto: [o?.detalhe ? `A oficina **${alvo.nome}** é dada por **${o.detalhe}**.` : `A oficina **${alvo.nome}** está sem oficineiro responsável.`],
      acoes: acoes(perguntar(ctx, 'freq.oficinas', `Frequência de ${alvo.nome}`, comLacunas(ctx, {})), perguntar(ctx, 'oficina.responsavel', 'Todas as oficinas', comLacunas(ctx, { oficina: undefined }))),
    };
  }
  return {
    texto: ['Quem dá cada oficina:'],
    lista: oficinas.map((o) => `${o.nome}: ${o.detalhe ?? 'sem responsável'}`),
    acoes: acoes(perguntar(ctx, 'freq.oficinas', 'Ranking das oficinas'), { tipo: 'menu', rotulo: 'Outra pergunta' }),
  };
};

const semanarioPendentes: Executor = async (ctx) => {
  const avisos = (await ctx.dados.avisos()).filter((a) => a.tipo === 'SEMANARIO_PENDENTE');
  if (!avisos.length) return { texto: ['Todos os semanários desta semana foram enviados. ✅'], acoes: acoes({ tipo: 'navegar', rotulo: 'Abrir Semanários', rota: '/semanarios' }) };
  return {
    texto: [`**${plural(avisos.length, 'semanário não foi enviado', 'semanários não foram enviados')}** nesta semana:`],
    lista: avisos.slice(0, 10).map((a) => `${a.titulo}${a.detalhe ? `: ${a.detalhe}` : ''}`),
    acoes: acoes({ tipo: 'navegar', rotulo: 'Abrir Semanários', rota: '/semanarios' }, perguntar(ctx, 'pend.resumo', 'Outras pendências')),
  };
};

/* ======================= Disciplinar ======================= */

const discResumo: Executor = async (ctx) => {
  const { lacunas, hoje } = ctx;
  const meses = lacunas.periodos.length >= 2
    ? lacunas.periodos.slice(0, 2).map((p) => p.ate)
    : [lacunas.periodos[0]?.ate ?? mesAtual(hoje)];
  const dtos = await Promise.all(meses.map((m) => ctx.dados.disciplinar(m)));
  if (dtos.length === 2) {
    const [a, b] = dtos;
    const ta = a.ocorrencias + a.advertencias + a.suspensoes;
    const tb = b.ocorrencias + b.advertencias + b.suspensoes;
    const r: Resposta = {
      texto: [`Registros disciplinares: **${num(ta)}** em ${rotuloMes(a.mes)} e **${num(tb)}** em ${rotuloMes(b.mes)}.`],
      interpretacao: [`Ocorrências ${num(a.ocorrencias)} → ${num(b.ocorrencias)}, advertências ${num(a.advertencias)} → ${num(b.advertencias)}, suspensões ${num(a.suspensoes)} → ${num(b.suspensoes)}.`],
      acoes: acoes(PDF, perguntar(ctx, 'disc.um.passo', 'Quem está perto da próxima medida?')),
    };
    r.relatorio = relatorio('Comparativo disciplinar', `${capitalizar(rotuloMes(a.mes))} × ${rotuloMes(b.mes)}`, r, [{
      colunas: ['Nível', capitalizar(rotuloMes(a.mes)), capitalizar(rotuloMes(b.mes))],
      numericas: [1, 2],
      linhas: [['Ocorrências', num(a.ocorrencias), num(b.ocorrencias)], ['Advertências', num(a.advertencias), num(b.advertencias)], ['Suspensões', num(a.suspensoes), num(b.suspensoes)]],
    }]);
    return r;
  }
  const d = dtos[0];
  const total = d.ocorrencias + d.advertencias + d.suspensoes;
  const diff = total - d.totalMesAnterior;
  const grupos = [...d.grupos].filter((g) => g.ocorrencias + g.advertencias + g.suspensoes > 0).sort((x, y) => (y.ocorrencias + y.advertencias + y.suspensoes) - (x.ocorrencias + x.advertencias + x.suspensoes));
  const r: Resposta = {
    texto: [`Em **${rotuloMes(d.mes)}** foram **${plural(total, 'registro', 'registros')}**: ${plural(d.ocorrencias, 'ocorrência', 'ocorrências')}, ${plural(d.advertencias, 'advertência', 'advertências')} e ${plural(d.suspensoes, 'suspensão', 'suspensões')}.`],
    interpretacao: [
      diff === 0 ? `Igual ao mês anterior (${num(d.totalMesAnterior)}).` : `${plural(Math.abs(diff), 'registro', 'registros')} a ${diff > 0 ? 'mais' : 'menos'} que no mês anterior (${num(d.totalMesAnterior)}).`,
      grupos[0] ? `O grupo com mais registros foi **${grupos[0].nomeTurma}**.` : null,
      lacunas.periodos.length ? null : `Considerei ${rotuloMes(d.mes)}.`,
    ].filter((x): x is string => !!x),
    barras: barrasDeContagem(grupos.map((g) => ({ rotulo: g.nomeTurma, total: g.ocorrencias + g.advertencias + g.suspensoes })), 0),
    criterio: 'Registros não arquivados, pela data do registro e pelo grupo do atendido na época.',
    acoes: acoes(PDF, perguntar(ctx, 'disc.um.passo', 'Quem está perto da próxima medida?'), perguntar(ctx, 'disc.resumo', 'Comparar com o mês anterior', comLacunas(ctx, { periodos: [periodoMes(somarMeses(d.mes, -1)), periodoMes(d.mes)] }))),
  };
  r.relatorio = relatorio('Registros disciplinares por grupo', capitalizar(rotuloMes(d.mes)), r, [{
    colunas: ['Grupo', 'Ocorrências', 'Advertências', 'Suspensões', 'Mês anterior'],
    numericas: [1, 2, 3, 4],
    linhas: d.grupos.map((g) => [g.nomeTurma, num(g.ocorrencias), num(g.advertencias), num(g.suspensoes), num(g.totalMesAnterior)]),
  }]);
  return r;
};

const PROXIMA: Record<string, string> = {
  OCORRENCIA: 'a próxima ocorrência gera recomendação de advertência',
  ADVERTENCIA: 'a próxima advertência gera recomendação de suspensão',
  SUSPENSAO: 'a próxima suspensão faz perder o próximo passeio',
};

const discUmPasso: Executor = async (ctx) => {
  const lista = await ctx.dados.umPasso();
  if (!lista.length) return { texto: ['Ninguém está a um registro da próxima medida. ✅'], acoes: acoes(perguntar(ctx, 'disc.resumo', 'Ocorrências do mês')) };
  const r: Resposta = {
    texto: [`**${plural(lista.length, 'atendido está', 'atendidos estão')}** a um registro da próxima medida:`],
    lista: lista.slice(0, 10).map((a) => {
      const [qtd, nivel] = (a.detalhe ?? '').split(' ');
      return `${a.nome}: ${qtd} ${rotulo(nivel)}${Number(qtd) === 1 ? '' : 's'} (${PROXIMA[nivel] ?? 'próximo registro gera recomendação'})`;
    }),
    interpretacao: ['A cada 3 registros do mesmo nível, o sistema recomenda a medida seguinte.'],
    acoes: acoes(PDF, { tipo: 'navegar', rotulo: 'Abrir Disciplinar', rota: '/disciplinar' }, perguntar(ctx, 'disc.resumo', 'Ocorrências do mês')),
  };
  r.relatorio = relatorio('A um registro da próxima medida', `Em ${dataBr(new Date().toISOString())}`, r, [{
    colunas: ['Atendido', 'Registros', 'O que acontece no próximo'],
    linhas: lista.map((a) => { const [qtd, nivel] = (a.detalhe ?? '').split(' '); return [a.nome, `${qtd} ${rotulo(nivel)}`, PROXIMA[nivel] ?? '—']; }),
  }]);
  return r;
};

const discAtendido: Executor = async (ctx) => {
  const achado = await acharAtendido(ctx, 'disc.atendido');
  if ('resposta' in achado) return achado.resposta;
  const a = achado.atendido;
  const ficha = await ctx.dados.fichaDisciplinar(a.assistidoId);
  const s = ficha.resumo;
  const r: Resposta = {
    texto: [`**${a.nome}**${a.grupo ? ` (${a.grupo})` : ''} tem **${plural(s.ocorrenciasAtivas, 'ocorrência', 'ocorrências')}**, **${plural(s.advertenciasAtivas, 'advertência', 'advertências')}** e **${plural(s.suspensoesAtivas, 'suspensão', 'suspensões')}** no ano.`],
    interpretacao: [
      s.suspensoAte ? `Está suspenso até ${dataBr(s.suspensoAte)}.` : null,
      s.retornoComResponsavelPendente ? 'Precisa retornar com o responsável.' : null,
      s.perdeProximoPasseio ? 'Perde o próximo passeio.' : null,
      s.faltamParaAdvertencia > 0 && s.faltamParaAdvertencia <= 1 ? 'Mais uma ocorrência gera recomendação de advertência.' : null,
      s.faltamParaSuspensao > 0 && s.faltamParaSuspensao <= 1 ? 'Mais uma advertência gera recomendação de suspensão.' : null,
    ].filter((x): x is string => !!x),
    lista: ficha.registros.slice(0, 5).map((reg) => `${dataBr(reg.dataRegistro, true)} · ${capitalizar(rotulo(reg.nivel))}${reg.motivo ? `: ${reg.motivo}` : ''}`),
    acoes: acoes(PDF, { tipo: 'navegar', rotulo: 'Abrir Disciplinar', rota: '/disciplinar' }, perguntar(ctx, 'freq.atendido', 'Frequência', comLacunas(ctx, { nome: a.nome }))),
  };
  r.relatorio = relatorio(`Histórico disciplinar — ${a.nome}`, a.grupo ?? '', r, [{
    colunas: ['Data', 'Nível', 'Motivo'],
    linhas: ficha.registros.map((reg) => [dataBr(reg.dataRegistro), capitalizar(rotulo(reg.nivel)), reg.motivo ?? '—']),
  }]);
  return r;
};

/* ======================= Pendências ======================= */

const pendResumo: Executor = async (ctx) => {
  const avisos = await ctx.dados.avisos();
  if (!avisos.length) return { texto: ['Nada pendente pra você agora. ✅'], acoes: acoes(perguntar(ctx, 'freq.grupo', 'Frequência dos grupos'), { tipo: 'menu', rotulo: 'O que eu sei responder' }) };
  return {
    texto: [`Você tem **${plural(avisos.length, 'pendência', 'pendências')}**:`],
    lista: avisos.slice(0, 8).map((a) => `${a.titulo}${a.detalhe ? `: ${a.detalhe}` : ''}`),
    interpretacao: avisos.length > 8 ? [`E mais ${num(avisos.length - 8)} no sino de avisos, no topo da tela.`] : [],
    acoes: acoes(
      avisos.some((a) => a.tipo === 'CHAMADA_ATRASADA' || a.tipo === 'CHAMADA_DE_HOJE') && { tipo: 'navegar', rotulo: 'Abrir Chamada', rota: '/chamada' },
      avisos.some((a) => a.tipo === 'PRE_CADASTRO_PENDENTE') && { tipo: 'navegar', rotulo: 'Abrir Pré-cadastros', rota: '/pre-cadastros' },
      avisos.some((a) => a.tipo === 'FALTAS_SEGUIDAS') && perguntar(ctx, 'freq.faltas.seguidas', 'Quem está faltando seguido?'),
      { tipo: 'menu', rotulo: 'Outra pergunta' },
    ),
  };
};

const pendPreCadastros: Executor = async (ctx) => {
  const [pendentes, espera] = await Promise.all([ctx.dados.preCadastros('PENDENTE'), ctx.dados.preCadastros('LISTA_ESPERA')]);
  return {
    texto: [`**${plural(pendentes.length, 'pré-cadastro aguarda', 'pré-cadastros aguardam')} avaliação** e ${plural(espera.length, 'está', 'estão')} na lista de espera.`],
    lista: pendentes.slice(0, 6).map((p) => `${p.nomeCompleto}${p.idade != null ? `, ${p.idade} anos` : ''} · enviado em ${dataBr(p.criadoEm, true)}`),
    acoes: acoes({ tipo: 'navegar', rotulo: 'Abrir Pré-cadastros', rota: '/pre-cadastros' }, perguntar(ctx, 'grupo.vagas', 'Quais grupos têm vaga?'), perguntar(ctx, 'ajuda.precadastro', 'Como avaliar?')),
  };
};

const pendDesligamentos: Executor = async (ctx) => {
  const pedidos = (await ctx.dados.desligamentos()).filter((d) => d.status === 'PENDENTE');
  if (!pedidos.length) return { texto: ['Nenhum pedido de desligamento aguardando. ✅'], acoes: acoes({ tipo: 'menu', rotulo: 'Outra pergunta' }) };
  return {
    texto: [`**${plural(pedidos.length, 'pedido de desligamento aguarda', 'pedidos de desligamento aguardam')}** ${ctx.perfil === Role.COORD ? 'a sua decisão' : 'a decisão do Coordenador'}:`],
    lista: pedidos.slice(0, 8).map((d) => `${d.nomeAtendido}${d.nomeTurma ? ` (${d.nomeTurma})` : ''}: saída em ${dataBr(d.dataSaida, true)}, pedido por ${d.solicitadoPorNome}`),
    acoes: acoes({ tipo: 'navegar', rotulo: 'Abrir Atendidos', rota: '/assistidos' }, perguntar(ctx, 'ajuda.desligamento', 'Como funciona o desligamento?')),
  };
};

/* ======================= Relatórios e ajuda ======================= */

const relatorioMenu: Executor = async (ctx) => {
  const ids = ['freq.grupo', 'freq.evolucao', 'freq.faltas.seguidas', 'atend.distribuicao', 'atend.movimento', 'disc.resumo', 'grupo.vagas', 'social.completo'];
  const opcoes = ids.map((id) => perguntar(ctx, id)).filter((a): a is Acao => !!a);
  return {
    texto: ['Toda resposta minha com números vira PDF no modelo da ADRA. Alguns relatórios que eu faço:'],
    lista: ids.filter((id) => pode(ctx, id)).map((id) => intencaoPorId(id)!.titulo),
    interpretacao: ['Escolha um abaixo ou pergunte do seu jeito, por exemplo: "frequência do grupo Girassol em outubro".'],
    acoes: opcoes.slice(0, 4),
  };
};

function executorDeAjuda(intencao: Intencao): Executor {
  return async (ctx) => {
    const ajuda = ajudaPorIntencao(intencao.id)!;
    return {
      texto: [`**${ajuda.intencao.titulo}:**`],
      passos: ajuda.passos,
      acoes: acoes({ tipo: 'navegar', rotulo: ajuda.rotuloRota, rota: ajuda.rota }, { tipo: 'menu', rotulo: 'Outra pergunta' }),
    };
  };
}

const EXECUTORES: Record<string, Executor> = {
  'freq.grupo': freqGrupo,
  'freq.comparar.grupos': freqCompararGrupos,
  'freq.evolucao': freqEvolucao,
  'freq.oficinas': freqOficinas,
  'freq.dia.semana': freqDiaSemana,
  'freq.faltas.seguidas': freqFaltasSeguidas,
  'freq.atendido': freqAtendido,
  'freq.chamadas.pendentes': freqChamadasPendentes,
  'atend.total': atendTotal,
  'atend.distribuicao': atendDistribuicao,
  'atend.movimento': atendMovimento,
  'atend.aniversario': atendAniversario,
  'social.programas': socialProgramas,
  'social.renda': socialRenda,
  'social.saude': socialSaude,
  'social.completo': socialCompleto,
  'grupo.vagas': grupoVagas,
  'grupo.lista': grupoLista,
  'oficina.responsavel': oficinaResponsavel,
  'semanario.pendentes': semanarioPendentes,
  'disc.resumo': discResumo,
  'disc.um.passo': discUmPasso,
  'disc.atendido': discAtendido,
  'pend.resumo': pendResumo,
  'pend.precadastros': pendPreCadastros,
  'pend.desligamentos': pendDesligamentos,
  'relatorio.menu': relatorioMenu,
};

export function executorPara(intencao: Intencao): Executor {
  if (intencao.tema === 'ajuda') return executorDeAjuda(intencao);
  const executor = EXECUTORES[intencao.id];
  if (!executor) throw new Error(`Intenção sem resposta: ${intencao.id}`);
  return executor;
}

/** Garante que toda intenção de dados tem resposta (usado no teste). */
export function intencoesSemResposta(): string[] {
  return INTENCOES_DADOS.map((i) => i.id).filter((id) => !EXECUTORES[id]);
}
