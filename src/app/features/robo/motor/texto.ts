/**
 * Robozinho ADRA — tratamento do texto digitado, sem biblioteca:
 * normalizar → separar palavras → corrigir digitação → marcar sinônimos.
 *
 * Tudo aqui é puro (sem Angular) para o banco de frases testar rápido.
 */

/** Minúsculas, sem acento, sem pontuação (mantém / e - entre números), espaços simples. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/(\d)\s*[/-]\s*(\d)/g, '$1/$2')
    .replace(/[^a-z0-9/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Abreviações e grafias de internet → palavra inteira. */
const ABREVIACOES: Record<string, string> = {
  vc: 'voce', vcs: 'voces', voc: 'voce', q: 'que', oq: 'o que', pq: 'porque', tb: 'tambem', tbm: 'tambem',
  msm: 'mesmo', qnt: 'quantos', qnts: 'quantos', qtd: 'quantidade', qtde: 'quantidade', qts: 'quantos',
  qto: 'quanto', freq: 'frequencia', frequencia: 'frequencia', presen: 'presenca', hj: 'hoje', ta: 'esta',
  tah: 'esta', to: 'estou', pra: 'para', pro: 'para o', pros: 'para os', p: 'para', n: 'nao', num: 'nao',
  nao: 'nao', ngm: 'ninguem', obg: 'obrigado', obgd: 'obrigado', vlw: 'valeu', blz: 'beleza', mt: 'muito',
  mto: 'muito', mtos: 'muitos', td: 'tudo', tds: 'todos', ate: 'ate', d: 'de', dps: 'depois', aq: 'aqui',
  pfv: 'por favor', pf: 'por favor', pfvr: 'por favor', add: 'adicionar', info: 'informacao', infos: 'informacoes',
  relat: 'relatorio', rel: 'relatorio', pdf: 'pdf', disc: 'disciplinar', ocorr: 'ocorrencia', advert: 'advertencia',
  susp: 'suspensao', precad: 'precadastro', 'pre': 'pre', niver: 'aniversario', aniver: 'aniversario',
};

/** Números por extenso até 31 (para "tres faltas", "dois mil e vinte e cinco" fica de fora). */
const NUMEROS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17,
  dezoito: 18, dezenove: 19, vinte: 20, trinta: 30,
};

export function numeroPorExtenso(palavra: string): number | null {
  return NUMEROS[palavra] ?? null;
}

/** Palavras que não carregam sentido para escolher a intenção (nem para achar nome de pessoa). */
export const PALAVRAS_VAZIAS = new Set(
  (
    'a o as os um uma uns umas de do da dos das no na nos nas em e ou que qual quais com sem por para ' +
    'pelo pela pelos pelas ao aos me mim meu minha meus minhas te teu tua seu sua seus suas se ele ela eles ' +
    'elas isso isto esse essa esses essas este esta estes estas aquele aquela la lá ai aí ali aqui ja so só ' +
    'tambem mais menos muito muita muitos muitas pouco bem mal sim nao ne né tipo entao então agora ainda ' +
    'eu voce voces nos gente favor por favor obrigado oi ola olá bom boa dia tarde noite tudo beleza ' +
    'queria quero gostaria preciso precisa poderia pode podia consegue consegues saber sabe sei mostra mostre ' +
    'mostrar me diga diz dizer fala falar ver veja vendo traz trazer manda mandar passa passar informa ' +
    'informar fazer faz sobre acerca relacao tem temos teve tinha ter existe existem esta estao estava foi ' +
    'foram sao é e ser sera seria era como quanto quanta quando onde porque pq qual cade cadê hein ein'
  ).split(' '),
);

