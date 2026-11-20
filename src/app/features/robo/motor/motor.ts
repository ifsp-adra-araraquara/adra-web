/**
 * ADRAbot — o motor de entendimento. Recebe o texto e devolve uma decisão:
 * executar uma intenção, sugerir ("Você quis dizer…?"), avisar que o perfil
 * não tem acesso, ou tratar como fora do escopo. Determinístico, sem IA.
 */
import { Role } from '../../../shared/enum/role.enum';
import { INTENCOES } from './catalogo';
import { classificarFora, palavrasForaDoEscopo, pedeAcao, Verificador } from './fora-escopo';
import { limitarPeriodo, extrairPeriodos, MESES } from './periodo';
import {
  criarCorretor,
  distancia,
  normalizar,
  numeroPorExtenso,
  Palavra,
  palavras,
  PALAVRAS_VAZIAS,
  SINONIMOS_CONHECIDOS,
  termosDe,
} from './texto';
import { ContextoConversa, Decisao, Dimensao, Entidades, Intencao, Lacunas, Opcao, Termo } from './tipos';

export interface EntradaMotor {
  texto: string;
  perfil: Role;
  hoje: Date;
  entidades: Entidades;
  contexto: ContextoConversa;
}

/** Diferença mínima de nota para executar sem perguntar "Você quis dizer…?". */
export const MARGEM_EMPATE = 1;
/** Fração mínima de grupos de uma regra para virar sugestão. */
export const MINIMO_SUGESTAO = 0.5;

const DIMENSOES: [Dimensao, Termo[]][] = [
  ['BAIRRO', ['bairro*', 'regiao', 'regioes', 'onde moram', 'por endereco']],
  ['SEXO', ['sexo', 'genero', 'menino*', 'menina*', 'masculino', 'feminino']],
  ['FAIXA_ETARIA', ['faixa etaria', 'faixas etarias', 'faixa de idade', 'faixas de idade']],
  ['IDADE', ['idade', 'idades', 'quantos anos', 'por ano de idade']],
  ['GRUPO', ['por grupo', 'cada grupo', 'em cada grupo', 'grupo a grupo']],
  ['OFICINA', ['por oficina', 'cada oficina', 'em cada oficina']],
  ['TURNO_ESCOLA', ['turno', 'escola', 'estuda*', 'contraturno', 'periodo escolar']],
];

const PEDIDO_FORTE: Termo[] = ['como', 'onde', 'tutorial', 'passo a passo', 'ensina*', 'explica*', 'tem como'];

