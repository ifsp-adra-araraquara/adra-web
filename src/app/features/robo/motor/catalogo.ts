/**
 * ADRAbot — catálogo do que o robô sabe responder. Cada intenção diz quem
 * pode perguntar, como reconhecer a pergunta e traz frases de exemplo (que
 * também alimentam o banco de testes em robo-frases.spec.ts).
 *
 * Para ensinar uma pergunta nova: acrescente a intenção aqui, a resposta em
 * respostas/ e pelo menos 15 frases no banco de testes.
 */
import { Role } from '../../../shared/enum/role.enum';
import { AJUDAS } from './ajuda';
import { Intencao } from './tipos';

const C = Role.COORD;
const AS = Role.ASSISTENTE;
const ES = Role.EDUCADOR;
const O = Role.OFICINEIRO;
const TODOS = [C, AS, ES, O];

const FREQ = ['frequencia', 'percentual*', 'porcentagem', 'taxa de presenca', 'indice'];
const FREQ_OU_FALTA = [...FREQ, 'falta'];

export const INTENCOES_DADOS: Intencao[] = [
  /* ============================ Frequência ============================ */
  {
    id: 'freq.grupo',
    tema: 'frequencia',
    titulo: 'Frequência dos grupos',
    perfis: TODOS,
    regras: [[FREQ], [['falta'], ['#grupo', 'quantos', 'teve', 'tiveram', 'houve']]],
    reforcos: ['#grupo', '#periodo', 'mes', 'geral', 'como esta', 'como anda', 'como foi'],
    exemplos: [
      'como esta a frequencia do grupo girassol',
      'frequencia de outubro',
      'qual a frequencia geral deste mes',
      'frequencia dos grupos no mes passado',
      'quantas faltas teve o grupo ipe em setembro',
      'presenca da turma b esse mes',
    ],
    sugestao: 'Frequência dos grupos neste mês',
  },
  {
    id: 'freq.comparar.grupos',
    tema: 'frequencia',
    titulo: 'Comparar grupos',
    perfis: [C, AS, ES, O],
    regras: [
      [['grupo'], ['comparar', 'ranking']],
      [FREQ_OU_FALTA, ['grupo'], ['comparar', 'ranking', 'qual grupo', 'quais grupos', 'cada grupo', 'todos os grupos', 'por grupo', 'entre os grupos', 'grupo que mais', 'grupo com mais', 'grupo com menos', 'grupos que mais', 'grupos com mais']],
    ],
    reforcos: ['#periodo', 'mais', 'menos'],
    exemplos: [
      'compara a frequencia dos grupos',
      'qual grupo falta mais',
      'ranking de frequencia por grupo',
      'qual grupo tem a pior frequencia em outubro',
      'frequencia de cada grupo esse mes',
    ],
    sugestao: 'Qual grupo tem a menor frequência neste mês?',
  },
  {
    id: 'freq.evolucao',
    tema: 'frequencia',
    titulo: 'Frequência ao longo dos meses',
    perfis: TODOS,
    regras: [
      [FREQ_OU_FALTA, ['comparar', 'evolu*', 'tendencia', 'historico', 'mes a mes', 'mes por mes', 'caiu', 'subiu', 'melhorou', 'piorou', 'aumentou', 'diminuiu', 'variacao', 'ultimos']],
      [FREQ_OU_FALTA, ['#2periodos']],
    ],
    reforcos: ['#periodo', '#grupo'],
    exemplos: [
      'frequencia de setembro x outubro',
      'compara a frequencia com o mes passado',
      'a frequencia caiu',
      'evolucao da frequencia nos ultimos 6 meses',
      'frequencia deste ano comparada com o ano passado',
    ],
    sugestao: 'Frequência dos últimos 6 meses',
  },
  {
    id: 'freq.oficinas',
    tema: 'frequencia',
    titulo: 'Frequência por oficina',
    perfis: [C, AS, ES, O],
    regras: [[FREQ_OU_FALTA, ['oficina']]],
    reforcos: ['ranking', 'comparar', '#oficina', '#periodo'],
    bloqueios: ['quem da', 'quem e o', 'quem e a'],
    exemplos: [
      'ranking das oficinas por frequencia',
      'qual oficina tem mais faltas',
      'frequencia da oficina de futebol',
      'frequencia por oficina em outubro',
    ],
    sugestao: 'Ranking das oficinas por frequência',
  },
  {
    id: 'freq.dia.semana',
    tema: 'frequencia',
    titulo: 'Faltas por dia da semana',
    perfis: TODOS,
    regras: [
      [FREQ_OU_FALTA, ['dia da semana', 'dias da semana', 'qual dia', 'que dia', 'em que dia', 'dia que mais', 'dias que mais', 'segunda*', 'terca*', 'quarta*', 'quinta*', 'sexta*', 'sabado*']],
    ],
    reforcos: ['#grupo', '#periodo'],
    exemplos: [
      'em que dia da semana falta mais gente',
      'qual dia tem mais faltas',
      'frequencia por dia da semana',
      'as sextas faltam mais',
    ],
    sugestao: 'Em que dia da semana falta mais gente?',
  },
  {
    id: 'freq.faltas.seguidas',
    tema: 'frequencia',
    titulo: 'Quem está faltando seguido',
    perfis: TODOS,
    regras: [
      [['falta'], ['seguid*', 'consecutiv*', 'sem vir', 'sem aparecer', 'quem', 'risco', 'muitas', 'varias', 'direto', 'sumido*', 'sumiu']],
      [['evasao']],
      [['parou de vir', 'pararam de vir', 'nao vem mais', 'nao esta vindo', 'nao estao vindo', 'deixou de vir', 'deixaram de vir', 'sumiu', 'sumiram', 'sumido*']],
    ],
    reforcos: ['#numero', 'atendido'],
    bloqueios: ['dia da semana', 'qual dia', 'oficina', 'qual grupo'],
    exemplos: [
      'quem esta faltando seguido',
      'alunos com 3 faltas seguidas',
      'quem esta em risco de evasao',
      'quais criancas pararam de vir',
      'quem faltou muito',
      'quem sumiu',
    ],
    sugestao: 'Quem está faltando seguido?',
  },
  {
    id: 'freq.atendido',
    tema: 'frequencia',
    titulo: 'Frequência de um atendido',
    perfis: [C, AS, ES],
    regras: [[FREQ_OU_FALTA, ['#nome']]],
    reforcos: ['#periodo', 'atendido'],
    exemplos: ['frequencia do joao', 'quantas faltas tem a maria eduarda', 'presenca da ana clara este ano'],
    sugestao: 'Frequência de um atendido',
  },
  {
    id: 'freq.chamadas.pendentes',
    tema: 'frequencia',
    titulo: 'Chamadas não lançadas',
    perfis: [C],
    regras: [
      [['chamada'], ['pendente', 'nao lanc*', 'sem lanc*', 'falta lanc*', 'faltam', 'faltando', 'quais', 'quem nao', 'situacao', 'status', 'esquec*', 'nao fiz*', 'nao feita*', 'nao foram']],
    ],
    reforcos: ['#periodo', '#grupo'],
    exemplos: [
      'quais chamadas estao pendentes',
      'tem chamada atrasada',
      'chamadas que nao foram lancadas',
      'situacao das chamadas',
    ],
    sugestao: 'Quais chamadas não foram lançadas?',
  },

  /* ============================ Atendidos ============================ */
  {
    id: 'atend.total',
    tema: 'atendidos',
    titulo: 'Quantos atendidos',
    perfis: [C, AS],
    regras: [[['quantos'], ['atendido']]],
    reforcos: ['ativos', 'hoje', 'temos'],
    bloqueios: ['#dimensao', 'entrada', 'saida', 'falta', 'frequencia', 'disciplinar', 'aniversario', 'saude', 'deficien*', 'pcd', 'laudo*', 'autis*', 'bolsa familia', 'bpc', 'renda*', 'beneficio*', 'auxilio*', 'nis', 'especiais'],
    exemplos: ['quantos atendidos temos', 'qual o total de criancas', 'quantos alunos ativos', 'numero de atendidos hoje'],
    sugestao: 'Quantos atendidos temos hoje?',
  },
  {
    id: 'atend.distribuicao',
    tema: 'atendidos',
    titulo: 'Atendidos por perfil',
    perfis: [C, AS],
    regras: [[['atendido', 'quantos', 'distribui*', 'divid*', 'perfil'], ['#dimensao']]],
    reforcos: ['por'],
    bloqueios: ['frequencia', 'falta', 'disciplinar', 'renda', 'bolsa familia'],
    exemplos: [
      'quantos atendidos por bairro',
      'quantos meninos e meninas',
      'atendidos por faixa etaria',
      'quantas criancas por idade',
      'quantos estudam de manha',
      'atendidos por grupo',
    ],
    sugestao: 'Atendidos por faixa etária',
  },
  {
    id: 'atend.movimento',
    tema: 'atendidos',
    titulo: 'Entradas e saídas',
    perfis: [C, AS],
    regras: [
      [['entrada', 'saida', 'desligamento', 'matricul*'], ['atendido', 'quantos', '#periodo', 'motivo*', 'por que', 'porque', 'ano', 'mes']],
      [['motivo*'], ['saida', 'desligamento']],
    ],
    reforcos: ['#2periodos', 'comparar'],
    bloqueios: ['pedido*', 'solicita*', 'aprovar', 'pendente', 'precadastro', 'faixa etaria'],
    exemplos: [
      'quantos atendidos entraram este ano',
      'quantos sairam em 2025',
      'por que os atendidos sairam',
      'motivos de desligamento',
      'compara entradas de 2025 com 2026',
      'quantos novos alunos esse ano',
    ],
    sugestao: 'Entradas e saídas deste ano',
  },
  {
    id: 'atend.aniversario',
    tema: 'atendidos',
    titulo: 'Aniversariantes do mês',
    perfis: TODOS,
    regras: [[['aniversario']], [['faz anos', 'fazem anos', 'fazendo anos', 'nasceu', 'nasceram', 'completa anos']]],
    reforcos: ['#periodo', '#grupo'],
    exemplos: ['aniversariantes do mes', 'quem faz aniversario em dezembro', 'quem faz anos essa semana', 'niver do mes'],
    sugestao: 'Aniversariantes do mês',
  },

  /* ============================ Perfil social ============================ */
  {
    id: 'social.programas',
    tema: 'social',
    titulo: 'Programas sociais',
    perfis: [C, AS],
    regras: [[['bolsa familia', 'bpc', 'programa social', 'programas sociais', 'programa de transferencia', 'beneficio*', 'auxilio*', 'cadunico', 'cad unico', 'nis', 'transferencia de renda', 'peti', 'aluguel social']]],
    exemplos: ['quantos recebem bolsa familia', 'quantos tem bpc', 'atendidos com beneficio social', 'quantos tem nis'],
    sugestao: 'Quantos recebem Bolsa Família ou BPC?',
  },
  {
    id: 'social.renda',
    tema: 'social',
    titulo: 'Renda das famílias',
    perfis: [C, AS],
    regras: [[['renda*', 'salario*', 'ganham', 'pobreza', 'vulnerab*', 'baixa renda']]],
    bloqueios: ['prestacao de conta*', 'relatorio social', 'perfil social'],
    exemplos: ['faixa de renda das familias', 'qual a renda das familias', 'quantas familias de baixa renda'],
    sugestao: 'Faixas de renda das famílias',
  },
  {
    id: 'social.saude',
    tema: 'social',
    titulo: 'PCD e necessidades específicas',
    perfis: [C, AS],
    regras: [[['pcd', 'deficien*', 'necessidade* especi*', 'especiais', 'problema de saude', 'problemas de saude', 'laudo*', 'autis*', 'tdah', 'doenca*', 'saude']]],
    exemplos: ['quantos pcd temos', 'atendidos com deficiencia', 'quantos tem necessidades especificas', 'quantas criancas com problema de saude'],
    sugestao: 'Quantos atendidos são PCD?',
  },
  {
    id: 'social.completo',
    tema: 'social',
    titulo: 'Relatório para prestação de contas',
    perfis: [C, AS],
    regras: [
      [['prestacao de conta*', 'perfil social', 'perfil socio*', 'socioeconomic*', 'relatorio social', 'relatorio anual', 'relatorio do ano', 'relatorio geral', 'relatorio completo', 'prefeitura', 'cmdca', 'conselho municipal', 'financiador*', 'doador*']],
    ],
    exemplos: [
      'relatorio para prestacao de contas',
      'preciso do perfil socioeconomico dos atendidos',
      'relatorio anual para a prefeitura',
      'relatorio para o cmdca',
    ],
    sugestao: 'Relatório para prestação de contas',
  },

  /* ============================ Grupos e oficinas ============================ */
  {
    id: 'grupo.vagas',
    tema: 'grupos',
    titulo: 'Vagas nos grupos',
    perfis: [C, AS],
    regras: [[['vaga']], [['tem lugar', 'cabe mais', 'espaco no grupo']]],
    reforcos: ['#grupo'],
    exemplos: ['quais grupos tem vaga', 'tem vaga no grupo girassol', 'ocupacao dos grupos', 'algum grupo esta lotado'],
    sugestao: 'Quais grupos têm vaga?',
  },
  {
    id: 'grupo.lista',
    tema: 'grupos',
    titulo: 'Grupos e oficinas',
    perfis: TODOS,
    regras: [[['grupo', 'oficina'], ['quais', 'lista*', 'existe*', 'todos', 'todas', 'nomes', 'temos', 'tem']]],
    bloqueios: ['vaga', 'frequencia', 'falta', 'disciplinar', 'atendido', 'quem da', 'quem e', 'comparar', 'ranking', 'qual grupo', 'semanario'],
    exemplos: ['quais grupos existem', 'lista de oficinas', 'quais sao os meus grupos', 'que oficinas temos'],
    sugestao: 'Quais são os grupos e oficinas?',
  },
  {
    id: 'oficina.responsavel',
    tema: 'grupos',
    titulo: 'Quem dá cada oficina',
    perfis: [C, AS, ES],
    regras: [[['oficina', '#oficina'], ['quem', 'professor*', 'oficineiro*', 'responsavel', 'ministra', 'instrutor*', 'educador*']]],
    bloqueios: ['frequencia', 'falta'],
    exemplos: ['quem da a oficina de teatro', 'quem e o oficineiro do futebol', 'professor da oficina de musica'],
    sugestao: 'Quem dá cada oficina?',
  },
  {
    id: 'semanario.pendentes',
    tema: 'grupos',
    titulo: 'Semanários não enviados',
    perfis: [C],
    regras: [[['semanario'], ['pendente', 'nao envi*', 'sem envi*', 'falta*', 'quais', 'quem', 'enviad*', 'entreg*', 'atras*']]],
    exemplos: ['quais semanarios estao pendentes', 'quem nao enviou o semanario', 'falta algum semanario', 'semanarios atrasados'],
    sugestao: 'Quais semanários não foram enviados?',
  },

  /* ============================ Disciplinar ============================ */
  {
    id: 'disc.resumo',
    tema: 'disciplinar',
    titulo: 'Ocorrências do mês',
    perfis: [C, AS, ES],
    regras: [
      [['disciplinar'], ['quantos', 'mes', 'resumo', '#periodo', 'grupo', 'comparar', 'ranking', 'teve', 'tiveram', 'houve', 'aconteceram', 'registrad*', 'total']],
    ],
    reforcos: ['#2periodos'],
    bloqueios: ['#nome', 'perto', 'quase', 'proxim*', 'um passo'],
    exemplos: [
      'quantas ocorrencias teve esse mes',
      'resumo disciplinar de outubro',
      'quantas advertencias por grupo',
      'ocorrencias deste mes comparado com o anterior',
      'quantas suspensoes tiveram em setembro',
    ],
    sugestao: 'Ocorrências deste mês por grupo',
  },
  {
    id: 'disc.um.passo',
    tema: 'disciplinar',
    titulo: 'Perto da próxima medida',
    perfis: [C, AS, ES],
    regras: [
      [['perto', 'proxim*', 'quase', 'risco', 'um passo', 'prestes', 'beira', 'a ponto', 'vai levar', 'vao levar', 'pode levar', 'podem levar'], ['disciplinar', 'suspensao', 'advertencia']],
    ],
    exemplos: ['quem esta perto da suspensao', 'quem esta quase levando advertencia', 'quem esta a um passo da suspensao', 'atendidos em risco de suspensao'],
    sugestao: 'Quem está perto da próxima medida?',
  },
  {
    id: 'disc.atendido',
    tema: 'disciplinar',
    titulo: 'Histórico disciplinar de um atendido',
    perfis: [C, AS, ES],
    regras: [[['disciplinar', 'historico disciplinar', 'ficha disciplinar'], ['#nome']]],
    exemplos: ['ocorrencias do pedro', 'historico disciplinar da julia', 'quantas advertencias tem o lucas'],
    sugestao: 'Histórico disciplinar de um atendido',
  },

  /* ============================ Pendências ============================ */
  {
    id: 'pend.resumo',
    tema: 'pendencias',
    titulo: 'Minhas pendências',
    perfis: TODOS,
    regras: [
      [['pendente']],
      [['o que tenho', 'o que eu tenho', 'tenho que fazer', 'preciso fazer', 'afazer*', 'tarefa*', 'aviso*', 'precisa de atencao', 'o que falta fazer', 'meu dia', 'resolver hoje', 'para hoje', 'resumo do dia']],
    ],
    exemplos: ['o que esta pendente', 'minhas pendencias', 'o que eu tenho pra fazer hoje', 'tem algum aviso pra mim', 'o que precisa de atencao'],
    sugestao: 'O que está pendente pra mim?',
  },
  {
    id: 'pend.precadastros',
    tema: 'pendencias',
    titulo: 'Pré-cadastros para avaliar',
    perfis: [C, AS],
    regras: [[['precadastro', 'pre cadastro', 'pre cadastros', 'lista de espera'], ['pendente', 'avaliar', 'quantos', 'novo*', 'chegou', 'chegaram', 'aguard*', 'fila', 'espera', 'tem', 'quais']]],
    exemplos: ['quantos pre cadastros para avaliar', 'tem pre cadastro novo', 'quantos estao na lista de espera', 'inscricoes pendentes'],
    sugestao: 'Pré-cadastros para avaliar',
  },
  {
    id: 'pend.desligamentos',
    tema: 'pendencias',
    titulo: 'Pedidos de desligamento',
    perfis: [C, AS],
    regras: [[['desligamento'], ['pedido*', 'pendente', 'solicita*', 'aprovar', 'aguard*', 'quais', 'tem']]],
    bloqueios: ['motivo*', 'quantos', '#periodo'],
    exemplos: ['pedidos de desligamento pendentes', 'tem desligamento para aprovar', 'solicitacoes de desligamento'],
    sugestao: 'Pedidos de desligamento aguardando',
  },

  /* ============================ Relatórios (menu) ============================ */
  {
    id: 'relatorio.menu',
    tema: 'relatorio',
    titulo: 'Relatórios em PDF',
    perfis: TODOS,
    regras: [[['relatorio']]],
    exemplos: ['quero um relatorio', 'gerar relatorio em pdf', 'que relatorios voce faz', 'preciso de um documento'],
    sugestao: 'Que relatórios você gera?',
  },
];

export const INTENCOES: Intencao[] = [...INTENCOES_DADOS, ...AJUDAS.map((a) => a.intencao)];

export function intencaoPorId(id: string): Intencao | undefined {
  return INTENCOES.find((i) => i.id === id);
}

/** Sugestões de boas-vindas por perfil (na ordem em que aparecem). */
export const BOAS_VINDAS: Record<Role, string[]> = {
  [Role.COORD]: ['pend.resumo', 'freq.comparar.grupos', 'freq.faltas.seguidas', 'social.completo'],
  [Role.ASSISTENTE]: ['pend.precadastros', 'social.programas', 'pend.desligamentos', 'disc.um.passo'],
  [Role.EDUCADOR]: ['freq.grupo', 'freq.faltas.seguidas', 'ajuda.chamada', 'disc.um.passo'],
  [Role.OFICINEIRO]: ['freq.grupo', 'atend.aniversario', 'ajuda.semanario', 'freq.dia.semana'],
};