/** Grafias e sinônimos → termo canônico do domínio. Cada palavra pode virar mais de um termo. */
const SINONIMOS: Record<string, string[]> = {
  turma: ['grupo'], turmas: ['grupo'], sala: ['grupo'], salas: ['grupo'], classe: ['grupo'], classes: ['grupo'],
  grupos: ['grupo'], grupo: ['grupo'],
  aluno: ['atendido'], alunos: ['atendido'], aluna: ['atendido'], alunas: ['atendido'], crianca: ['atendido'],
  criancas: ['atendido'], adolescente: ['atendido'], adolescentes: ['atendido'], jovem: ['atendido'],
  jovens: ['atendido'], assistido: ['atendido'], assistidos: ['atendido'], atendidos: ['atendido'],
  atendido: ['atendido'], menino: ['atendido', 'sexo'], meninos: ['atendido', 'sexo'], menina: ['atendido', 'sexo'],
  meninas: ['atendido', 'sexo'], participante: ['atendido'], participantes: ['atendido'], beneficiario: ['atendido'],
  beneficiarios: ['atendido'], matriculados: ['atendido'], inscritos: ['atendido'], pessoas: ['atendido'],
  presenca: ['frequencia'], presencas: ['frequencia'], assiduidade: ['frequencia'], comparecimento: ['frequencia'],
  frequencias: ['frequencia'], frequencia: ['frequencia'], frequente: ['frequencia'], frequentes: ['frequencia'],
  presente: ['frequencia'], presentes: ['frequencia'], vieram: ['frequencia'], veio: ['frequencia'],
  compareceram: ['frequencia'],
  falta: ['falta'], faltas: ['falta'], faltou: ['falta'], faltaram: ['falta'], faltando: ['falta'], faltam: ['falta'],
  faltoso: ['falta'], faltosos: ['falta'], ausencia: ['falta'], ausencias: ['falta'], ausente: ['falta'],
  ausentes: ['falta'], faltante: ['falta'], faltantes: ['falta'],
  curso: ['oficina'], cursos: ['oficina'], atividade: ['oficina'], atividades: ['oficina'], oficinas: ['oficina'],
  oficina: ['oficina'], aula: ['oficina'], aulas: ['oficina'],
  ocorrencia: ['disciplinar'], ocorrencias: ['disciplinar'], advertencia: ['disciplinar'],
  advertencias: ['disciplinar'], suspensao: ['disciplinar', 'suspensao'], suspensoes: ['disciplinar', 'suspensao'],
  suspenso: ['disciplinar', 'suspensao'], suspensos: ['disciplinar', 'suspensao'], disciplina: ['disciplinar'],
  disciplinar: ['disciplinar'], disciplinares: ['disciplinar'], comportamento: ['disciplinar'], briga: ['disciplinar'],
  brigas: ['disciplinar'], indisciplina: ['disciplinar'], registro: ['disciplinar'], registros: ['disciplinar'],
  responsavel: ['responsavel'], responsaveis: ['responsavel'], mae: ['responsavel'], pai: ['responsavel'],
  familia: ['responsavel'], familias: ['responsavel'], pais: ['responsavel'],
  desligamento: ['desligamento'], desligamentos: ['desligamento'], desligar: ['desligamento'],
  desligado: ['desligamento', 'saida'], desligados: ['desligamento', 'saida'], desligada: ['desligamento', 'saida'],
  precadastro: ['precadastro'], precadastros: ['precadastro'], inscricao: ['precadastro'], inscricoes: ['precadastro'],
  semanario: ['semanario'], semanarios: ['semanario'], planejamento: ['semanario'], planejamentos: ['semanario'],
  chamada: ['chamada'], chamadas: ['chamada'], lista: ['lista'], listas: ['lista'],
  aniversario: ['aniversario'], aniversarios: ['aniversario'], aniversariante: ['aniversario'],
  aniversariantes: ['aniversario'],
  relatorio: ['relatorio'], relatorios: ['relatorio'], pdf: ['relatorio'], documento: ['relatorio'],
  vaga: ['vaga'], vagas: ['vaga'], lotado: ['vaga'], lotada: ['vaga'], lotados: ['vaga'], cheio: ['vaga'],
  cheios: ['vaga'], capacidade: ['vaga'], ocupacao: ['vaga'],
  entrada: ['entrada'], entradas: ['entrada'], entraram: ['entrada'], entrou: ['entrada'], novos: ['entrada'],
  novas: ['entrada'], chegaram: ['entrada'], matricula: ['entrada', 'matricula'], matriculas: ['entrada', 'matricula'],
  saida: ['saida'], saidas: ['saida'], sairam: ['saida'], saiu: ['saida'], evasao: ['evasao'],
  compara: ['comparar'], comparar: ['comparar'], comparacao: ['comparar'], comparativo: ['comparar'],
  compare: ['comparar'], versus: ['comparar'], vs: ['comparar'], x: ['comparar'], contra: ['comparar'],
  diferenca: ['comparar'], ranking: ['ranking'], rank: ['ranking'], classificacao: ['ranking'], pior: ['ranking'],
  piores: ['ranking'], melhor: ['ranking'], melhores: ['ranking'], maior: ['ranking'], menor: ['ranking'],
  quantos: ['quantos'], quantas: ['quantos'], quantidade: ['quantos'], total: ['quantos'], numero: ['quantos'],
  contagem: ['quantos'], somam: ['quantos'],
  pendente: ['pendente'], pendentes: ['pendente'], pendencia: ['pendente'], pendencias: ['pendente'],
  atrasada: ['pendente'], atrasadas: ['pendente'], atrasado: ['pendente'], atrasados: ['pendente'],
  aguardando: ['pendente'], esquecida: ['pendente'], esquecidas: ['pendente'],
};