/** Antes de um nome de pessoa: "frequência DA Ana", "ocorrências DO aluno Pedro". */
const ANTES_DE_NOME = new Set(['do', 'da', 'de', 'dos', 'das', 'o', 'a', 'atendido', 'atendida', 'aluno', 'aluna', 'crianca', 'menino', 'menina']);
const DENTRO_DE_NOME = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
const GENERICOS_DE_NOME = new Set(['grupo', 'turma', 'oficina', 'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'para']);
const PALAVRAS_DE_TEMPO = ['semana', 'semanas', 'mes', 'meses', 'ano', 'anos', 'hoje', 'ontem', 'amanha', 'dia', 'dias', 'passado', 'passada', 'atual', 'ultimo', 'ultimos', 'ultima', 'ultimas', 'semestre', 'trimestre', 'primeiro', 'segundo'];

/* ---------------- Vocabulário (para corrigir digitação e achar nomes) ---------------- */

interface Preparado {
  intencao: Intencao;
  exemplos: Set<string>[];
}

let preparadas: Preparado[] | null = null;
/** Palavras do catálogo (regras, dimensões, meses): o que NÃO é nome de pessoa. */
const vocabularioBase = new Set<string>();
/** + palavras dos exemplos: base do corretor de digitação. */
const vocabularioCorretor = new Set<string>();

function palavrasDoTermo(t: Termo): string[] {
  if (t.startsWith('#')) return [];
  return t.replace(/\*/g, '').split(' ').filter((p) => p.length > 0);
}

function preparar(): Preparado[] {
  if (preparadas) return preparadas;
  for (const intencao of INTENCOES) {
    for (const regra of intencao.regras) for (const grupo of regra) for (const t of grupo) palavrasDoTermo(t).forEach((p) => vocabularioBase.add(p));
    for (const t of [...(intencao.reforcos ?? []), ...(intencao.bloqueios ?? [])]) palavrasDoTermo(t).forEach((p) => vocabularioBase.add(p));
    for (const e of intencao.exemplos) normalizar(e).split(' ').forEach((p) => vocabularioCorretor.add(p));
  }
  for (const [, termos] of DIMENSOES) for (const t of termos) palavrasDoTermo(t).forEach((p) => vocabularioBase.add(p));
  MESES.forEach((m) => vocabularioBase.add(m));
  PALAVRAS_DE_TEMPO.forEach((p) => vocabularioBase.add(p));
  SINONIMOS_CONHECIDOS().forEach((p) => vocabularioBase.add(p));
  vocabularioBase.forEach((p) => vocabularioCorretor.add(p));
  palavrasForaDoEscopo().forEach((p) => vocabularioCorretor.add(p));
  preparadas = INTENCOES.map((intencao) => ({
    intencao,
    exemplos: intencao.exemplos.map((e) => new Set(conteudo(palavras(normalizar(e))))),
  }));
  return preparadas;
}

function conteudo(lista: Palavra[]): string[] {
  return lista.map((p) => p.texto).filter((p) => !PALAVRAS_VAZIAS.has(p) && p.length > 1);
}

const corretores = new WeakMap<Entidades, (p: string) => string>();

function corretorPara(entidades: Entidades): (p: string) => string {
  let corretor = corretores.get(entidades);
  if (!corretor) {
    preparar();
    const vocab = new Set(vocabularioCorretor);
    for (const o of [...entidades.grupos, ...entidades.oficinas]) normalizar(o.nome).split(' ').forEach((p) => vocab.add(p));
    corretor = criarCorretor(vocab);
    corretores.set(entidades, corretor);
  }
  return corretor;
}

/* ---------------- Casamento de termos ---------------- */

const regexCache = new Map<string, RegExp>();

function regexDaExpressao(t: Termo): RegExp {
  let re = regexCache.get(t);
  if (!re) {
    const corpo = t
      .split(' ')
      .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, (c) => (c === '*' ? '*' : `\\${c}`)).replace(/\*/g, '[a-z0-9]*'))
      .join(' ');
    re = new RegExp(`(^| )${corpo}( |$)`);
    regexCache.set(t, re);
  }
  return re;
}

interface Analise {
  lista: Palavra[];
  frase: string;
  termos: Set<string>;
  marcadores: Set<string>;
  tem: (t: Termo) => boolean;
}

function analisar(lista: Palavra[], marcadores: Set<string>): Analise {
  const frase = lista.map((p) => p.texto).join(' ');
  const termos = termosDe(lista);
  const tem = (t: Termo): boolean => {
    if (t.startsWith('#')) return marcadores.has(t);
    if (t.includes(' ')) return regexDaExpressao(t).test(frase);
    if (t.endsWith('*')) {
      const prefixo = t.slice(0, -1);
      for (const termo of termos) if (termo.startsWith(prefixo)) return true;
      return false;
    }
    return termos.has(t);
  };
  return { lista, frase, termos, marcadores, tem };
}

/* ---------------- Lacunas ---------------- */

function acharOpcao(frase: string, lista: Palavra[], opcoes: Opcao[]): { opcao: Opcao; palavras: Set<string> } | null {
  const ditas = new Set<string>();
  lista.forEach((p) => {
    ditas.add(p.texto);
    ditas.add(p.original);
  });
  const fraseCom = ` ${frase} `;
  let melhor: { opcao: Opcao; palavras: Set<string>; nota: number } | null = null;
  for (const opcao of opcoes) {
    const nome = normalizar(opcao.nome);
    const tokens = nome.split(' ').filter((t) => t && !GENERICOS_DE_NOME.has(t));
    const longos = tokens.filter((t) => t.length >= 3);
    const curtos = tokens.filter((t) => t.length < 3);
    let nota = 0;
    if (nome.length >= 3 && fraseCom.includes(` ${nome} `)) {
      nota = 100 + nome.length;
    } else {
      const curtosOk = curtos.every((c) => fraseCom.includes(` grupo ${c} `) || fraseCom.includes(` turma ${c} `) || fraseCom.includes(` oficina ${c} `));
      const longosOk = longos.every((t) => [...ditas].some((d) => d === t || (t.length >= 5 && distancia(d, t, 1) <= 1)));
      if (longos.length && longosOk && curtosOk) nota = longos.join('').length + curtos.length;
      else if (!longos.length && curtos.length && curtosOk) nota = 50;
    }
    if (nota > (melhor?.nota ?? 0)) melhor = { opcao, palavras: new Set(tokens), nota };
  }
  return melhor ? { opcao: melhor.opcao, palavras: melhor.palavras } : null;
}

