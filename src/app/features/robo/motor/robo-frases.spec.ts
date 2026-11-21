/**
 * ADRAbot — banco de frases. Mede o entendimento do robô com frases reais
 * do dia a dia (formais, informais, com erro de digitação, sem acento) e
 * frases fora do escopo. Falha abaixo das metas do design:
 *   ≥ 95% de acerto da intenção, ≥ 98% das fora do escopo sem consulta.
 *
 * Ao ensinar uma pergunta nova ao robô, acrescente as frases aqui.
 */
import { Role } from '../../../shared/enum/role.enum';
import { INTENCOES } from './catalogo';
import { entender } from './motor';
import { ContextoConversa, Entidades } from './tipos';

const HOJE = new Date(2026, 10, 19); // 19/11/2026
const ENTIDADES: Entidades = {
  grupos: [
    { id: 1, nome: 'Girassol' },
    { id: 2, nome: 'Ipê' },
    { id: 3, nome: 'Turma B' },
    { id: 4, nome: 'Grupo A - Futebol' },
  ],
  oficinas: [
    { id: 10, nome: 'Futebol', detalhe: 'Carlos' },
    { id: 11, nome: 'Teatro', detalhe: 'Bia' },
    { id: 12, nome: 'Música', detalhe: 'Rui' },
  ],
};
const SEM_CONTEXTO: ContextoConversa = { falhasSeguidas: 0 };

function decidir(texto: string, perfil = Role.COORD, contexto = SEM_CONTEXTO) {
  return entender({ texto, perfil, hoje: HOJE, entidades: ENTIDADES, contexto }).decisao;
}

/** Variações além dos exemplos do catálogo (que também são testados). */
const VARIACOES: Record<string, string[]> = {
  'freq.grupo': [
    'frequencia do girassol',
    'como ta a frequencia do grupo ipe',
    'frequecia de outubro',
    'qual a presença do grupo girassol em setembro?',
    'me fala a frequência geral',
    'Frequência deste mês',
    'frequencia da turma b',
    'qnts faltas teve o ipe',
    'porcentagem de presenca do mes passado',
  ],
  'freq.comparar.grupos': [
    'qual grupo tem mais faltas',
    'comparar os grupos',
    'qual grupo tem a melhor frequencia',
    'ranking dos grupos',
    'frequencia por grupo em outubro',
  ],
  'freq.evolucao': [
    'frequencia de setembro e outubro',
    'evolução da presença',
    'a frequencia melhorou?',
    'frequencia 2025 x 2026',
    'compara a frequencia de outubro com setembro',
  ],
  'freq.oficinas': ['frequencia da oficina de teatro', 'qual oficina tem pior frequencia', 'faltas por oficina'],
  'freq.dia.semana': ['qual dia da semana tem mais falta', 'frequencia nas sextas', 'que dia os alunos faltam mais'],
  'freq.faltas.seguidas': [
    'quem ta faltando muito',
    'alunos que pararam de vir',
    'criancas com faltas consecutivas',
    'quem esta sumido',
    'risco de evasão',
    'quem faltou 3 vezes seguidas',
  ],
  'freq.atendido': ['frequencia da ana clara', 'faltas do joao pedro', 'presença do aluno gabriel'],
  'freq.chamadas.pendentes': ['quais chamadas faltam lancar', 'chamadas pendentes', 'tem chamada esquecida'],
  'atend.total': ['quantos alunos temos', 'qtd de criancas ativas', 'total de atendidos'],
  'atend.distribuicao': ['atendidos por sexo', 'quantos atendidos em cada bairro', 'quantas meninas', 'atendidos por idade', 'quantos estudam a tarde na escola'],
  'atend.movimento': ['quantos entraram em 2025', 'quantos alunos sairam esse ano', 'motivo das saidas', 'quantas matriculas esse ano'],
  'atend.aniversario': ['quem faz aniversario esse mes', 'aniversarios de dezembro', 'aniversariantes do grupo girassol'],
  'social.programas': ['quantos tem bolsa familia', 'atendidos com bpc', 'quantas familias recebem auxilio'],
  'social.renda': ['renda das familias', 'quantos sao de baixa renda'],
  'social.saude': ['quantos tem deficiencia', 'quantos autistas', 'criancas com laudo'],
  'social.completo': ['prestação de contas', 'perfil socioeconomico', 'relatorio pro cmdca'],
  'grupo.vagas': ['tem vaga', 'grupos com vaga', 'o girassol esta lotado?'],
  'grupo.lista': ['quais sao os grupos', 'que grupos temos'],
  'oficina.responsavel': ['quem da teatro', 'quem é o professor de musica'],
  'semanario.pendentes': ['quem nao mandou o semanario', 'semanario atrasado'],
  'disc.resumo': ['ocorrencias de outubro', 'quantas suspensoes esse mes', 'resumo disciplinar'],
  'disc.um.passo': ['quem ta quase sendo suspenso', 'quem esta perto de levar advertencia'],
  'disc.atendido': ['ocorrencias da maria eduarda', 'historico disciplinar do lucas'],
  'pend.resumo': ['pendencias', 'o que tenho pra hoje', 'tenho algum aviso'],
  'pend.precadastros': ['tem pre cadastro pendente', 'quantas inscricoes para avaliar'],
  'pend.desligamentos': ['pedidos de desligamento', 'tem desligamento pendente'],
  'relatorio.menu': ['quero gerar um relatorio', 'relatorio em pdf'],
  'ajuda.chamada': ['como faço a chamada', 'onde lanço a chamada', 'como lancar chamada'],
  'ajuda.justificar': ['como justificar falta', 'onde ponho atestado'],
  'ajuda.siglas': ['o que é FJ', 'o que significa P F FJ'],
  'ajuda.corrigir.entrada': ['como corrigir a data de entrada no grupo'],
  'ajuda.cadastrar': ['como cadastrar aluno novo', 'como cadastro uma criança'],
  'ajuda.precadastro': ['como avaliar o pre cadastro', 'como aprovar inscrição'],
  'ajuda.rematricula': ['como fazer rematricula'],
  'ajuda.desligamento': ['como desligar um atendido', 'como pedir desligamento'],
  'ajuda.ocorrencia': ['como registrar ocorrencia', 'como dou advertencia'],
  'ajuda.semanario': ['como mando o semanario', 'como preencho o semanário'],
  'ajuda.imprimir': ['como imprimir a lista de frequencia', 'como salvar em pdf'],
  'ajuda.faixa.etaria': ['como cadastrar faixa etaria'],
  'ajuda.convidar': ['como convidar usuario', 'como dar acesso para um educador'],
  'ajuda.senha': ['como trocar minha senha', 'esqueci a senha'],
};