export interface Palavra {
  /** Como foi digitada (já normalizada), antes da correção — usada para nomes de pessoas. */
  original: string;
  /** Como ficou depois de normalizar e corrigir. */
  texto: string;
  /** Termos que ela vale para o catálogo (ela mesma + canônicos). */
  termos: string[];
}

/** Separa em palavras, expande abreviações e marca os termos canônicos. */
export const SINONIMOS_CONHECIDOS = (): string[] => Object.keys(SINONIMOS);

export function palavras(normalizado: string, corrigir: (p: string) => string = (p) => p): Palavra[] {
  const saida: Palavra[] = [];
  for (const bruta of normalizado.split(' ')) {
    if (!bruta) continue;
    const expandida = ABREVIACOES[bruta] ?? bruta;
    for (const parte of expandida.split(' ')) {
      const texto = /^\d/.test(parte) ? parte : corrigir(parte);
      saida.push({ original: parte, texto, termos: [texto, ...(SINONIMOS[texto] ?? [])] });
    }
  }
  return saida;
}

/** Distância de edição com transposição (Damerau-Levenshtein restrita). */
export function distancia(a: string, b: string, limite = 3): number {
  if (Math.abs(a.length - b.length) > limite) return limite + 1;
  const linhas = a.length + 1;
  const colunas = b.length + 1;
  const d: number[][] = Array.from({ length: linhas }, (_, i) => {
    const linha = new Array<number>(colunas).fill(0);
    linha[0] = i;
    return linha;
  });
  for (let j = 0; j < colunas; j++) d[0][j] = j;
  for (let i = 1; i < linhas; i++) {
    let menorDaLinha = Infinity;
    for (let j = 1; j < colunas; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, d[i - 2][j - 2] + 1);
      }
      d[i][j] = v;
      menorDaLinha = Math.min(menorDaLinha, v);
    }
    if (menorDaLinha > limite) return limite + 1;
  }
  return d[a.length][b.length];
}

/**
 * Corretor de digitação contra um vocabulário: palavras com 5+ letras fora do
 * vocabulário viram a mais próxima com distância 1 (8+ letras: até 2).
 * Empate ou nada perto: fica como está.
 */
export function criarCorretor(vocabulario: Iterable<string>): (palavra: string) => string {
  const conhecidas = new Set<string>();
  for (const v of vocabulario) conhecidas.add(v);
  for (const v of Object.keys(SINONIMOS)) conhecidas.add(v);
  for (const v of PALAVRAS_VAZIAS) conhecidas.add(v);
  const lista = [...conhecidas].filter((p) => p.length >= 4);
  const cache = new Map<string, string>();
  return (palavra) => {
    if (palavra.length < 5 || conhecidas.has(palavra)) return palavra;
    const guardada = cache.get(palavra);
    if (guardada) return guardada;
    const limite = palavra.length >= 8 ? 2 : 1;
    let melhor = palavra;
    let melhorDist = limite + 1;
    let empate = false;
    for (const candidata of lista) {
      // Duas letras de diferença só entre palavras de tamanho parecido ("presidente" não vira "presente").
      const limiteDaCandidata = Math.abs(candidata.length - palavra.length) <= 1 ? limite : 1;
      const dist = distancia(palavra, candidata, limiteDaCandidata);
      if (dist > limiteDaCandidata) continue;
      if (dist < melhorDist) {
        melhor = candidata;
        melhorDist = dist;
        empate = false;
      } else if (dist === melhorDist && dist <= limite && candidata !== melhor) {
        empate = true;
      }
    }
    const resultado = melhorDist <= limite && !empate ? melhor : palavra;
    cache.set(palavra, resultado);
    return resultado;
  };
}

/** Todos os termos (canônicos e originais) presentes, para busca rápida. */
export function termosDe(lista: Palavra[]): Set<string> {
  const termos = new Set<string>();
  for (const p of lista) for (const t of p.termos) termos.add(t);
  return termos;
}