function acharDimensao(a: Analise): Dimensao | undefined {
  for (const [dimensao, termos] of DIMENSOES) if (termos.some((t) => a.tem(t))) return dimensao;
  return undefined;
}

function acharNumero(lista: Palavra[]): number | undefined {
  for (let i = 0; i < lista.length; i++) {
    const t = lista[i].texto;
    if (/^\d{1,2}$/.test(t)) return Number(t);
    const n = numeroPorExtenso(t);
    if (n && n > 1 && lista.slice(i + 1, i + 3).some((p) => p.termos.includes('falta'))) return n;
  }
  return undefined;
}

/** Palavras desconhecidas logo depois de "do/da/aluno…": provável nome de atendido. */
function acharNome(lista: Palavra[], conhecidas: Set<string>, usadas: Set<string>): string | undefined {
  const desconhecida = (p: Palavra) =>
    p.original.length >= 3 &&
    !/^\d/.test(p.original) &&
    !PALAVRAS_VAZIAS.has(p.texto) &&
    !conhecidas.has(p.texto) &&
    !conhecidas.has(p.original) &&
    !usadas.has(p.original) &&
    p.termos.length === 1;
  for (let i = 1; i < lista.length; i++) {
    if (!ANTES_DE_NOME.has(lista[i - 1].original) || !desconhecida(lista[i])) continue;
    const nome = [lista[i].original];
    for (let j = i + 1; j < lista.length; j++) {
      if (desconhecida(lista[j])) nome.push(lista[j].original);
      else if (DENTRO_DE_NOME.has(lista[j].original) && j + 1 < lista.length && desconhecida(lista[j + 1])) nome.push(lista[j].original);
      else break;
    }
    return nome.join(' ');
  }
  return undefined;
}

/* ---------------- Pontuação ---------------- */

interface Nota {
  intencao: Intencao;
  completa: boolean;
  nota: number;
  fracao: number;
}

function pontuar(a: Analise, conteudoDaPergunta: Set<string>): Nota[] {
  const notas: Nota[] = [];
  for (const { intencao, exemplos } of preparar()) {
    if (intencao.bloqueios?.some((b) => a.tem(b))) continue;
    let melhorRegra = { completa: false, grupos: 0, fracao: 0 };
    for (const regra of intencao.regras) {
      const batidos = regra.filter((grupo) => grupo.some((t) => a.tem(t))).length;
      const completa = batidos === regra.length;
      const fracao = batidos / regra.length;
      const melhor =
        (completa && !melhorRegra.completa) ||
        (completa === melhorRegra.completa && (completa ? regra.length > melhorRegra.grupos : fracao > melhorRegra.fracao));
      if (melhor) melhorRegra = { completa, grupos: completa ? regra.length : batidos, fracao };
    }
    if (melhorRegra.fracao === 0) continue;
    const reforcos = (intencao.reforcos ?? []).filter((r) => a.tem(r)).length;
    let semelhanca = 0;
    if (conteudoDaPergunta.size) {
      for (const e of exemplos) {
        if (!e.size) continue;
        let comum = 0;
        for (const p of conteudoDaPergunta) if (e.has(p)) comum++;
        semelhanca = Math.max(semelhanca, comum / Math.max(e.size, conteudoDaPergunta.size));
      }
    }
    // "como/onde/tutorial…": quem pede instrução quer o "Como faço", não os números.
    const bonusAjuda = intencao.tema === 'ajuda' && PEDIDO_FORTE.some((t) => a.tem(t)) ? 2 : 0;
    notas.push({
      intencao,
      completa: melhorRegra.completa,
      fracao: melhorRegra.fracao,
      nota: 10 * melhorRegra.grupos + reforcos + 3 * semelhanca + bonusAjuda,
    });
  }
  return notas.sort((x, y) => Number(y.completa) - Number(x.completa) || y.nota - x.nota);
}

/* ---------------- Entender ---------------- */