const FORA_DO_ESCOPO: string[] = [
  'quem ganhou o jogo ontem',
  'vai chover amanha?',
  'me conta uma piada',
  'qual a capital da franca',
  'quanto e 2 mais 2',
  'escreva um poema',
  'o que voce acha do presidente',
  'qual a melhor religiao',
  'me recomenda um filme',
  'quanto esta o dolar',
  'traduz isso para ingles',
  'faz uma receita de bolo',
  'qual meu signo',
  'como programar em python',
  'bitcoin vai subir',
  'qual o cpf da ana clara',
  'qual a renda da familia do joao',
  'onde mora o pedro',
  'telefone da mae da julia',
  'o lucas tem alguma doenca',
  'o que eu faco com o pedro que bate nos colegas',
  'acho que a maria sofre violencia em casa',
  'seu robo burro',
  'asdkjasd',
  'blablabla',
];

const META: Record<string, string> = {
  oi: 'saudacao',
  'bom dia': 'saudacao',
  obrigado: 'agradecimento',
  valeu: 'agradecimento',
  tchau: 'despedida',
  'quem e voce': 'apresentacao',
  'o que voce sabe fazer': 'apresentacao',
  menu: 'menu',
  ajuda: 'menu',
};

function perfilQuePode(id: string): Role {
  const intencao = INTENCOES.find((i) => i.id === id)!;
  return intencao.perfis.includes(Role.COORD) ? Role.COORD : intencao.perfis[0];
}

describe('ADRAbot — banco de frases', () => {
  it('acerta a intenção em pelo menos 95% das frases', () => {
    const erros: string[] = [];
    let total = 0;
    for (const intencao of INTENCOES) {
      const frases = [...intencao.exemplos, ...(VARIACOES[intencao.id] ?? [])];
      for (const frase of frases) {
        total++;
        const d = decidir(frase, perfilQuePode(intencao.id));
        const obtido = d.tipo === 'executar' ? d.intencao.id : d.tipo === 'fora' && d.ajuda ? d.ajuda.id : `(${d.tipo}${d.tipo === 'sugerir' ? ': ' + d.opcoes.map((o) => o.id).join(', ') : d.tipo === 'fora' ? ': ' + d.categoria : ''})`;
        if (obtido !== intencao.id) erros.push(`"${frase}" → esperado ${intencao.id}, veio ${obtido}`);
      }
    }
    const acerto = (total - erros.length) / total;
    if (acerto < 0.95) console.log(`Acerto ${(acerto * 100).toFixed(1)}% de ${total}\n` + erros.join('\n'));
    expect(acerto).toBeGreaterThanOrEqual(0.95);
  });

  it('não executa consulta para frases fora do escopo (≥ 98%)', () => {
    const vazaram = FORA_DO_ESCOPO.filter((f) => decidir(f).tipo === 'executar');
    if (vazaram.length) console.log('Executou fora do escopo:\n' + vazaram.join('\n'));
    expect(1 - vazaram.length / FORA_DO_ESCOPO.length).toBeGreaterThanOrEqual(0.98);
  });

  it('classifica saudação, agradecimento, despedida e menu', () => {
    for (const [frase, categoria] of Object.entries(META)) {
      const d = decidir(frase);
      expect(d.tipo === 'fora' ? d.categoria : d.tipo, frase).toBe(categoria);
    }
  });

  it('protege criança e dado pessoal mesmo quando a pergunta parece de dados', () => {
    const d1 = decidir('acho que a maria sofre violencia em casa');
    expect(d1.tipo === 'fora' && d1.categoria).toBe('protecao');
    const d2 = decidir('qual a renda da familia do joao');
    expect(d2.tipo === 'fora' && d2.categoria).toBe('dado-pessoal');
  });

  it('pedido de ação vira "eu só consulto" com o Como faço', () => {
    const d = decidir('lança a chamada do grupo girassol pra mim', Role.EDUCADOR);
    expect(d.tipo).toBe('fora');
    if (d.tipo === 'fora') {
      expect(d.categoria).toBe('escrita');
      expect(d.ajuda?.id).toBe('ajuda.chamada');
    }
  });

  it('perfil sem acesso recebe aviso, não os dados', () => {
    const d = decidir('quantos recebem bolsa familia', Role.EDUCADOR);
    expect(d.tipo).toBe('sem-permissao');
  });

  it('extrai grupo, período e comparação', () => {
    const d = decidir('frequencia do girassol em outubro x setembro');
    expect(d.tipo).toBe('executar');
    if (d.tipo === 'executar') {
      expect(d.lacunas.grupo?.nome).toBe('Girassol');
      expect(d.lacunas.periodos.map((p) => p.de)).toEqual(['2026-10', '2026-09']);
      expect(d.lacunas.comparar).toBe(true);
    }
  });

  it('mês sem ano no futuro vira o do ano passado', () => {
    const d = decidir('frequencia de dezembro');
    expect(d.tipo === 'executar' && d.lacunas.periodos[0].de).toBe('2025-12');
  });

  it('entende "e em setembro?" pelo contexto', () => {
    const primeira = decidir('frequencia do girassol em outubro');
    expect(primeira.tipo).toBe('executar');
    if (primeira.tipo !== 'executar') return;
    const contexto: ContextoConversa = { falhasSeguidas: 0, ultima: { intencao: primeira.intencao, lacunas: primeira.lacunas } };
    const d = decidir('e em setembro?', Role.COORD, contexto);
    expect(d.tipo === 'executar' && d.intencao.id).toBe('freq.grupo');
    if (d.tipo === 'executar') {
      expect(d.lacunas.periodos[0].de).toBe('2026-09');
      expect(d.lacunas.grupo?.nome).toBe('Girassol');
    }
    const outroGrupo = decidir('e o ipe?', Role.COORD, contexto);
    expect(outroGrupo.tipo === 'executar' && outroGrupo.lacunas.grupo?.nome).toBe('Ipê');
  });

  it('acha nome de atendido e corrige digitação', () => {
    const d = decidir('frequecia da ana clara');
    expect(d.tipo === 'executar' && d.intencao.id).toBe('freq.atendido');
    expect(d.tipo === 'executar' && d.lacunas.nome).toBe('ana clara');
  });

  it('troca de assunto mantendo grupo e período ("e as faltas?", "e a disciplina?")', () => {
    const primeira = decidir('frequencia do girassol em outubro');
    if (primeira.tipo !== 'executar') throw new Error('primeira pergunta não executou');
    const contexto: ContextoConversa = { falhasSeguidas: 0, ultima: { intencao: primeira.intencao, lacunas: primeira.lacunas } };
    const disciplina = decidir('e a disciplina?', Role.COORD, contexto);
    expect(disciplina.tipo === 'executar' && disciplina.intencao.id).toBe('disc.resumo');
    expect(disciplina.tipo === 'executar' && disciplina.lacunas.periodos[0].de).toBe('2026-10');
    const aniversarios = decidir('e os aniversariantes?', Role.COORD, contexto);
    expect(aniversarios.tipo === 'executar' && aniversarios.intencao.id).toBe('atend.aniversario');
    expect(aniversarios.tipo === 'executar' && aniversarios.lacunas.grupo?.nome).toBe('Girassol');
  });

  it('sem entender a pergunta, sugere pelo assunto reconhecido', () => {
    const d = decidir('girassol');
    expect(d.tipo).toBe('sugerir');
    if (d.tipo === 'sugerir') {
      expect(d.opcoes.map((o) => o.id)).toContain('freq.grupo');
      expect(d.lacunas.grupo?.nome).toBe('Girassol');
    }
  });
});