export interface Entendimento {
  decisao: Decisao;
  /** Para depuração e testes. */
  notas: Nota[];
}

export function entender(entrada: EntradaMotor): Entendimento {
  const { perfil, hoje, entidades, contexto } = entrada;
  preparar();
  const lista = palavras(normalizar(entrada.texto), corretorPara(entidades));
  const frase = lista.map((p) => p.texto).join(' ');
  const base = analisar(lista, new Set());

  // Lacunas
  const periodos = extrairPeriodos(frase, hoje).map((p) => limitarPeriodo(p, hoje));
  const grupo = acharOpcao(frase, lista, entidades.grupos);
  const oficina = acharOpcao(frase, lista, entidades.oficinas);
  const dimensao = acharDimensao(base);
  const numero = acharNumero(lista);
  const usadas = new Set<string>([...(grupo?.palavras ?? []), ...(oficina?.palavras ?? [])]);
  const nome = acharNome(lista, vocabularioBase, usadas);

  const marcadores = new Set<string>();
  if (periodos.length) marcadores.add('#periodo');
  if (periodos.length >= 2) marcadores.add('#2periodos');
  if (grupo) marcadores.add('#grupo');
  if (oficina) marcadores.add('#oficina');
  if (nome) marcadores.add('#nome');
  if (dimensao) marcadores.add('#dimensao');
  if (numero != null) marcadores.add('#numero');
  const a = analisar(lista, marcadores);

  const lacunas: Lacunas = {
    periodos,
    grupo: grupo?.opcao,
    oficina: oficina?.opcao,
    nome,
    dimensao,
    numero,
    comparar: a.tem('comparar') || periodos.length >= 2,
  };

  const conteudoDaPergunta = new Set(conteudo(lista));
  const notas = pontuar(a, conteudoDaPergunta);
  const permitidas = notas.filter((n) => n.intencao.perfis.includes(perfil));
  const completas = permitidas.filter((n) => n.completa);
  const melhorProibida = notas.find((n) => n.completa && !n.intencao.perfis.includes(perfil));

  const verificador: Verificador = {
    tem: a.tem,
    palavrasUteis: conteudoDaPergunta.size,
    temNome: !!nome,
    temDominio: notas.length > 0 || !!grupo || !!oficina,
  };
  const temDados = completas.some((n) => n.intencao.tema !== 'ajuda');
  const categoria = classificarFora(verificador, temDados);

  const fora = (c: NonNullable<typeof categoria>, ajuda?: Intencao): Entendimento => ({
    decisao: { tipo: 'fora', categoria: c, lacunas, ajuda },
    notas,
  });

  // Proteção, dado pessoal, orientação e ofensa vencem qualquer intenção.
  if (categoria && ['protecao', 'dado-pessoal', 'orientacao', 'ofensa'].includes(categoria)) return fora(categoria);

  const ultima = contexto.ultima;
  const mesclar = (base: Lacunas): Lacunas => ({
    periodos: periodos.length ? periodos : base.periodos,
    grupo: grupo?.opcao ?? (oficina || nome ? undefined : base.grupo),
    oficina: oficina?.opcao ?? (grupo || nome ? undefined : base.oficina),
    nome: nome ?? (grupo || oficina ? undefined : base.nome),
    dimensao: dimensao ?? base.dimensao,
    numero: numero ?? base.numero,
    comparar: lacunas.comparar,
  });

  /** "e as faltas?", "agora os aniversariantes": continuação curta da conversa. */
  const continuacao = !!ultima && conteudoDaPergunta.size <= 4 && /^(e|agora|e quanto|e sobre)( |$)/.test(frase);

  if (completas.length) {
    const [primeira, segunda] = completas;
    // "lança a chamada" sem pedir ajuda: responde com o "Como faço", avisando que só consulta.
    if (primeira.intencao.tema === 'ajuda' && pedeAcao(verificador) && !['como', 'onde'].some((t) => a.tem(t))) {
      return fora('escrita', primeira.intencao);
    }
    const proibidaMaisEspecifica = melhorProibida && melhorProibida.nota >= primeira.nota + MARGEM_EMPATE;
    if (proibidaMaisEspecifica) return { decisao: { tipo: 'sem-permissao', intencao: melhorProibida.intencao }, notas };
    if (segunda && primeira.nota - segunda.nota < MARGEM_EMPATE) {
      return { decisao: { tipo: 'sugerir', opcoes: [primeira.intencao, segunda.intencao], lacunas }, notas };
    }
    const confianca = Math.min(1, 0.6 + (primeira.nota - (segunda?.nota ?? 0)) / 25);
    // Continuação ("e os aniversariantes?"): herda grupo e período da pergunta anterior.
    const herdadas = continuacao && ultima && primeira.intencao.tema !== 'ajuda' ? mesclar(ultima.lacunas) : lacunas;
    return { decisao: { tipo: 'executar', intencao: primeira.intencao, lacunas: herdadas, confianca }, notas };
  }

  // Troca de assunto mantendo grupo e período: "e as faltas?", "e a disciplina?", "agora os aniversariantes".
  if (ultima && continuacao && !categoria) {
    const herdados = new Set(marcadores);
    if (ultima.lacunas.periodos.length) herdados.add('#periodo');
    if (ultima.lacunas.grupo) herdados.add('#grupo');
    if (ultima.lacunas.oficina) herdados.add('#oficina');
    if (ultima.lacunas.nome) herdados.add('#nome');
    // Só conta como assunto novo o que a frase traz em PALAVRAS (não só um mês ou um grupo).
    const porPalavras = new Set(pontuar(analisar(lista, new Set()), conteudoDaPergunta).map((n) => n.intencao.id));
    const outras = pontuar(analisar(lista, herdados), conteudoDaPergunta).filter(
      (n) =>
        porPalavras.has(n.intencao.id) &&
        n.intencao.perfis.includes(perfil) &&
        n.intencao.tema !== 'ajuda' &&
        n.intencao.id !== ultima.intencao.id,
    );
    const alvo = outras.find((n) => n.completa) ?? outras.find((n) => n.fracao >= MINIMO_SUGESTAO);
    if (alvo) return { decisao: { tipo: 'executar', intencao: alvo.intencao, lacunas: mesclar(ultima.lacunas), confianca: 0.6 }, notas };
  }

  // Elipse: "e em setembro?", "e o grupo B?", "compara com o mês passado".
  const trocouAlgo = periodos.length || grupo || oficina || nome || dimensao || numero != null || lacunas.comparar;
  if (ultima && trocouAlgo && conteudoDaPergunta.size <= 6 && !categoria) {
    return { decisao: { tipo: 'executar', intencao: ultima.intencao, lacunas: mesclar(ultima.lacunas), confianca: 0.6 }, notas };
  }

  if (melhorProibida) return { decisao: { tipo: 'sem-permissao', intencao: melhorProibida.intencao }, notas };

  if (categoria === 'escrita') return fora(categoria, permitidas.find((n) => n.intencao.tema === 'ajuda')?.intencao);
  if (categoria) return fora(categoria);

  const sugestoes = permitidas.filter((n) => n.fracao >= MINIMO_SUGESTAO).slice(0, 3).map((n) => n.intencao);
  if (sugestoes.length) return { decisao: { tipo: 'sugerir', opcoes: sugestoes, lacunas }, notas };

  // Não entendi a pergunta, mas entendi DO QUE se fala: ofereço o que sei sobre aquilo.
  const peloAssunto = sugestoesPelasLacunas(lacunas, perfil);
  if (peloAssunto.length) return { decisao: { tipo: 'sugerir', opcoes: peloAssunto, lacunas }, notas };
  return fora('nao-entendi');
}

/** Grupo, oficina, nome ou período reconhecidos → perguntas que fazem sentido sobre eles. */
function sugestoesPelasLacunas(l: Lacunas, perfil: Role): Intencao[] {
  const ids = l.nome
    ? ['freq.atendido', 'disc.atendido']
    : l.grupo
      ? ['freq.grupo', 'freq.faltas.seguidas', 'grupo.vagas', 'atend.aniversario']
      : l.oficina
        ? ['freq.oficinas', 'oficina.responsavel']
        : l.dimensao
          ? ['atend.distribuicao']
          : l.periodos.length
            ? ['freq.grupo', 'disc.resumo', 'atend.movimento', 'atend.aniversario']
            : [];
  return ids
    .map((id) => INTENCOES.find((i) => i.id === id))
    .filter((i): i is Intencao => !!i && i.perfis.includes(perfil))
    .slice(0, 3);
}
